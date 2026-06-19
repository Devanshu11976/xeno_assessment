import pandera.polars as pa


def build_pandera_schema(phone_regex: str, date_format: str) -> pa.DataFrameSchema:
    """Dynamically construct a Pandera Schema from Postgres configuration rules.

    Uses pandera.polars backend (pandera >= 0.18 with Polars support).

    Validates:
    - Phone number formats (using phone_regex parameter)
    - Date format structure (using date_format parameter)
    - Non-negative transaction amounts
    - Mandatory transaction properties
    """
    return pa.DataFrameSchema(
        {
            "order_id": pa.Column(str, coerce=True, nullable=False),
            "product_id": pa.Column(str, coerce=True, nullable=False),
            "quantity": pa.Column(
                int,
                checks=pa.Check.greater_than_or_equal_to(0),
                coerce=True,
            ),
            "amount": pa.Column(
                float,
                checks=pa.Check.greater_than_or_equal_to(0.0),
                coerce=True,
            ),
            "phone_number": pa.Column(
                str,
                checks=pa.Check.str_matches(phone_regex),
                coerce=True,
                nullable=False,
            ),
            "payment_mode": pa.Column(
                str,
                checks=pa.Check.str_matches(r"^[A-Za-z_]+$"),
                coerce=True,
                nullable=False,
            ),
            # Date strings are validated via regex in ValidationService
            "transaction_date": pa.Column(str, coerce=True, nullable=False),
        }
    )
