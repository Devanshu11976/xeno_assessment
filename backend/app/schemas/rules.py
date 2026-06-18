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

class RuleUpdate(msgspec.Struct):
    """Payload schema to adjust validation patterns."""
    country_name: Optional[str] = None
    phone_regex: Optional[str] = None
    date_format: Optional[str] = None
    valid_payment_modes: Optional[list] = None
    is_active: Optional[bool] = None

class RuleResponse(msgspec.Struct):
    """Schema returned by rules endpoint query."""
    id: uuid.UUID
    country_code: str
    country_name: str
    phone_regex: str
    date_format: str
    valid_payment_modes: Optional[list]
    is_active: bool
