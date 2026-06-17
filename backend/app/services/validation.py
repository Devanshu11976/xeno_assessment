import re
import logging
import polars as pl
import pandera.polars as pa
from pathlib import Path
from app.services.storage import storage_service
from app.validators.rules import build_pandera_schema

logger = logging.getLogger("xeno.validation")

CHUNK_SIZE = 1000

EXPECTED_COLUMNS = [
    "order_id", "product_id", "quantity", "amount",
    "phone_number", "payment_mode", "transaction_date",
]

# Accept payment modes from common gateways — not hardcoded per country
VALID_PAYMENT_MODES = {
    "UPI", "CARD", "NETBANKING", "CASH", "NET BANKING",
    "CREDIT CARD", "DEBIT CARD", "WALLET", "PAYPAL",
}

COLUMN_ALIASES = {
    "customer_phone": "phone_number",
    "phone":          "phone_number",
    "contact":        "phone_number",
    "order_date":     "transaction_date",
    "date":           "transaction_date",
    "txn_date":       "transaction_date",
    "transaction_amount": "amount",
    "txn_amount":     "amount",
}

# Digit-length expectations per country code
PHONE_DIGIT_LENGTHS: dict[str, int | tuple] = {
    "IN": 10,
    "SG": 8,
    "US": 10,
    "GB": 10,
    "AU": 9,
    "DE": (10, 11),
}


def _is_valid_phone(phone_val: str, cc: str, phone_regex: str) -> bool:
    digits = re.sub(r"\D", "", phone_val)
    rule = PHONE_DIGIT_LENGTHS.get(cc)
    if isinstance(rule, int):
        return len(digits) == rule
    if isinstance(rule, tuple):
        return len(digits) in rule
    # Fall back to DB regex for countries not in the length map
    return bool(re.match(phone_regex, phone_val))


def _is_valid_date(date_val: str) -> bool:
    from datetime import datetime
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y", "%d.%m.%Y"):
        try:
            datetime.strptime(date_val, fmt)
            return True
        except ValueError:
            continue
    return False


