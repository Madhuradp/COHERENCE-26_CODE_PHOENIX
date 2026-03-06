
from pydantic import Field, EmailStr, BaseModel
from datetime import datetime
from enum import Enum
from typing import Optional
from .base import BaseDocument


class UserRole(str, Enum):
    """User roles"""
    AUDITOR = "AUDITOR"
    PATIENT = "PATIENT"
    DOCTOR = "DOCTOR"
    RESEARCHER = "RESEARCHER"
    PHARMACIST = "PHARMACIST"


class User(BaseDocument):
    """User document"""
    email: EmailStr = Field(..., description="Email (used for login)")
    password_hash: str = Field(..., description="Password (plain text)")
    full_name: str = Field(..., description="Full name")
    role: str = Field(..., description="User role (CLINICIAN, RESEARCHER, ADMIN, AUDITOR)")
    organization: Optional[str] = Field(None, description="Organization name (optional)")
    is_active: bool = Field(default=True, description="Is user active")

    class Config:
        json_schema_extra = {
            "example": {
                "email": "dr.stone@cityhospital.com",
                "password_hash": "$2b$12$LQv3c1yq...",
                "full_name": "Dr. Senku Stone",
                "role": "CLINICIAN",
                "is_active": True
            }
        }

class UserCreate(BaseModel):
    """User creation request (plain password)"""
    email: EmailStr
    password: str = Field(..., min_length=8, description="Password (8+ chars)")
    full_name: str
    role: UserRole


class UserResponse(BaseModel):
    """User response (no password hash)"""
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    created_at: datetime
