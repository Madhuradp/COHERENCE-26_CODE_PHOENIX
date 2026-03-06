from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr
from datetime import datetime
from bson import ObjectId

from ..auth import (
    pwd_context,
    create_access_token,
    get_current_user,
    oauth2_scheme
)
from ..core.database import Database
from ..models.users import User, UserCreate, UserResponse, UserRole

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


# ============ RBAC Dependency Factories ============

def require_role(required_role: str):
    """Dependency to enforce specific role"""
    async def check_role(current_user: dict = Depends(get_current_user)):
        if current_user.get("role") != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{required_role}' required. You have '{current_user.get('role')}'"
            )
        return current_user
    return check_role


def require_any_role(*allowed_roles: str):
    """Dependency to enforce any of multiple roles"""
    async def check_any_role(current_user: dict = Depends(get_current_user)):
        if current_user.get("role") not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"One of roles {allowed_roles} required. You have '{current_user.get('role')}'"
            )
        return current_user
    return check_any_role


# ============ ROUTES ============

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


@router.post("/register", response_model=UserResponse)
async def register_user(user_data: UserCreate):
    """
    Register a new user.
    Only ADMIN can create users with roles other than CLINICIAN.
    """
    db = Database()

    # Check if user already exists
    existing_user = db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with this email already exists"
        )

    # Hash password
    hashed_password = pwd_context.hash(user_data.password)

    # Create user document
    user_doc = {
        "email": user_data.email,
        "password_hash": hashed_password,
        "full_name": user_data.full_name,
        "role": user_data.role,
        "organization": user_data.organization,
        "is_active": True,
        "created_at": datetime.utcnow()
    }

    result = db.users.insert_one(user_doc)
    user_doc["_id"] = str(result.inserted_id)

    return UserResponse(**user_doc)


@router.post("/login", response_model=LoginResponse)
async def login(credentials: LoginRequest):
    """
    Login with email and password.
    Returns JWT access token.
    """
    db = Database()

    # Find user by email
    user = db.users.find_one({"email": credentials.email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # Verify password
    if not pwd_context.verify(credentials.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # Check if active
    if not user.get("is_active", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    # Create JWT token
    access_token = create_access_token({"sub": user["email"], "role": user["role"]})

    user_response = UserResponse(
        email=user["email"],
        full_name=user["full_name"],
        role=user["role"],
        organization=user["organization"],
        is_active=user["is_active"],
        created_at=user.get("created_at", datetime.utcnow())
    )

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=user_response
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user: dict = Depends(get_current_user)):
    """
    Get current authenticated user profile.
    Available to all authenticated users.
    """
    return UserResponse(
        email=current_user["email"],
        full_name=current_user["full_name"],
        role=current_user["role"],
        organization=current_user["organization"],
        is_active=current_user["is_active"],
        created_at=current_user.get("created_at", datetime.utcnow())
    )


class ProfileUpdate(BaseModel):
    full_name: str = None
    organization: str = None


@router.put("/profile", response_model=UserResponse)
async def update_profile(
    profile_data: ProfileUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update user profile (name, organization).
    Users can only update their own profile.
    """
    db = Database()

    update_dict = {}
    if profile_data.full_name:
        update_dict["full_name"] = profile_data.full_name
    if profile_data.organization:
        update_dict["organization"] = profile_data.organization

    if not update_dict:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update"
        )

    result = db.users.update_one(
        {"email": current_user["email"]},
        {"$set": update_dict}
    )

    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile"
        )

    # Fetch updated user
    updated_user = db.users.find_one({"email": current_user["email"]})

    return UserResponse(
        email=updated_user["email"],
        full_name=updated_user["full_name"],
        role=updated_user["role"],
        organization=updated_user["organization"],
        is_active=updated_user["is_active"],
        created_at=updated_user.get("created_at", datetime.utcnow())
    )


# ============ ADMIN-ONLY ROUTES ============

@router.get("/users/list", response_model=dict)
async def list_users(
    _: dict = Depends(require_role(UserRole.ADMIN)),
    limit: int = 50,
    skip: int = 0
):
    """
    List all users (ADMIN only).
    """
    db = Database()

    users = list(db.users.find({}, {"password_hash": 0}).skip(skip).limit(limit))
    for u in users:
        u["_id"] = str(u["_id"])

    total = db.users.count_documents({})

    return {
        "success": True,
        "data": users,
        "total": total,
        "limit": limit,
        "skip": skip
    }


@router.get("/users/{user_id}", response_model=dict)
async def get_user_by_id(
    user_id: str,
    _: dict = Depends(require_role(UserRole.ADMIN))
):
    """
    Get user by ID (ADMIN only).
    """
    db = Database()

    try:
        user = db.users.find_one({"_id": ObjectId(user_id)}, {"password_hash": 0})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        user["_id"] = str(user["_id"])
        return {"success": True, "data": user}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error: {str(e)}"
        )


class UserUpdateAdmin(BaseModel):
    role: str = None
    is_active: bool = None


@router.put("/users/{user_id}", response_model=dict)
async def update_user_admin(
    user_id: str,
    update_data: UserUpdateAdmin,
    _: dict = Depends(require_role(UserRole.ADMIN))
):
    """
    Update user role and status (ADMIN only).
    """
    db = Database()

    try:
        update_dict = {}
        if update_data.role and update_data.role in [UserRole.CLINICIAN, UserRole.RESEARCHER, UserRole.ADMIN, UserRole.AUDITOR]:
            update_dict["role"] = update_data.role
        if update_data.is_active is not None:
            update_dict["is_active"] = update_data.is_active

        if not update_dict:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No valid fields to update"
            )

        result = db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_dict}
        )

        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        updated_user = db.users.find_one({"_id": ObjectId(user_id)}, {"password_hash": 0})
        updated_user["_id"] = str(updated_user["_id"])

        return {"success": True, "data": updated_user}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error: {str(e)}"
        )


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    _: dict = Depends(require_role(UserRole.ADMIN))
):
    """
    Delete user (ADMIN only).
    """
    db = Database()

    try:
        result = db.users.delete_one({"_id": ObjectId(user_id)})

        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        return {
            "success": True,
            "message": f"User {user_id} deleted successfully"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error: {str(e)}"
        )


# ============ CLINICIAN-SPECIFIC ROUTES ============

@router.get("/clinicians/list", response_model=dict)
async def list_clinicians(_: dict = Depends(require_any_role(UserRole.ADMIN, UserRole.AUDITOR))):
    """
    List all clinician users (ADMIN and AUDITOR only).
    """
    db = Database()

    clinicians = list(db.users.find({"role": UserRole.CLINICIAN}, {"password_hash": 0}))
    for c in clinicians:
        c["_id"] = str(c["_id"])

    return {
        "success": True,
        "data": clinicians,
        "count": len(clinicians)
    }


# ============ AUDIT ROUTES ============

@router.get("/audit/activity", response_model=dict)
async def get_user_activity(
    _: dict = Depends(require_role(UserRole.AUDITOR)),
    limit: int = 100
):
    """
    Get recent user activity (AUDITOR only).
    """
    db = Database()

    activity = list(db.audit.find({}).sort("_id", -1).limit(limit))
    for a in activity:
        a["_id"] = str(a["_id"])

    return {
        "success": True,
        "data": activity,
        "count": len(activity)
    }
