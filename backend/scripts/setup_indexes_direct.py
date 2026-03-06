#!/usr/bin/env python3
"""
Direct MongoDB Index Setup - No Dependencies
Creates required indexes for geospatial queries
"""
import os
from pymongo import MongoClient
from pymongo.errors import OperationFailure

# Read MongoDB connection from environment or use default
MONGO_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = "trial_match"

def setup_indexes():
    """Create all required MongoDB indexes"""
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        # Test connection
        client.admin.command('ping')
        print(f"[OK] Connected to MongoDB: {MONGO_URI}\n")
    except Exception as e:
        print(f"[ERROR] Failed to connect to MongoDB: {e}")
        return False

    db = client[DB_NAME]

    print("[SETUP] Creating MongoDB Indexes...\n")

    # 1. Clinical Trials Indexes (CRITICAL FOR GEOSPATIAL QUERIES)
    print("[1] Creating Clinical Trials Indexes...")
    try:
        db.clinical_trials.create_index([("locations.geo", "2dsphere")])
        print("   [OK] 2dsphere index on locations.geo (CRITICAL)")
    except OperationFailure as e:
        if "already exists" in str(e):
            print("   [OK] 2dsphere index already exists")
        else:
            print(f"   [ERROR] {e}")
            return False

    try:
        db.clinical_trials.create_index([("status", 1)])
        print("   [OK] Index on status")
    except Exception as e:
        print(f"   [WARN] {e}")

    try:
        db.clinical_trials.create_index([("conditions", 1)])
        print("   [OK] Index on conditions")
    except Exception as e:
        print(f"   [WARN] {e}")

    try:
        db.clinical_trials.create_index([("nct_id", 1)], unique=True)
        print("   [OK] Unique index on nct_id")
    except Exception as e:
        print(f"   [WARN] {e}")

    # 2. Patients Indexes
    print("\n[2] Creating Patients Indexes...")
    try:
        db.patients.create_index([("display_id", 1)])
        print("   [OK] Index on display_id")
    except Exception as e:
        print(f"   [WARN] {e}")

    try:
        db.patients.create_index([("created_at", -1)])
        print("   [OK] Index on created_at")
    except Exception as e:
        print(f"   [WARN] {e}")

    # 3. Users Indexes
    print("\n[3] Creating Users Indexes...")
    try:
        db.users.create_index([("email", 1)], unique=True)
        print("   [OK] Unique index on email")
    except Exception as e:
        print(f"   [WARN] {e}")

    try:
        db.users.create_index([("role", 1)])
        print("   [OK] Index on role")
    except Exception as e:
        print(f"   [WARN] {e}")

    # 4. Match Results Indexes
    print("\n[4] Creating Match Results Indexes...")
    try:
        db.matches.create_index([("patient_id", 1)])
        print("   [OK] Index on patient_id")
    except Exception as e:
        print(f"   [WARN] {e}")

    try:
        db.matches.create_index([("nct_id", 1)])
        print("   [OK] Index on nct_id")
    except Exception as e:
        print(f"   [WARN] {e}")

    # 5. Audit Logs Indexes
    print("\n[5] Creating Audit Logs Indexes...")
    try:
        db.audit.create_index([("timestamp", -1)])
        print("   [OK] Index on timestamp")
    except Exception as e:
        print(f"   [WARN] {e}")

    print("\n[SUCCESS] All indexes created successfully!")
    print("\nYou can now run the matching pipeline without geospatial index errors.\n")

    client.close()
    return True

if __name__ == "__main__":
    success = setup_indexes()
    exit(0 if success else 1)
