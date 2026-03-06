from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime, timezone
from typing import Optional, Any
from enum import Enum

def utc_now():
    """Get current UTC time as timezone-aware datetime"""
    return datetime.now(timezone.utc)


class BaseDocument(BaseModel):
    """Base class for all MongoDB documents"""

    model_config = ConfigDict(
        json_encoders={
            datetime: lambda v: v.isoformat() if v else None
        },
        populate_by_name=True,
        from_attributes=True
    )

    # Standard metadata fields
    created_at: datetime = Field(default_factory=utc_now, description="Document creation timestamp")
    updated_at: datetime = Field(default_factory=utc_now, description="Last update timestamp")

    def dict(self, **kwargs) -> dict:
        """Convert model to dictionary"""
        return super().model_dump(**kwargs)

    def json(self, **kwargs) -> str:
        """Convert model to JSON string"""
        return super().model_dump_json(**kwargs)

    def update_timestamp(self):
        """Update the updated_at timestamp"""
        self.updated_at = utc_now()
        return self


class TimestampMixin:
    """Mixin to add timestamp functionality"""
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class GeoPoint(BaseModel):
    """GeoJSON Point for coordinate storage"""
    type: str = Field(default="Point", description="GeoJSON type")
    coordinates: list[float] = Field(..., description="[longitude, latitude]")

    def __init__(self, longitude: float = None, latitude: float = None, **data):
        if longitude is not None and latitude is not None:
            data['coordinates'] = [longitude, latitude]
        super().__init__(**data)


class Address(BaseModel):
    """Standard address format"""
    street: Optional[str] = Field(None, description="Street address")
    city: str = Field(..., description="City")
    state: Optional[str] = Field(None, description="State/Province")
    country: str = Field(..., description="Country")
    postal_code: Optional[str] = Field(None, description="Postal code")
    geo: Optional[GeoPoint] = Field(None, description="Geographic coordinates")


class StatusEnum(str, Enum):
    """Common status values"""
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    PENDING = "PENDING"
    ARCHIVED = "ARCHIVED"
    DELETED = "DELETED"


class ResponseModel(BaseModel):
    """Standard API response wrapper"""
    success: bool = Field(..., description="Operation success status")
    data: Any = Field(None, description="Response data")
    error: Optional[str] = Field(None, description="Error message if any")
    message: Optional[str] = Field(None, description="Status message")
    timestamp: datetime = Field(default_factory=utc_now, description="Response timestamp")


class PaginatedResponse(BaseModel):
    """Paginated API response"""
    success: bool = True
    total: int = Field(..., description="Total number of items")
    count: int = Field(..., description="Number of items in this response")
    page: int = Field(..., ge=1, description="Current page number")
    per_page: int = Field(..., ge=1, description="Items per page")
    total_pages: int = Field(..., description="Total number of pages")
    data: list[Any] = Field(default=[], description="Items in current page")
    message: Optional[str] = None


class MatchStatus(str, Enum):
    """Trial matching status values"""
    ELIGIBLE = "ELIGIBLE"
    INELIGIBLE = "INELIGIBLE"
    REVIEW_NEEDED = "REVIEW_NEEDED"


class EventType(str, Enum):
    """Audit event types"""
    MATCH_GENERATED = "MATCH_GENERATED"
    PII_REDACTED = "PII_REDACTED"
    BIAS_CHECK = "BIAS_CHECK"
    DATA_ACCESSED = "DATA_ACCESSED"
    USER_LOGIN = "USER_LOGIN"
    USER_LOGOUT = "USER_LOGOUT"
    DATA_CREATED = "DATA_CREATED"
    DATA_UPDATED = "DATA_UPDATED"
    DATA_DELETED = "DATA_DELETED"


class TrialPhase(str, Enum):
    """Clinical trial phases"""
    PHASE_0 = "Phase 0"
    PHASE_1 = "Phase 1"
    PHASE_2 = "Phase 2"
    PHASE_3 = "Phase 3"
    PHASE_4 = "Phase 4"


class RecruitmentStatus(str, Enum):
    """Trial recruitment status"""
    RECRUITING = "RECRUITING"
    ACTIVE_NOT_RECRUITING = "ACTIVE_NOT_RECRUITING"
    ENROLLING_BY_INVITATION = "ENROLLING_BY_INVITATION"
    NOT_YET_RECRUITING = "NOT_YET_RECRUITING"
    COMPLETED = "COMPLETED"
    SUSPENDED = "SUSPENDED"
    TERMINATED = "TERMINATED"
    WITHDRAWN = "WITHDRAWN"


class Gender(str, Enum):
    """Gender values"""
    MALE = "MALE"
    FEMALE = "FEMALE"
    ALL = "ALL"
    OTHER = "OTHER"


class MedicationStatus(str, Enum):
    """Medication status"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    DISCONTINUED = "discontinued"
    UNKNOWN = "unknown"
