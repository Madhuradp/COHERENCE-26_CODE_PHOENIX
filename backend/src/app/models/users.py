"""
User Models - Comprehensive schema for all user types with RBAC
Supports: Doctor, Pharmaceutical Company, Clinical Researcher, Patient
"""

from pydantic import BaseModel, EmailStr, Field, ConfigDict
from datetime import datetime
from enum import Enum
from typing import Optional, List
from .base import BaseDocument, utc_now


class UserRole(str, Enum):
    """User roles with specific permissions"""
    RESEARCHER = "RESEARCHER"
    AUDITOR = "AUDITOR"


class ResearcherProfile(BaseModel):
    """Researcher-specific profile information"""
    full_name: str = Field(..., description="Researcher full name")
    research_fields: List[str] = Field(..., description="Research specialization (e.g., ['Oncology', 'Immunotherapy'])")
    institution: Optional[str] = Field(None, description="Research institution/university name")
    institution_country: Optional[str] = Field(None, description="Institution country")
    publications_count: Optional[int] = Field(0, ge=0, description="Number of published papers")
    h_index: Optional[float] = Field(None, ge=0, description="H-index score")
    orcid: Optional[str] = Field(None, description="ORCID ID")
    is_verified: bool = Field(default=False, description="Academic credentials verified")


class AuditorProfile(BaseModel):
    """Auditor-specific profile information"""
    full_name: str = Field(..., description="Auditor full name")
    organization: str = Field(..., description="Audit organization/institution name")
    audit_focus: List[str] = Field(default_factory=list, description="Areas of audit focus (e.g., ['PII Protection', 'Compliance'])")
    certification: Optional[str] = Field(None, description="Audit certification (e.g., ISO 27001, SOC 2)")
    phone: Optional[str] = Field(None, description="Contact phone number")
    is_verified: bool = Field(default=False, description="Credentials verified by admin")


class User(BaseDocument):
    """
    Base User document in MongoDB
    Supports two user types: Researcher and Auditor
    """
    email: EmailStr = Field(..., description="Email (unique, used for login)")
    password_hash: str = Field(..., description="Hashed password")
    role: UserRole = Field(..., description="User role (RESEARCHER or AUDITOR)")
    is_active: bool = Field(default=True, description="Account active status")

    # Role-specific profiles (only one will be populated based on role)
    researcher_profile: Optional[ResearcherProfile] = Field(None, description="Researcher profile (if role=RESEARCHER)")
    auditor_profile: Optional[AuditorProfile] = Field(None, description="Auditor profile (if role=AUDITOR)")

    # Common fields
    is_email_verified: bool = Field(default=False, description="Email verification status")
    last_login: Optional[datetime] = Field(None, description="Last login timestamp")
    metadata: dict = Field(default_factory=dict, description="Additional metadata")

    model_config = ConfigDict(json_schema_extra={
        "example": {
            "email": "researcher@university.edu",
            "password_hash": "hashed_password",
            "role": "RESEARCHER",
            "is_active": True,
            "researcher_profile": {
                "full_name": "Dr. Jane Smith",
                "research_fields": ["Oncology", "Immunotherapy"],
                "institution": "Stanford University",
                "institution_country": "United States",
                "publications_count": 25,
                "h_index": 8.5,
                "orcid": "0000-0001-2345-6789",
                "is_verified": True
            },
            "is_email_verified": True,
            "created_at": "2024-11-20T10:30:00",
            "updated_at": "2024-11-20T10:30:00"
        }
    })


# ===== REGISTRATION MODELS =====

class ResearcherRegister(BaseModel):
    """Researcher registration request"""
    email: EmailStr = Field(..., description="Email address")
    password: str = Field(..., min_length=8, description="Password (8+ chars)")
    full_name: str = Field(..., description="Researcher full name")
    research_fields: List[str] = Field(..., description="Research specialization (e.g., ['Oncology', 'Cardiology'])")
    institution: Optional[str] = Field(None, description="Research institution/university name")
    institution_country: Optional[str] = Field(None, description="Institution country")
    publications_count: Optional[int] = Field(0, ge=0, description="Number of published papers")
    h_index: Optional[float] = Field(None, ge=0, description="H-index score")
    orcid: Optional[str] = Field(None, description="ORCID ID")


class AuditorRegister(BaseModel):
    """Auditor registration request"""
    email: EmailStr = Field(..., description="Email address")
    password: str = Field(..., min_length=8, description="Password (8+ chars)")
    full_name: str = Field(..., description="Auditor full name")
    organization: str = Field(..., description="Audit organization/institution name")
    audit_focus: List[str] = Field(default_factory=list, description="Areas of audit focus (e.g., ['PII Protection', 'Compliance'])")
    certification: Optional[str] = Field(None, description="Audit certification (e.g., ISO 27001, SOC 2)")
    phone: Optional[str] = Field(None, description="Contact phone")


class UserCreate(BaseModel):
    """Generic user creation (for compatibility)"""
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str
    role: UserRole


class UserResponse(BaseModel):
    """User response (no password hash)"""
    email: str
    role: UserRole
    is_active: bool
    is_email_verified: bool
    created_at: datetime
    last_login: Optional[datetime] = None

    # Role-specific responses
    researcher_profile: Optional[ResearcherProfile] = None
    auditor_profile: Optional[AuditorProfile] = None


class LoginRequest(BaseModel):
    """Login request"""
    email: EmailStr = Field(..., description="Email address")
    password: str = Field(..., description="Password")


class LoginResponse(BaseModel):
    """Login response with token"""
    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field(default="bearer", description="Token type")
    user: UserResponse = Field(..., description="User information")


class PasswordChangeRequest(BaseModel):
    """Password change request"""
    old_password: str = Field(..., description="Current password")
    new_password: str = Field(..., min_length=8, description="New password")
    confirm_password: str = Field(..., description="Confirm new password")


class ProfileUpdateRequest(BaseModel):
    """Profile update request"""
    full_name: Optional[str] = Field(None, description="Updated name")
    phone: Optional[str] = Field(None, description="Updated phone")
    # Role-specific updates
    specialization: Optional[str] = Field(None, description="(Doctor) Updated specialization")
    hospital_name: Optional[str] = Field(None, description="(Doctor) Updated hospital")
    department: Optional[str] = Field(None, description="(Pharma) Updated department")
    research_fields: Optional[List[str]] = Field(None, description="(Researcher) Updated fields")


# ===== ROLE-BASED PERMISSIONS =====

ROLE_PERMISSIONS = {
    UserRole.RESEARCHER: [
        "view_trials",
        "search_trials",
        "upload_patients",
        "run_matching",
        "view_matches",
        "view_eligibility",
        "view_mapping",
        "export_results",
        "run_tests",
        "view_analytics",
    ],
    UserRole.AUDITOR: [
        "view_audit_logs",
        "view_compliance",
        "view_pii_logs",
        "export_audit_data",
        "view_test_results",
        "view_analytics",
    ],
}


def get_user_permissions(role: UserRole) -> List[str]:
    """Get permissions for a user role"""
    return ROLE_PERMISSIONS.get(role, [])


def has_permission(role: UserRole, permission: str) -> bool:
    """Check if user has specific permission"""
    permissions = get_user_permissions(role)
    return "*" in permissions or permission in permissions
