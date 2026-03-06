"""
Authentication Routes - Support for all user types with RBAC
Endpoints for Doctor, Pharmaceutical Company, Clinical Researcher, Patient
"""

import logging
from fastapi import APIRouter, HTTPException, Depends, status
from datetime import datetime, timedelta
from typing import Optional
from bson import ObjectId

from ..services.auth_service import AuthService
from ..models.users import (
    UserRole, User, UserResponse, LoginRequest, LoginResponse,
    DoctorRegister, PharmaceuticalCompanyRegister, ClinicalResearcherRegister, PatientRegister,
    DoctorProfile, PharmaceuticalCompanyProfile, ClinicalResearcherProfile, PatientProfile,
    PasswordChangeRequest, ProfileUpdateRequest, has_permission
)
from ..auth import get_current_user
from ..core.database import Database

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth", tags=["Authentication"])
auth_service = AuthService()


# ===== LOGIN & LOGOUT =====

@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest):
    """
    Login with email and password.
    Returns JWT access token valid for registered users.
    """
    db = Database()
    user = db.users.find_one({"email": body.email})

    if not user or not auth_service.verify_password(body.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.get("is_active", False):
        raise HTTPException(status_code=403, detail="Account is inactive")

    # Update last login
    db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login": datetime.utcnow()}}
    )

    token = auth_service.create_access_token({
        "sub": user["email"],
        "role": user.get("role")
    })

    # Build response with role-specific profile
    user_response = _build_user_response(user)

    return LoginResponse(
        access_token=token,
        token_type="bearer",
        user=user_response
    )


@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """Logout current user (token invalidation on client side)"""
    return {
        "success": True,
        "message": "Logged out successfully. Please discard the token on client."
    }


# ===== DOCTOR REGISTRATION & MANAGEMENT =====

@router.post("/register/doctor", status_code=201, response_model=dict)
async def register_doctor(body: DoctorRegister):
    """
    Register as a Doctor.
    Required fields: email, password, full_name, medical_degree, hospital_name
    """
    db = Database()

    # Check if email exists
    if db.users.find_one({"email": body.email}):
        raise HTTPException(status_code=409, detail="Email already registered")

    # Create doctor profile
    doctor_profile = DoctorProfile(
        medical_degree=body.medical_degree,
        specialization=body.specialization,
        license_number=body.license_number,
        hospital_name=body.hospital_name,
        hospital_city=body.hospital_city,
        hospital_country=body.hospital_country,
        years_of_experience=body.years_of_experience,
        phone=body.phone,
    )

    user_doc = {
        "email": body.email,
        "password_hash": auth_service.get_password_hash(body.password),
        "role": UserRole.DOCTOR.value,
        "is_active": True,
        "is_email_verified": False,
        "doctor_profile": doctor_profile.model_dump(),
        "last_login": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "metadata": {}
    }

    result = db.users.insert_one(user_doc)
    logger.info(f"Doctor registered: {body.email}")

    return {
        "success": True,
        "message": "Doctor account created successfully",
        "user_id": str(result.inserted_id),
        "email": body.email,
        "role": UserRole.DOCTOR.value
    }


# ===== PHARMACEUTICAL COMPANY REGISTRATION & MANAGEMENT =====

@router.post("/register/pharmaceutical-company", status_code=201, response_model=dict)
async def register_pharma(body: PharmaceuticalCompanyRegister):
    """
    Register as a Pharmaceutical Company.
    Required fields: email, password, company_name, department, country
    """
    db = Database()

    if db.users.find_one({"email": body.email}):
        raise HTTPException(status_code=409, detail="Email already registered")

    # Create pharma profile
    pharma_profile = PharmaceuticalCompanyProfile(
        company_name=body.company_name,
        company_registration_number=body.company_registration_number,
        department=body.department,
        country=body.country,
        industry_focus=body.industry_focus,
        company_phone=body.company_phone,
        website=body.website,
    )

    user_doc = {
        "email": body.email,
        "password_hash": auth_service.get_password_hash(body.password),
        "role": UserRole.PHARMACEUTICAL_COMPANY.value,
        "is_active": True,
        "is_email_verified": False,
        "pharma_profile": pharma_profile.model_dump(),
        "last_login": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "metadata": {}
    }

    result = db.users.insert_one(user_doc)
    logger.info(f"Pharmaceutical company registered: {body.email}")

    return {
        "success": True,
        "message": "Pharmaceutical company account created successfully",
        "user_id": str(result.inserted_id),
        "email": body.email,
        "role": UserRole.PHARMACEUTICAL_COMPANY.value
    }


