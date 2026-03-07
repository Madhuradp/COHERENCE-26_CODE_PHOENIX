"""
Authentication Routes - Support for RESEARCHER and AUDITOR roles with RBAC
Endpoints for researcher and auditor registration and management
"""

import logging
from fastapi import APIRouter, HTTPException, Depends, status
from datetime import datetime, timedelta
from typing import Optional
from bson import ObjectId

from ..services.auth_service import AuthService
from ..models.users import (
    UserRole, User, UserResponse, LoginRequest, LoginResponse,
    ResearcherRegister, AuditorRegister,
    ResearcherProfile, AuditorProfile,
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


# ===== RESEARCHER REGISTRATION =====

@router.post("/register/researcher", status_code=201, response_model=dict)
async def register_researcher(body: ResearcherRegister):
    """
    Register as a Researcher.
    Required fields: email, password, full_name, research_fields
    """
    db = Database()

    if db.users.find_one({"email": body.email}):
        raise HTTPException(status_code=409, detail="Email already registered")

    # Create researcher profile
    researcher_profile = ResearcherProfile(
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
        "role": UserRole.RESEARCHER.value,
        "is_active": True,
        "is_email_verified": False,
        "researcher_profile": researcher_profile.model_dump(),
        "last_login": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "metadata": {}
    }

    result = db.users.insert_one(user_doc)
    logger.info(f"Researcher registered: {body.email}")

    return {
        "success": True,
        "message": "Researcher account created successfully",
        "user_id": str(result.inserted_id),
        "email": body.email,
        "role": UserRole.RESEARCHER.value
    }


# ===== AUDITOR REGISTRATION =====

@router.post("/register/auditor", status_code=201, response_model=dict)
async def register_auditor(body: AuditorRegister):
    """
    Register as an Auditor.
    Required fields: email, password, full_name, organization
    """
    db = Database()

    if db.users.find_one({"email": body.email}):
        raise HTTPException(status_code=409, detail="Email already registered")

    # Create auditor profile
    auditor_profile = AuditorProfile(
        full_name=body.full_name,
        organization=body.organization,
        audit_focus=body.audit_focus,
        certification=body.certification,
        phone=body.phone,
    )

    user_doc = {
        "email": body.email,
        "password_hash": auth_service.get_password_hash(body.password),
        "role": UserRole.AUDITOR.value,
        "is_active": True,
        "is_email_verified": False,
        "auditor_profile": auditor_profile.model_dump(),
        "last_login": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "metadata": {}
    }

    result = db.users.insert_one(user_doc)
    logger.info(f"Auditor registered: {body.email}")

    return {
        "success": True,
        "message": "Auditor account created successfully",
        "user_id": str(result.inserted_id),
        "email": body.email,
        "role": UserRole.AUDITOR.value
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
    if current_user.get("role") == UserRole.RESEARCHER.value:
        if body.research_fields:
            update_dict["researcher_profile.research_fields"] = body.research_fields
        if body.phone:
            update_dict["researcher_profile.phone"] = body.phone

    elif current_user.get("role") == UserRole.AUDITOR.value:
        if body.phone:
            update_dict["auditor_profile.phone"] = body.phone

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
        role=UserRole(user.get("role", UserRole.RESEARCHER.value)),
        is_active=user.get("is_active", True),
        is_email_verified=user.get("is_email_verified", False),
        created_at=user.get("created_at", datetime.utcnow()),
        last_login=user.get("last_login"),
        researcher_profile=ResearcherProfile(**user.get("researcher_profile", {})) if user.get("researcher_profile") else None,
        auditor_profile=AuditorProfile(**user.get("auditor_profile", {})) if user.get("auditor_profile") else None,
    )


@router.get("/users/list")
async def list_users(current_user: dict = Depends(get_current_user)):
    """List all active researchers and auditors"""
    db = Database()
    users = list(db.db.users.find(
        {"role": {"$in": [UserRole.RESEARCHER.value, UserRole.AUDITOR.value]}},
        {"password_hash": 0}
    ))
    result = []
    for u in users:
        created = u.get("created_at", datetime.utcnow())
        # Extract name from role-specific profile
        full_name = ""
        if u.get("researcher_profile"):
            full_name = u["researcher_profile"].get("full_name", "")
        elif u.get("auditor_profile"):
            full_name = u["auditor_profile"].get("full_name", "")

        result.append({
            "email": u["email"],
            "full_name": full_name,
            "role": u.get("role", ""),
            "is_active": u.get("is_active", True),
            "created_at": created.isoformat() if isinstance(created, datetime) else str(created),
        })
    return {"data": result}