class ValidationService:
    async def process_dataset(self, job_id: str, file_path: str, country_code: str) -> dict:
        # ── 1. Fetch country rules from DB ────────────────────────────────
        from app.config.db import session_scope
        from app.repositories.rules import CountryRulesRepository

        country_rules_map: dict = {}
        fallback_rule = None

        try:
            async with session_scope() as session:
                rules_repo = CountryRulesRepository(session)
                all_rules = await rules_repo.get_all()
                for r in all_rules:
                    if r.is_active:
                        country_rules_map[r.country_code.upper()] = r
                        country_rules_map[r.country_name.upper()] = r
                # If country_code is AUTO, we have no fallback — every row uses its own column
                if country_code.upper() != "AUTO":
                    fallback_rule = country_rules_map.get(country_code.upper())
        except Exception as e:
            logger.error(f"Failed to fetch country rules: {e}")

        # ── 2. Read file (lazy scan for CSV, eager for XLSX) ──────────────
        file_ext = Path(file_path).suffix.lower()
        try:
            if file_ext == ".csv":
                # Use scan_csv for lazy evaluation — only collect() when needed
                lf = pl.scan_csv(file_path, infer_schema_length=0)
                df = lf.collect()
            elif file_ext in (".xlsx", ".xls"):
                # fastexcel does not support lazy scan; read fully but streaming-friendly
                df = pl.read_excel(file_path, infer_schema_length=0)
            else:
                raise ValueError(f"Unsupported file extension: {file_ext}")
        except Exception as e:
            logger.error(f"Failed to read file {file_path}: {e}")
            raise

        # Normalise column names
        df = df.rename({c: c.strip().lower().replace(" ", "_") for c in df.columns})
        rename_map = {c: COLUMN_ALIASES[c] for c in df.columns if c in COLUMN_ALIASES}
        if rename_map:
            df = df.rename(rename_map)

        total_records = len(df)
        logger.info(f"Job {job_id}: {total_records} records from {file_path}")

        # ── 3. Pandera structural validation (fast, vectorised) ───────────
        # Use the fallback rule's regex if available; otherwise a permissive default
        pandera_phone_regex = (
            fallback_rule.phone_regex if fallback_rule else r"^\+?\d{7,15}$"
        )
        pandera_date_format = (
            fallback_rule.date_format if fallback_rule else "DD/MM/YYYY"
        )

        pandera_errors: dict[int, list[str]] = {}  # row_idx → [error messages]

        # Only run Pandera on rows that have all required columns present
        pandera_cols = {"order_id", "product_id", "quantity", "amount",
                        "phone_number", "payment_mode", "transaction_date"}
        available_cols = pandera_cols.intersection(set(df.columns))

        if len(available_cols) == len(pandera_cols):
            schema = build_pandera_schema(pandera_phone_regex, pandera_date_format)
            try:
                schema.validate(df, lazy=True)
            except pa.errors.SchemaErrors as exc:
                for _, row in exc.failure_cases.to_pandas().iterrows():
                    ridx = int(row.get("index", -1))
                    if ridx < 0:
                        continue
                    col = str(row.get("column", ""))
                    check = str(row.get("check", ""))
                    pandera_errors.setdefault(ridx, []).append(f"{col}: {check}")
        else:
            logger.warning(
                f"Job {job_id}: skipping Pandera — missing columns "
                f"{pandera_cols - available_cols}"
            )

        # ── 4. Row-level business-rule validation ─────────────────────────
        error_logs: list[dict] = []
        valid_mask = [True] * total_records

        breakdown: dict = {
            "invalid_phone": 0,
            "invalid_date": 0,
            "invalid_payment_mode": 0,
            "duplicate_order_id": 0,
            "negative_quantity": 0,
            "negative_amount": 0,
            "missing_fields": 0,
            "pandera_schema": 0,
        }
        country_stats: dict[str, dict[str, int]] = {}

        for row_idx in range(total_records):
            row = df.row(row_idx, named=True)
            row_errors: list[dict] = []

            # Resolve per-row country
            raw_country = str(row.get("country") or "").strip().upper()
            row_rule = country_rules_map.get(raw_country) or fallback_rule

            display_country = (
                row_rule.country_code.upper() if row_rule
                else (raw_country[:2] if raw_country else (country_code.upper() if country_code.upper() != "AUTO" else "XX"))
            )

            country_stats.setdefault(display_country, {"total": 0, "valid": 0, "invalid": 0})
            country_stats[display_country]["total"] += 1

            phone_regex = row_rule.phone_regex if row_rule else r"^\+?\d{7,15}$"
            cc = row_rule.country_code.upper() if row_rule else display_country

            # Surface Pandera failures for this row
            for pe in pandera_errors.get(row_idx, []):
                row_errors.append({
                    "row_number": row_idx + 1,
                    "column_name": pe.split(":")[0] if ":" in pe else "schema",
                    "error_message": f"Schema check failed: {pe}",
                    "error_type": "pandera_schema",
                })
                breakdown["pandera_schema"] += 1

            # Missing fields
            for col in EXPECTED_COLUMNS:
                if col in row:
                    val = row[col]
                    if val is None or (isinstance(val, str) and val.strip() == ""):
                        row_errors.append({
                            "row_number": row_idx + 1,
                            "column_name": col,
                            "error_message": f"Missing required field: {col}",
                            "error_type": "missing_fields",
                        })
                        breakdown["missing_fields"] += 1

            # Phone
            if row.get("phone_number"):
                phone_val = str(row["phone_number"]).strip()
                if not _is_valid_phone(phone_val, cc, phone_regex):
                    row_errors.append({
                        "row_number": row_idx + 1,
                        "column_name": "phone_number",
                        "error_message": f"Phone '{phone_val}' invalid for {cc}",
                        "error_type": "invalid_phone",
                    })
                    breakdown["invalid_phone"] += 1

            # Date
            if row.get("transaction_date"):
                date_val = str(row["transaction_date"]).strip()
                if not _is_valid_date(date_val):
                    row_errors.append({
                        "row_number": row_idx + 1,
                        "column_name": "transaction_date",
                        "error_message": f"Date '{date_val}' is not a recognised format",
                        "error_type": "invalid_date",
                    })
                    breakdown["invalid_date"] += 1

            # Quantity
            if row.get("quantity") is not None:
                try:
                    if float(str(row["quantity"])) < 0:
                        row_errors.append({
                            "row_number": row_idx + 1, "column_name": "quantity",
                            "error_message": f"Negative quantity: {row['quantity']}",
                            "error_type": "negative_quantity",
                        })
                        breakdown["negative_quantity"] += 1
                except (ValueError, TypeError):
                    row_errors.append({
                        "row_number": row_idx + 1, "column_name": "quantity",
                        "error_message": f"Non-numeric quantity: {row['quantity']}",
                        "error_type": "negative_quantity",
                    })
                    breakdown["negative_quantity"] += 1

            # Amount
            if row.get("amount") is not None:
                try:
                    if float(str(row["amount"])) < 0:
                        row_errors.append({
                            "row_number": row_idx + 1, "column_name": "amount",
                            "error_message": f"Negative amount: {row['amount']}",
                            "error_type": "negative_amount",
                        })
                        breakdown["negative_amount"] += 1
                except (ValueError, TypeError):
                    row_errors.append({
                        "row_number": row_idx + 1, "column_name": "amount",
                        "error_message": f"Non-numeric amount: {row['amount']}",
                        "error_type": "negative_amount",
                    })
                    breakdown["negative_amount"] += 1

            # Payment mode
            if row.get("payment_mode"):
                pm = str(row["payment_mode"]).strip().upper()
                if pm not in VALID_PAYMENT_MODES:
                    row_errors.append({
                        "row_number": row_idx + 1, "column_name": "payment_mode",
                        "error_message": f"Invalid payment mode: '{pm}'",
                        "error_type": "invalid_payment_mode",
                    })
                    breakdown["invalid_payment_mode"] += 1

            if row_errors:
                valid_mask[row_idx] = False
                error_logs.extend(row_errors)
                country_stats[display_country]["invalid"] += 1
            else:
                country_stats[display_country]["valid"] += 1

        # Duplicate order_ids (vectorised via Polars)
        if "order_id" in df.columns:
            order_ids = df["order_id"].to_list()
            seen: dict[str, int] = {}
            for i, oid in enumerate(order_ids):
                if oid and str(oid).strip():
                    key = str(oid).strip()
                    if key in seen:
                        error_logs.append({
                            "row_number": i + 1,
                            "column_name": "order_id",
                            "error_message": f"Duplicate order_id '{key}' (first at row {seen[key]})",
                            "error_type": "duplicate_order_id",
                        })
                        if valid_mask[i]:
                            valid_mask[i] = False
                            breakdown["duplicate_order_id"] += 1
                            row = df.row(i, named=True)
                            raw_c = str(row.get("country") or "").strip().upper()
                            r = country_rules_map.get(raw_c) or fallback_rule
                            dc = r.country_code.upper() if r else display_country
                            if dc in country_stats and country_stats[dc]["valid"] > 0:
                                country_stats[dc]["valid"] -= 1
                                country_stats[dc]["invalid"] += 1
                    else:
                        seen[key] = i + 1

        # ── 5. Split valid / invalid ──────────────────────────────────────
        valid_indices   = [i for i, v in enumerate(valid_mask) if v]
        invalid_indices = [i for i, v in enumerate(valid_mask) if not v]
        valid_df   = df[valid_indices]   if valid_indices   else df.clear()
        invalid_df = df[invalid_indices] if invalid_indices else df.clear()
        valid_count   = len(valid_df)
        invalid_count = len(invalid_df)

        logger.info(f"Job {job_id}: {valid_count} valid, {invalid_count} invalid / {total_records}")

        # ── 6. Write output files ─────────────────────────────────────────
        clean_path = storage_service.get_clean_output_path(job_id)
        error_path = storage_service.get_error_report_path(job_id)

        valid_df.write_csv(str(clean_path))

        if invalid_indices:
            row_error_map: dict[int, str] = {}
            for err in error_logs:
                ri = err["row_number"] - 1
                msg = f"{err['column_name']}: {err['error_message']}"
                row_error_map[ri] = (row_error_map.get(ri, "") + "; " + msg).lstrip("; ")
            reasons = [row_error_map.get(i, "Unknown error") for i in invalid_indices]
            invalid_df.with_columns(pl.Series("validation_errors", reasons)).write_csv(str(error_path))
        else:
            invalid_df.write_csv(str(error_path))

        # Validation breakdown JSON
        breakdown["country_stats"] = country_stats
        try:
            import json
            bp = storage_service.get_validation_breakdown_path(job_id)
            with open(bp, "w") as fh:
                json.dump(breakdown, fh, indent=2)
        except Exception as e:
            logger.error(f"Job {job_id}: Failed to write breakdown: {e}")

        # Chunks — use Polars lazy slicing
        chunk_paths: list[str] = []
        chunk_record_counts: list[int] = []
        if valid_count > 0:
            for idx, start in enumerate(range(0, valid_count, CHUNK_SIZE)):
                chunk_df = valid_df.slice(start, CHUNK_SIZE)
                chunk_path = storage_service.get_chunk_output_path(job_id, idx + 1)
                chunk_df.write_csv(str(chunk_path))
                chunk_paths.append(str(chunk_path))
                chunk_record_counts.append(len(chunk_df))

        # Save validation logs to DB (capped at 500)
        try:
            from app.config.db import session_scope as _ss
            from app.models.logs import ValidationLogs
            from app.repositories.jobs import JobsRepository
            async with _ss() as session:
                repo = JobsRepository(session)
                logs = [
                    ValidationLogs(
                        job_id=job_id,
                        row_number=e["row_number"],
                        column_name=e.get("column_name"),
                        error_message=e["error_message"],
                        error_type=e["error_type"],
                    )
                    for e in error_logs[:500]
                ]
                if logs:
                    await repo.bulk_log_validation_errors(logs)
        except Exception as e:
            logger.error(f"Failed to save validation logs: {e}")

        return {
            "job_id": job_id,
            "status": "completed",
            "total_records": total_records,
            "valid_records": valid_count,
            "invalid_records": invalid_count,
            "clean_file_path": str(clean_path),
            "error_report_path": str(error_path),
            "chunk_paths": chunk_paths,
            "chunk_record_counts": chunk_record_counts,
            "error_logs": error_logs[:100],
            "validation_breakdown": breakdown,
            "country_stats": country_stats,
        }


validation_service = ValidationService()
