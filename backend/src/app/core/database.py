from pymongo import MongoClient
from ..config import Config
from ..services.pii_redaction import PIIRedactionService

class Database:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(Database, cls).__new__(cls)
            # Connection
            cls._instance.client = MongoClient(Config.MONGODB_URL)
            cls._instance.db = cls._instance.client[Config.DATABASE_NAME]
            
            # Collections
            cls._instance.trials = cls._instance.db["clinical_trials"]
            cls._instance.patients = cls._instance.db["patients"]
            cls._instance.matches = cls._instance.db["match_results"]
            cls._instance.users = cls._instance.db["users"]
            cls._instance.audit = cls._instance.db["audit_logs"]
            
            # Services attached to DB logic
            cls._instance.pii = PIIRedactionService()
            
            print(f"[OK] Database Initialized: {Config.DATABASE_NAME}")
        return cls._instance

# Global helper to get the database instance
def get_db():
    return Database()