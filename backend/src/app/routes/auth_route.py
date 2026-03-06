from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional
from ..services.auth_service import AuthService
from ..models.users import UserCreate, UserResponse, UserRole
from ..auth import get_current_user
from ..core.database import Database

router = APIRouter(prefix="/api/auth", tags=["auth"])

auth_service = AuthService()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


@router.post("/login")
async def login(body: LoginRequest):
    user = auth_service.get_user_by_email(body.email)
    if not user or not auth_service.verify_password(body.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = auth_service.create_access_token({"sub": user["email"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "email": user["email"],
            "full_name": user.get("full_name", ""),
            "role": user.get("role", ""),
            "is_active": user.get("is_active", True),
            "created_at": user.get("created_at", datetime.utcnow()).isoformat()
            if isinstance(user.get("created_at"), datetime)
            else str(user.get("created_at", "")),
            "organization": user.get("organization"),
        },
    }


@router.post("/register", status_code=201)
async def register(body: UserCreate):
    db = Database()
    existing = db.db.users.find_one({"email": body.email})
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    user_doc = {
        "email": body.email,
        "password_hash": auth_service.get_password_hash(body.password),
        "full_name": body.full_name,
        "role": body.role.value,
        "is_active": True,
        "created_at": datetime.utcnow(),
        "organization": None,
    }
    db.db.users.insert_one(user_doc)
    return {"message": "User registered successfully", "email": body.email}


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "email": current_user["email"],
        "full_name": current_user.get("full_name", ""),
        "role": current_user.get("role", ""),
        "is_active": current_user.get("is_active", True),
        "created_at": current_user.get("created_at", datetime.utcnow()).isoformat()
        if isinstance(current_user.get("created_at"), datetime)
        else str(current_user.get("created_at", "")),
        "organization": current_user.get("organization"),
    }


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
