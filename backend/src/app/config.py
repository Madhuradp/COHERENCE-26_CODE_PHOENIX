"""
Configuration management for the application
"""

import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class Config:
    """Application configuration"""

    # MongoDB settings
    MONGODB_URL = os.getenv("MONGODB_URL")
    DATABASE_NAME = os.getenv("DATABASE_NAME", "trial_match")

    # Server settings
    PORT = int(os.getenv("PORT", 5000))

    # JWT settings
    JWT_SECRET = os.getenv("JWT_SECRET", "your_jwt_secret_key")

    # API settings
    DEBUG = os.getenv("DEBUG", "False").lower() == "true"

    @classmethod
    def validate(cls):
        """Validate required configuration"""
        if not cls.MONGODB_URL:
            raise ValueError("MONGODB_URL environment variable is not set")
        return True


# Validate config on import
try:
    Config.validate()
except ValueError as e:
    print(f"Configuration Error: {e}")
