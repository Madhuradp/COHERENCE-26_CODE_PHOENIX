"""
MongoDB integration for clinical trials data
"""

import sys
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime
from pymongo import MongoClient
from pymongo.errors import PyMongoError
from .config import Config

# Add parent directory to path for scripts import
sys.path.insert(0, str(Path(__file__).parent.parent))
from scripts.fetch_clinical_trials import ClinicalTrialsFetcher


class TrialsDB:
    """Handle clinical trials database operations"""

    def __init__(self, mongo_url: Optional[str] = None, db_name: Optional[str] = None):
        """
        Initialize MongoDB connection

        Args:
            mongo_url: MongoDB connection string (defaults to config)
            db_name: Database name (defaults to config)
        """
        self.mongo_url = mongo_url or Config.MONGODB_URL
        self.db_name = db_name or Config.DATABASE_NAME

        if not self.mongo_url:
            raise ValueError("MONGODB_URL environment variable not set")

        try:
            self.client = MongoClient(self.mongo_url)
            self.db = self.client[self.db_name]
            self.trials_collection = self.db["clinical_trials"]
            self.meta_collection = self.db["trials_metadata"]

            # Create indexes for better query performance
            self._create_indexes()
            print(f"Connected to MongoDB: {self.db_name}")
        except PyMongoError as e:
            print(f"Failed to connect to MongoDB: {e}")
            raise

    def _create_indexes(self):
        """Create database indexes for better performance"""
        try:
            self.trials_collection.create_index("nct_id", unique=True)
            self.trials_collection.create_index("overall_status")
            self.trials_collection.create_index("conditions")
            self.trials_collection.create_index("fetched_at")
            print("Database indexes created")
        except PyMongoError as e:
            print(f"Error creating indexes: {e}")

    def insert_trials(self, trials: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Insert or update trials in database

        Args:
            trials: List of trial records from ClinicalTrialsFetcher

        Returns:
            Dictionary with insertion statistics
        """
        if not trials:
            return {"inserted": 0, "updated": 0, "errors": 0}

        inserted = 0
        updated = 0
        errors = 0

        for trial in trials:
            try:
                # Use NCT ID as unique identifier
                nct_id = trial.get("nct_id")
                if not nct_id:
                    errors += 1
                    continue

                result = self.trials_collection.update_one(
                    {"nct_id": nct_id},
                    {"$set": trial},
                    upsert=True
                )

                if result.upserted_id:
                    inserted += 1
                elif result.modified_count > 0:
                    updated += 1

            except PyMongoError as e:
                print(f"Error inserting trial {trial.get('nct_id')}: {e}")
                errors += 1

        return {
            "inserted": inserted,
            "updated": updated,
            "errors": errors,
            "total": len(trials)
        }

    def get_trial_by_nct_id(self, nct_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific trial by NCT ID"""
        try:
            return self.trials_collection.find_one({"nct_id": nct_id})
        except PyMongoError as e:
            print(f"Error fetching trial: {e}")
            return None

    def search_trials(
        self,
        condition: Optional[str] = None,
        status: Optional[str] = None,
        country: Optional[str] = None,
        limit: int = 20,
        skip: int = 0,
    ) -> List[Dict[str, Any]]:
        """
        Search trials in database with filters

        Args:
            condition: Medical condition
            status: Trial status
            country: Country filter
            limit: Max results
            skip: Number of results to skip

        Returns:
            List of matching trials
        """
        try:
            query = {}

            if condition:
                query["conditions"] = {"$regex": condition, "$options": "i"}

            if status:
                query["overall_status"] = status.upper()

            if country:
                query["locations.country"] = country

            return list(
                self.trials_collection.find(query)
                .limit(limit)
                .skip(skip)
                .sort("fetched_at", -1)
            )
        except PyMongoError as e:
            print(f"Error searching trials: {e}")
            return []

    def get_statistics(self) -> Dict[str, Any]:
        """Get statistics about stored trials"""
        try:
            total = self.trials_collection.count_documents({})
            statuses = list(
                self.trials_collection.aggregate([
                    {"$group": {"_id": "$overall_status", "count": {"$sum": 1}}}
                ])
            )
            latest_fetch = self.trials_collection.find_one(
                sort=[("fetched_at", -1)]
            )

            return {
                "total_trials": total,
                "status_breakdown": {s["_id"]: s["count"] for s in statuses},
                "last_fetch": latest_fetch.get("fetched_at") if latest_fetch else None
            }
        except PyMongoError as e:
            print(f"Error getting statistics: {e}")
            return {}

    def update_metadata(self, key: str, value: Any):
        """Store metadata about data fetches"""
        try:
            self.meta_collection.update_one(
                {"_id": key},
                {"$set": {"value": value, "updated_at": datetime.utcnow()}},
                upsert=True
            )
        except PyMongoError as e:
            print(f"Error updating metadata: {e}")

    def close(self):
        """Close database connection"""
        if self.client:
            self.client.close()
            print("Database connection closed")


def fetch_and_store_trials(
    condition: Optional[str] = None,
    intervention: Optional[str] = None,
    status: Optional[str] = None,
    country: Optional[str] = None,
    limit: int = 50,
) -> Dict[str, Any]:
    """
    Convenience function to fetch trials from API and store in database

    Args:
        condition: Medical condition
        intervention: Type of intervention
        status: Trial status
        country: Country code
        limit: Number of trials to fetch

    Returns:
        Dictionary with operation results
    """
    try:
        # Initialize fetcher and database
        fetcher = ClinicalTrialsFetcher()
        db = TrialsDB()

        # Fetch from API
        print(f"Fetching {limit} trials from API...")
        api_data = fetcher.fetch_trials(
            condition=condition,
            intervention=intervention,
            status=status,
            country=country,
            limit=limit
        )

        if "error" in api_data:
            return {"success": False, "error": api_data["error"]}

        # Parse trials
        trials = fetcher.parse_trials(api_data)
        print(f"Parsed {len(trials)} trials")

        # Store in database
        result = db.insert_trials(trials)
        print(f"Database result: {result}")

        # Update metadata
        db.update_metadata("last_fetch", {
            "timestamp": datetime.utcnow().isoformat(),
            "condition": condition,
            "status": status,
            "count": len(trials)
        })

        db.close()

        return {
            "success": True,
            "api_total": api_data.get("totalCount"),
            "parsed": len(trials),
            **result
        }

    except Exception as e:
        print(f"Error in fetch_and_store_trials: {e}")
        return {"success": False, "error": str(e)}


if __name__ == "__main__":
    # Example usage
    result = fetch_and_store_trials(
        condition="COVID-19",
        status="RECRUITING",
        limit=50
    )
    print(f"Result: {result}")
