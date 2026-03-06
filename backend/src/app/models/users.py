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
    DOCTOR = "DOCTOR"
    PHARMACEUTICAL_COMPANY = "PHARMACEUTICAL_COMPANY"
    CLINICAL_RESEARCHER = "CLINICAL_RESEARCHER"
    PATIENT = "PATIENT"
    ADMIN = "ADMIN"
    AUDITOR = "AUDITOR"


class DoctorProfile(BaseModel):
    """Doctor-specific profile information"""
    medical_degree: str = Field(..., description="Medical degree (MD, DO, MBBS, etc.)")
    specialization: Optional[str] = Field(None, description="Medical specialization (e.g., Oncology, Cardiology)")
    license_number: Optional[str] = Field(None, description="Medical license number")
    hospital_name: str = Field(..., description="Primary hospital/clinic name")
    hospital_city: Optional[str] = Field(None, description="Hospital city")
    hospital_country: Optional[str] = Field(None, description="Hospital country")
    years_of_experience: Optional[int] = Field(None, ge=0, le=70, description="Years of medical practice")
    phone: Optional[str] = Field(None, description="Contact phone number")
    is_verified: bool = Field(default=False, description="Medical license verified by admin")


class PharmaceuticalCompanyProfile(BaseModel):
    """Pharmaceutical company-specific profile"""
    company_name: str = Field(..., description="Official company name")
    company_registration_number: Optional[str] = Field(None, description="Company registration/license number")
    department: str = Field(..., description="Department (R&D, Clinical Trials, Marketing, etc.)")
    country: str = Field(..., description="Company headquarters country")
    industry_focus: Optional[List[str]] = Field(None, description="Areas of focus (e.g., Oncology, Cardiology)")
    company_phone: Optional[str] = Field(None, description="Company phone number")
    website: Optional[str] = Field(None, description="Company website")
    is_verified: bool = Field(default=False, description="Company registration verified by admin")


class ClinicalResearcherProfile(BaseModel):
    """Clinical researcher-specific profile"""
    full_name: str = Field(..., description="Researcher full name")
    research_fields: List[str] = Field(..., description="Research specialization (e.g., ['Oncology', 'Immunotherapy'])")
    institution: Optional[str] = Field(None, description="Research institution/university name")
    institution_country: Optional[str] = Field(None, description="Institution country")
    publications_count: Optional[int] = Field(0, ge=0, description="Number of published papers")
    h_index: Optional[float] = Field(None, ge=0, description="H-index score")
    orcid: Optional[str] = Field(None, description="ORCID ID")
    is_verified: bool = Field(default=False, description="Academic credentials verified")


class PatientProfile(BaseModel):
    """Patient-specific profile information"""
    patient_name: str = Field(..., description="Patient full name")
    date_of_birth: Optional[str] = Field(None, description="Date of birth (YYYY-MM-DD)")
    patient_id: Optional[str] = Field(None, description="Medical record ID")
    primary_condition: Optional[str] = Field(None, description="Primary medical condition")
    additional_conditions: Optional[List[str]] = Field(None, description="Additional conditions")
    phone: Optional[str] = Field(None, description="Patient contact phone")


class User(BaseDocument):
    """
    Base User document in MongoDB
    Supports all user types: Doctor, PharmaceuticalCompany, ClinicalResearcher, Patient
    """
    email: EmailStr = Field(..., description="Email (unique, used for login)")
    password_hash: str = Field(..., description="Hashed password")
    role: UserRole = Field(..., description="User role")
    is_active: bool = Field(default=True, description="Account active status")

    # Role-specific profiles (only one will be populated based on role)
    doctor_profile: Optional[DoctorProfile] = Field(None, description="Doctor profile (if role=DOCTOR)")
    pharma_profile: Optional[PharmaceuticalCompanyProfile] = Field(None, description="Pharma company profile (if role=PHARMACEUTICAL_COMPANY)")
    researcher_profile: Optional[ClinicalResearcherProfile] = Field(None, description="Researcher profile (if role=CLINICAL_RESEARCHER)")
    patient_profile: Optional[PatientProfile] = Field(None, description="Patient profile (if role=PATIENT)")

    # Common fields
    is_email_verified: bool = Field(default=False, description="Email verification status")
    last_login: Optional[datetime] = Field(None, description="Last login timestamp")
    metadata: dict = Field(default_factory=dict, description="Additional metadata")

    model_config = ConfigDict(json_schema_extra={
        "example": {
            "email": "dr.john@hospital.com",
            "password_hash": "hashed_password",
            "role": "DOCTOR",
            "is_active": True,
            "doctor_profile": {
                "medical_degree": "MD",
                "specialization": "Oncology",
                "license_number": "LIC123456",
                "hospital_name": "City Hospital",
                "hospital_city": "San Francisco",
                "hospital_country": "United States",
                "years_of_experience": 15,
                "phone": "+1-555-0100",
                "is_verified": True
            },
            "is_email_verified": True,
            "created_at": "2024-11-20T10:30:00",
            "updated_at": "2024-11-20T10:30:00"
        }
    })


