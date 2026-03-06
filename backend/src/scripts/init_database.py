"""
Initialize MongoDB database with collections and indexes
"""

import sys
from pathlib import Path
from pymongo import MongoClient, GEOSPHERE

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config import Config


def create_collections_and_indexes():
    """Create collections and indexes"""
    print("Initializing MongoDB database...")

    try:
        client = MongoClient(Config.MONGODB_URL, serverSelectionTimeoutMS=10000)
        db = client[Config.DATABASE_NAME]

        # Verify connection
        client.admin.command('ping')
        print(f"✓ Connected to MongoDB: {Config.DATABASE_NAME}\n")

        # Create patients collection with indexes
        print("Setting up patients collection...")
        db.patients.create_index("display_id", unique=True)
        db.patients.create_index([("demographics.location", GEOSPHERE)])
        db.patients.create_index("conditions.name")
        print("✓ Patients collection ready")

        # Create clinical_trials collection with indexes
        print("Setting up clinical_trials collection...")
        db.clinical_trials.create_index("nct_id", unique=True)
        db.clinical_trials.create_index([("locations.geo", GEOSPHERE)])
        db.clinical_trials.create_index("conditions")
        db.clinical_trials.create_index("status")
        print("✓ Clinical trials collection ready")

        # Create match_results collection with indexes
        print("Setting up match_results collection...")
        db.match_results.create_index("patient_id")
        db.match_results.create_index("nct_id")
        db.match_results.create_index(
            [("patient_id", 1), ("nct_id", 1)],
            unique=True
        )
        print("✓ Match results collection ready")

        # Create users collection with indexes
        print("Setting up users collection...")
        db.users.create_index("email", unique=True)
        print("✓ Users collection ready")

        # Create audit_logs collection with indexes
        print("Setting up audit_logs collection...")
        db.audit_logs.create_index("timestamp")
        db.audit_logs.create_index("event_type")
        db.audit_logs.create_index("patient_id")
        print("✓ Audit logs collection ready")

        print("\n" + "=" * 60)
        print("Database initialization complete!")
        print("=" * 60)
        print("\nCollections created:")
        for collection in db.list_collection_names():
            count = db[collection].count_documents({})
            print(f"  - {collection} ({count} documents)")

        client.close()
        return True

    except Exception as e:
        print(f"Error initializing database: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = create_collections_and_indexes()
    sys.exit(0 if success else 1)