# ===== CLINICAL RESEARCHER REGISTRATION & MANAGEMENT =====

@router.post("/register/researcher", status_code=201, response_model=dict)
async def register_researcher(body: ClinicalResearcherRegister):
    """
    Register as a Clinical Researcher.
    Required fields: email, password, full_name, research_fields
    """
    db = Database()

    if db.users.find_one({"email": body.email}):
        raise HTTPException(status_code=409, detail="Email already registered")

    # Create researcher profile
    researcher_profile = ClinicalResearcherProfile(
        full_name=body.full_name,
        research_fields=body.research_fields,
        institution=body.institution,
        institution_country=body.institution_country,
        publications_count=body.publications_count or 0,
        h_index=body.h_index,
        orcid=body.orcid,
    )

    user_doc = {
        "email": body.email,
        "password_hash": auth_service.get_password_hash(body.password),
        "role": UserRole.CLINICAL_RESEARCHER.value,
        "is_active": True,
        "is_email_verified": False,
        "researcher_profile": researcher_profile.model_dump(),
        "last_login": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "metadata": {}
    }

    result = db.users.insert_one(user_doc)
    logger.info(f"Clinical researcher registered: {body.email}")

    return {
        "success": True,
        "message": "Clinical researcher account created successfully",
        "user_id": str(result.inserted_id),
        "email": body.email,
        "role": UserRole.CLINICAL_RESEARCHER.value
    }


# ===== PATIENT REGISTRATION & MANAGEMENT =====

@router.post("/register/patient", status_code=201, response_model=dict)
async def register_patient(body: PatientRegister):
    """
    Register as a Patient.
    Required fields: email, password, patient_name
    """
    db = Database()

    if db.users.find_one({"email": body.email}):
        raise HTTPException(status_code=409, detail="Email already registered")

    # Create patient profile
    patient_profile = PatientProfile(
        patient_name=body.patient_name,
        date_of_birth=body.date_of_birth,
        patient_id=body.patient_id,
        primary_condition=body.primary_condition,
        additional_conditions=body.additional_conditions,
        phone=body.phone,
    )

    user_doc = {
        "email": body.email,
        "password_hash": auth_service.get_password_hash(body.password),
        "role": UserRole.PATIENT.value,
        "is_active": True,
        "is_email_verified": False,
        "patient_profile": patient_profile.model_dump(),
        "last_login": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "metadata": {}
    }

    result = db.users.insert_one(user_doc)
    logger.info(f"Patient registered: {body.email}")

    return {
        "success": True,
        "message": "Patient account created successfully",
        "user_id": str(result.inserted_id),
        "email": body.email,
        "role": UserRole.PATIENT.value
    }


# ===== USER PROFILE & MANAGEMENT =====

@router.get("/me", response_model=LoginResponse)
async def get_current_user_profile(current_user: dict = Depends(get_current_user)):
    """Get current authenticated user's profile"""
    user_response = _build_user_response(current_user)
    return LoginResponse(
        access_token="",  # Empty for profile endpoint
        token_type="bearer",
        user=user_response
    )


