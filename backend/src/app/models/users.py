
from pydantic import Field, EmailStr, BaseModel
from datetime import datetime
from enum import Enum
from .base import BaseDocument


class UserRole(str, Enum):
    """User roles"""
    CLINICIAN = "CLINICIAN"
    RESEARCHER = "RESEARCHER"
    ADMIN = "ADMIN"
    AUDITOR = "AUDITOR"


class User(BaseDocument):
    """User document"""
    email: EmailStr = Field(..., description="Email (used for login)")
    password_hash: str = Field(..., description="Bcrypt password hash (NEVER store plain text)")
    full_name: str = Field(..., description="Full name")
    role: str = Field(..., description="User role (CLINICIAN, RESEARCHER, ADMIN, AUDITOR)")
    organization: str = Field(..., description="Organization name")
    is_active: bool = Field(default=True, description="Is user active")

    class Config:
        json_schema_extra = {
            "example": {
                "email": "dr.stone@cityhospital.com",
                "password_hash": "$2b$12$LQv3c1yq...",
                "full_name": "Dr. Senku Stone",
                "role": "CLINICIAN",
                "organization": "City Hospital",
                "is_active": True
            }
        }

class UserCreate(BaseModel):
    """User creation request (plain password)"""
    email: EmailStr
    password: str = Field(..., min_length=8, description="Password (8+ chars)")
    full_name: str
    role: UserRole
    organization: str

class UserResponse(BaseModel):
    """User response (no password hash)"""
    email: str
    full_name: str
    role: UserRole
    organization: str
    is_active: bool
    created_at: datetime