# ===== REGISTRATION MODELS =====

class DoctorRegister(BaseModel):
    """Doctor registration request"""
    email: EmailStr = Field(..., description="Email address")
    password: str = Field(..., min_length=8, description="Password (8+ chars)")
    full_name: str = Field(..., description="Doctor full name")
    medical_degree: str = Field(..., description="Medical degree (MD, DO, MBBS, etc.)")
    specialization: Optional[str] = Field(None, description="Medical specialization")
    license_number: Optional[str] = Field(None, description="Medical license number")
    hospital_name: str = Field(..., description="Primary hospital/clinic name")
    hospital_city: Optional[str] = Field(None, description="Hospital city")
    hospital_country: Optional[str] = Field(None, description="Hospital country")
    years_of_experience: Optional[int] = Field(None, ge=0, le=70, description="Years of practice")
    phone: Optional[str] = Field(None, description="Contact phone")


class PharmaceuticalCompanyRegister(BaseModel):
    """Pharmaceutical company registration request"""
    email: EmailStr = Field(..., description="Company email")
    password: str = Field(..., min_length=8, description="Password (8+ chars)")
    company_name: str = Field(..., description="Official company name")
    company_registration_number: Optional[str] = Field(None, description="Registration number")
    department: str = Field(..., description="Department (R&D, Clinical Trials, etc.)")
    country: str = Field(..., description="Company headquarters country")
    industry_focus: Optional[List[str]] = Field(None, description="Areas of focus")
    company_phone: Optional[str] = Field(None, description="Company phone")
    website: Optional[str] = Field(None, description="Website URL")


class ClinicalResearcherRegister(BaseModel):
    """Clinical researcher registration request"""
    email: EmailStr = Field(..., description="Email address")
    password: str = Field(..., min_length=8, description="Password (8+ chars)")
    full_name: str = Field(..., description="Researcher full name")
    research_fields: List[str] = Field(..., description="Research specialization")
    institution: Optional[str] = Field(None, description="Research institution")
    institution_country: Optional[str] = Field(None, description="Institution country")
    publications_count: Optional[int] = Field(0, ge=0, description="Published papers")
    h_index: Optional[float] = Field(None, ge=0, description="H-index")
    orcid: Optional[str] = Field(None, description="ORCID ID")


class PatientRegister(BaseModel):
    """Patient registration request"""
    email: EmailStr = Field(..., description="Email address")
    password: str = Field(..., min_length=8, description="Password (8+ chars)")
    patient_name: str = Field(..., description="Patient full name")
    date_of_birth: Optional[str] = Field(None, description="Date of birth")
    patient_id: Optional[str] = Field(None, description="Medical record ID")
    primary_condition: Optional[str] = Field(None, description="Primary condition")
    additional_conditions: Optional[List[str]] = Field(None, description="Additional conditions")
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
    doctor_profile: Optional[DoctorProfile] = None
    pharma_profile: Optional[PharmaceuticalCompanyProfile] = None
    researcher_profile: Optional[ClinicalResearcherProfile] = None
    patient_profile: Optional[PatientProfile] = None


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
    UserRole.DOCTOR: [
        "view_trials",
        "search_trials",
        "match_patients",
        "upload_patients",
        "view_matches",
        "export_data",
    ],
    UserRole.PHARMACEUTICAL_COMPANY: [
        "view_trials",
        "search_trials",
        "manage_trials",
        "view_analytics",
        "access_trial_data",
        "export_reports",
    ],
    UserRole.CLINICAL_RESEARCHER: [
        "view_trials",
        "search_trials",
        "access_data",
        "view_analytics",
        "export_data",
        "publish_research",
    ],
    UserRole.PATIENT: [
        "view_own_profile",
        "find_matching_trials",
        "view_matches",
        "upload_medical_records",
    ],
    UserRole.ADMIN: [
        "*"  # All permissions
    ],
    UserRole.AUDITOR: [
        "view_audit_logs",
        "view_compliance",
        "export_audit_data",
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