@router.put("/profile/update")
async def update_profile(
    body: ProfileUpdateRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update user profile (role-specific fields)"""
    db = Database()

    update_dict = {}

    # Role-specific updates
    if current_user.get("role") == UserRole.DOCTOR.value:
        if body.specialization:
            update_dict["doctor_profile.specialization"] = body.specialization
        if body.hospital_name:
            update_dict["doctor_profile.hospital_name"] = body.hospital_name
        if body.phone:
            update_dict["doctor_profile.phone"] = body.phone

    elif current_user.get("role") == UserRole.PHARMACEUTICAL_COMPANY.value:
        if body.department:
            update_dict["pharma_profile.department"] = body.department
        if body.phone:
            update_dict["pharma_profile.company_phone"] = body.phone

    elif current_user.get("role") == UserRole.CLINICAL_RESEARCHER.value:
        if body.research_fields:
            update_dict["researcher_profile.research_fields"] = body.research_fields
        if body.phone:
            update_dict["researcher_profile.phone"] = body.phone

    elif current_user.get("role") == UserRole.PATIENT.value:
        if body.full_name:
            update_dict["patient_profile.patient_name"] = body.full_name
        if body.phone:
            update_dict["patient_profile.phone"] = body.phone

    # Common fields
    if body.full_name and current_user.get("role") != UserRole.PATIENT.value:
        # Doctors, researchers store in profile, not here
        pass

    update_dict["updated_at"] = datetime.utcnow()

    result = db.users.update_one(
        {"email": current_user["email"]},
        {"$set": update_dict}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="No changes made or update failed")

    updated_user = db.users.find_one({"email": current_user["email"]})
    user_response = _build_user_response(updated_user)

    return {
        "success": True,
        "message": "Profile updated successfully",
        "user": user_response
    }


@router.post("/change-password")
async def change_password(
    body: PasswordChangeRequest,
    current_user: dict = Depends(get_current_user)
):
    """Change user password"""
    db = Database()

    # Verify old password
    if not auth_service.verify_password(body.old_password, current_user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Incorrect current password")

    # Validate new passwords match
    if body.new_password != body.confirm_password:
        raise HTTPException(status_code=400, detail="New passwords do not match")

    # Validate password strength
    if len(body.new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters")

    # Update password
    new_hash = auth_service.get_password_hash(body.new_password)
    db.users.update_one(
        {"email": current_user["email"]},
        {"$set": {"password_hash": new_hash, "updated_at": datetime.utcnow()}}
    )

    logger.info(f"Password changed for user: {current_user['email']}")

    return {
        "success": True,
        "message": "Password changed successfully"
    }


# ===== RBAC VERIFICATION =====

@router.get("/verify-permission/{permission}")
async def verify_permission(
    permission: str,
    current_user: dict = Depends(get_current_user)
):
    """Verify if current user has specific permission"""
    role = UserRole(current_user.get("role"))
    has_perm = has_permission(role, permission)

    return {
        "success": True,
        "permission": permission,
        "has_permission": has_perm,
        "role": current_user.get("role")
    }


@router.get("/roles/{role}/permissions")
async def get_role_permissions(role: str):
    """Get all permissions for a role"""
    try:
        user_role = UserRole(role)
        from ..models.users import ROLE_PERMISSIONS
        permissions = ROLE_PERMISSIONS.get(user_role, [])
        return {
            "success": True,
            "role": role,
            "permissions": permissions
        }
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid role: {role}")


# ===== HELPER FUNCTIONS =====

def _build_user_response(user: dict) -> UserResponse:
    """Build UserResponse from database document"""
    return UserResponse(
        email=user.get("email"),
        role=UserRole(user.get("role", UserRole.PATIENT.value)),
        is_active=user.get("is_active", True),
        is_email_verified=user.get("is_email_verified", False),
        created_at=user.get("created_at", datetime.utcnow()),
        last_login=user.get("last_login"),
        doctor_profile=DoctorProfile(**user.get("doctor_profile", {})) if user.get("doctor_profile") else None,
        pharma_profile=PharmaceuticalCompanyProfile(**user.get("pharma_profile", {})) if user.get("pharma_profile") else None,
        researcher_profile=ClinicalResearcherProfile(**user.get("researcher_profile", {})) if user.get("researcher_profile") else None,
        patient_profile=PatientProfile(**user.get("patient_profile", {})) if user.get("patient_profile") else None,
    )


@router.get("/users/list")
async def list_users(current_user: dict = Depends(get_current_user)):
    db = Database()
    users = list(db.db.users.find(
        {"role": {"$in": ["DOCTOR", "RESEARCHER", "PHARMACIST", "AUDITOR"]}},
        {"password_hash": 0}
    ))
    result = []
    for u in users:
        created = u.get("created_at", datetime.utcnow())
        result.append({
            "email": u["email"],
            "full_name": u.get("full_name", ""),
            "role": u.get("role", ""),
            "is_active": u.get("is_active", True),
            "created_at": created.isoformat() if isinstance(created, datetime) else str(created),
            "organization": u.get("organization"),
        })
    return {"data": result}
