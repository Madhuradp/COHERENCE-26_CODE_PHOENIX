"""
Authentication Utilities - JWT token handling and user dependency
Supports role-based access control (RBAC) for all user types
"""

import jwt
import logging
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from .config import Config
from .core.database import Database

logger = logging.getLogger(__name__)

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def verify_password(plain_password: str, stored_password: str) -> bool:
    """
    Verify password (plain text comparison)
    In production, use bcrypt or argon2
    """
    return plain_password == stored_password


def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    """
    Create JWT access token with expiration
    Includes email and role for RBAC
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=60)  # 1 hour default

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, Config.JWT_SECRET, algorithm="HS256")
    return encoded_jwt


async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """
    Dependency to get current authenticated user from JWT token
    Validates token and returns user document from database
    """
    try:
        payload = jwt.decode(token, Config.JWT_SECRET, algorithms=["HS256"])
        email: str = payload.get("sub")
        role: str = payload.get("role")

        if email is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing email"
            )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired"
        )
    except jwt.PyJWTError as e:
        logger.warning(f"JWT decode error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )

    db = Database()
    user = db.users.find_one({"email": email})

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )

    # Verify user is active
    if not user.get("is_active", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    return user


def require_role(*allowed_roles):
    """
    Dependency factory to enforce specific user roles
    Usage: require_role(UserRole.DOCTOR, UserRole.ADMIN)
    """
    async def check_role(current_user: dict = Depends(get_current_user)):
        user_role = current_user.get("role")
        if user_role not in [role.value if hasattr(role, 'value') else role for role in allowed_roles]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required roles: {allowed_roles}"
            )
        return current_user

    return check_role


def require_permission(required_permission: str):
    """
    Dependency factory to enforce specific permissions
    Usage: require_permission("view_trials")
    """
    async def check_permission(current_user: dict = Depends(get_current_user)):
        from .models.users import has_permission, UserRole

        user_role = UserRole(current_user.get("role"))
        if not has_permission(user_role, required_permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {required_permission}"
            )
        return current_user

    return check_permission