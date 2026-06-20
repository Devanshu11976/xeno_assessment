import uuid
from typing import Optional
import msgspec

class RuleCreate(msgspec.Struct):
    """Payload schema to register validation patterns."""
    country_code: str
    country_name: str
    phone_regex: str
    date_format: str
    valid_payment_modes: Optional[list] = None
    is_active: bool = True
    valid_currencies: Optional[list] = None
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None
    min_quantity: Optional[int] = 1
    max_quantity: Optional[int] = None
    allow_future_dates: bool = False
    required_fields: Optional[list] = None
    email_domain_whitelist: Optional[list] = None

class RuleUpdate(msgspec.Struct):
    """Payload schema to adjust validation patterns."""
    country_name: Optional[str] = None
    phone_regex: Optional[str] = None
    date_format: Optional[str] = None
    valid_payment_modes: Optional[list] = None
    is_active: Optional[bool] = None
    valid_currencies: Optional[list] = None
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None
    min_quantity: Optional[int] = None
    max_quantity: Optional[int] = None
    allow_future_dates: Optional[bool] = None
    required_fields: Optional[list] = None
    email_domain_whitelist: Optional[list] = None

class RuleResponse(msgspec.Struct):
    """Schema returned by rules endpoint query."""
    id: uuid.UUID
    country_code: str
    country_name: str
    phone_regex: str
    date_format: str
    valid_payment_modes: Optional[list]
    is_active: bool
    valid_currencies: Optional[list]
    min_amount: Optional[float]
    max_amount: Optional[float]
    min_quantity: Optional[int]
    max_quantity: Optional[int]
    allow_future_dates: bool
    required_fields: Optional[list]
    email_domain_whitelist: Optional[list]

