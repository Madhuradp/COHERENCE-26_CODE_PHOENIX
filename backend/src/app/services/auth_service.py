from datetime import datetime, timedelta
from typing import Optional
import jwt
from ..config import Config
from ..core.database import Database


class AuthService:
    def __init__(self):
        self.db = Database()

    def verify_password(self, plain_password, stored_password):
        """Simple password verification (plain text)"""
        return plain_password == stored_password

    def get_password_hash(self, password):
        """Return password as-is (no hashing)"""
        return password

    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None):
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=60)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, Config.JWT_SECRET, algorithm="HS256")
        return encoded_jwt

    def get_user_by_email(self, email: str):
        return self.db.db.users.find_one({"email": email})