"""
MongoDB Index Setup Script
Creates required indexes for the trial matching system
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from app.core.database import Database
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def setup_indexes():
    """Create all required MongoDB indexes"""
    db = Database()

    print("\n[SETUP] Setting up MongoDB Indexes...\n")

    # 1. Clinical Trials Indexes
    print("[1] Creating Clinical Trials Indexes...")
    try:
        # Geospatial index (REQUIRED for geo-near queries)
        db.trials.create_index([("locations.geo", "2dsphere")])
        print("   [OK] 2dsphere index on locations.geo")
    except Exception as e:
        print(f"   [WARN] locations.geo index: {e}")

    try:
        db.trials.create_index([("status", 1)])
        print("   [OK] Index on status")
    except Exception as e:
        print(f"   [WARN] status index: {e}")

    try:
        db.trials.create_index([("conditions", 1)])
        print("   [OK] Index on conditions")
    except Exception as e:
        print(f"   [WARN] conditions index: {e}")

    try:
        db.trials.create_index([("nct_id", 1)], unique=True)
        print("   [OK] Unique index on nct_id")
    except Exception as e:
        print(f"   [WARN] nct_id index: {e}")

    # 2. Patients Indexes
    print("\n[2] Creating Patients Indexes...")
    try:
        db.patients.create_index([("display_id", 1)])
        print("   [OK] Index on display_id")
    except Exception as e:
        print(f"   [WARN] display_id index: {e}")

    try:
        db.patients.create_index([("created_at", -1)])
        print("   [OK] Index on created_at")
    except Exception as e:
        print(f"   [WARN] created_at index: {e}")

    # 3. Users Indexes
    print("\n[3] Creating Users Indexes...")
    try:
        db.users.create_index([("email", 1)], unique=True)
        print("   [OK] Unique index on email")
    except Exception as e:
        print(f"   [WARN] email index: {e}")

    try:
        db.users.create_index([("role", 1)])
        print("   [OK] Index on role")
    except Exception as e:
        print(f"   [WARN] role index: {e}")

    # 4. Match Results Indexes
    print("\n[4] Creating Match Results Indexes...")
    try:
        db.matches.create_index([("patient_id", 1)])
        print("   [OK] Index on patient_id")
    except Exception as e:
        print(f"   [WARN] patient_id index: {e}")

    try:
        db.matches.create_index([("nct_id", 1)])
        print("   [OK] Index on nct_id")
    except Exception as e:
        print(f"   [WARN] nct_id index: {e}")

    # 5. Audit Logs Indexes
    print("\n[5] Creating Audit Logs Indexes...")
    try:
        db.audit.create_index([("timestamp", -1)])
        print("   [OK] Index on timestamp")
    except Exception as e:
        print(f"   [WARN] timestamp index: {e}")

    print("\n[SUCCESS] Index setup complete!\n")

if __name__ == "__main__":
    setup_indexes()
