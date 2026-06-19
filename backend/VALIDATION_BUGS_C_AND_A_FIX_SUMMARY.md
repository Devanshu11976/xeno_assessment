# Validation Pipeline Bugs C and A Fix Summary

## Bug C: Global Payment Mode Schema Regex Too Narrow

### Root Cause
The global schema-level payment_mode validation regex was hardcoded to only allow India-style modes: `(?i)^(UPI|CARD|NETBANKING|CASH)$`. This blocked USA/Singapore/Germany transactions before per-country logic could even evaluate them, since legitimate country-specific modes (WIRE, ACH, PAYPAL for USA; PAYNOW, NETS, GRABPAY for Singapore; SEPA, GIROPAY, PAYPAL for Germany) were not in this hardcoded list.

### Evidence
Error report showed overwhelming majority of USA/Singapore/Germany failures were schema-level:
```
payment_mode: Schema check failed: payment_mode: str_matches('(?i)^(UPI|CARD|NETBANKING|CASH)$')
```

This explained the country split:
- India (IN): 92% pass - India's valid modes happen to be subset of hardcoded regex
- USA/SG/DE: 20-40% pass - their legitimate modes not in hardcoded list

### Location
**File:** `backend/app/validators/rules.py`
**Line:** 37

### Fix Applied
**Before:**
```python
"payment_mode": pa.Column(
    str,
    checks=pa.Check.str_matches(r"(?i)^(UPI|CARD|NETBANKING|CASH)$"),
    coerce=True,
    nullable=False,
),
```

**After:**
```python
"payment_mode": pa.Column(
    str,
    checks=pa.Check.str_matches(r"^[A-Za-z_]+$"),
    coerce=True,
    nullable=False,
),
```

**Impact:** Removed restrictive regex that only allowed India-style modes, replaced with looser check that accepts any alphabetic string with underscores. The per-country "configured modes" check is now the sole source of truth for which payment modes are valid per country.

### Verification
Re-run validation on the 100-row test file (95 intentionally valid, evenly split across IN/US/SG/DE with country-appropriate payment modes). All four countries should land at approximately the same ~92-96% pass rate after this fix.

## Bug A: Phone Number Scientific Notation in Output Report

### Root Cause
Despite dtype casting on READ and WRITE, phone numbers still appeared as scientific notation (2.08E+09, 9.28E+09, 3.85E+09, etc.) when CSV files were opened in Excel. CSV files don't preserve type information - Excel auto-detects types when opening CSV files and interprets phone numbers as numeric, displaying them in scientific notation.

### Location
**File:** `backend/app/services/validation.py`
**Lines:** 366-378 (clean file), 380-411 (error file)

### Fix Applied
**Clean File (lines 366-378):**
```python
logger.info(f"Job {job_id}: Writing clean file to {clean_path}")
# Cast phone_number to string and add leading apostrophe to prevent scientific notation in Excel
clean_df = valid_df
if "phone_number" in clean_df.columns:
    clean_df = clean_df.with_columns(
        (pl.lit("'") + pl.col("phone_number").cast(pl.Utf8)).alias("phone_number")
    )
if "customer_phone" in clean_df.columns:
    clean_df = clean_df.with_columns(
        (pl.lit("'") + pl.col("customer_phone").cast(pl.Utf8)).alias("customer_phone")
    )
clean_df.write_csv(str(clean_path))
logger.info(f"Job {job_id}: Clean file written successfully")
```

**Error File (lines 380-411):**
```python
logger.info(f"Job {job_id}: Writing error file to {error_path}")
if invalid_indices:
    row_error_map: dict[int, str] = {}
    for err in error_logs:
        ri = err["row_number"] - 1
        msg = f"{err['column_name']}: {err['error_message']}"
        row_error_map[ri] = (row_error_map.get(ri, "") + "; " + msg).lstrip("; ")
    reasons = [row_error_map.get(i, "Unknown error") for i in invalid_indices]
    # Cast phone_number to string and add leading apostrophe to prevent scientific notation in Excel
    error_df = invalid_df.with_columns(pl.Series("validation_errors", reasons))
    if "phone_number" in error_df.columns:
        error_df = error_df.with_columns(
            (pl.lit("'") + pl.col("phone_number").cast(pl.Utf8)).alias("phone_number")
        )
    if "customer_phone" in error_df.columns:
        error_df = error_df.with_columns(
            (pl.lit("'") + pl.col("customer_phone").cast(pl.Utf8)).alias("customer_phone")
        )
    error_df.write_csv(str(error_path))
else:
    # Cast phone_number to string and add leading apostrophe to prevent scientific notation in Excel
    error_df = invalid_df
    if "phone_number" in error_df.columns:
        error_df = error_df.with_columns(
            (pl.lit("'") + pl.col("phone_number").cast(pl.Utf8)).alias("phone_number")
        )
    if "customer_phone" in error_df.columns:
        error_df = error_df.with_columns(
            (pl.lit("'") + pl.col("customer_phone").cast(pl.Utf8)).alias("customer_phone")
        )
    error_df.write_csv(str(error_path))
logger.info(f"Job {job_id}: Error file written successfully")
```

**Impact:** Added leading apostrophe to phone numbers before writing to CSV files. Excel treats cells starting with apostrophe as text, preventing auto-detection as numeric and display in scientific notation.

### Verification
Open the regenerated error_report.csv in Excel and confirm phone_number column shows full original digit strings (e.g., '4621182960'), not scientific notation, for every row.

## Expected Results After Fix

**Before Fix:**
- India (IN): 92% pass rate
- USA/SG/DE: 20-40% pass rate (blocked by schema-level payment_mode regex)
- Phone numbers in scientific notation in output files

**After Fix:**
- All countries (IN/US/SG/DE): ~92-96% pass rate (consistent across countries)
- Phone numbers displayed as full digit strings with leading apostrophe in output files

## Files Modified

1. `backend/app/validators/rules.py`
   - Line 37: Changed payment_mode regex from `(?i)^(UPI|CARD|NETBANKING|CASH)$` to `^[A-Za-z_]+$`

2. `backend/app/services/validation.py`
   - Lines 366-378: Added leading apostrophe to phone numbers in clean file output
   - Lines 380-411: Added leading apostrophe to phone numbers in error file output

## Deployment Steps

1. Deploy updated code to Render and Railway

2. Test with the 100-row test file to verify:
   - All four countries (IN/US/SG/DE) show consistent ~92-96% pass rate
   - Phone numbers display as full digit strings (with leading apostrophe) in output files
   - No scientific notation in Excel

## Phone Regex Status

The phone regex fix from the previous task (updating SG to `^\d{8}$` and IN to `^\d{10}$`) should be re-tested AFTER Bug C is fixed, since Bug C was masking the true per-country phone validation results. With Bug C fixed, the actual phone validation results for US/SG/DE can now be properly evaluated.

## CRYPTO Payment Mode Status

CRYPTO is now accepted by the schema-level regex (since it matches `^[A-Za-z_]+$`). The per-country business rules should determine whether CRYPTO is valid for specific countries.
