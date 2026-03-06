from fastapi import APIRouter
from ..core.database import Database
from scrapper.fetch_clinical_trials import ClinicalTrialsFetcher
from ..services.semantic_search import SemanticSearchService
from ..services.criteria_extractor import CriteriaExtractor

router = APIRouter(prefix="/api/trials", tags=["Trials"])

@router.get("/search")
async def search_trials(
    condition: str = None,
    min_age: int = None,
    max_age: int = None,
    excluded_medication: str = None,
    limit: int = 50
):
    """
    Search clinical trials with flexible filtering.

    Simple search: GET /api/trials/search?condition=diabetes
    Advanced search: GET /api/trials/search?condition=diabetes&min_age=40&max_age=70&excluded_medication=warfarin

    Args:
        condition: Search by medical condition
        min_age: Minimum patient age requirement
        max_age: Maximum patient age requirement
        excluded_medication: Avoid trials excluding this medication
        limit: Max results (default 50)
    """
    db = Database()
    query = {}

    # If no structured criteria exist, fall back to basic search
    if min_age is None and max_age is None and excluded_medication is None:
        # Simple text search
        if condition:
            query = {
                "$or": [
                    {"conditions": {"$regex": condition, "$options": "i"}},
                    {"title": {"$regex": condition, "$options": "i"}},
                    {"keywords": {"$elemMatch": {"$regex": condition, "$options": "i"}}}
                ]
            }
    else:
        # Advanced structured search
        query = {"structured_eligibility": {"$exists": True}}

        # Age range query
        if min_age is not None:
            query["structured_eligibility.age.max_age"] = {"$gte": min_age}
        if max_age is not None:
            query["structured_eligibility.age.min_age"] = {"$lte": max_age}

        # Condition search
        if condition:
            query["structured_eligibility.conditions"] = {
                "$elemMatch": {
                    "condition": {"$regex": condition, "$options": "i"},
                    "requirement": "required"
                }
            }

        # Excluded medication
        if excluded_medication:
            query["structured_eligibility.medications"] = {
                "$not": {
                    "$elemMatch": {
                        "medication": {"$regex": excluded_medication, "$options": "i"},
                        "requirement": "excluded"
                    }
                }
            }

    trials = list(db.trials.find(query, {"embedding": 0}).limit(limit))
    for t in trials:
        t["_id"] = str(t["_id"])

    return {
        "success": True,
        "count": len(trials),
        "data": trials
    }

@router.post("/sync")
async def sync_trials(extract_criteria: bool = True):
    """
    Sync trials from ClinicalTrials.gov.

    Args:
        extract_criteria: If true, extract structured eligibility criteria (slower but more useful)
    """
    db = Database()
    fetcher = ClinicalTrialsFetcher()
    semantic = SemanticSearchService()
    criteria_extractor = CriteriaExtractor() if extract_criteria else None

    # Fetch top 50 trials for the demo
    raw_data = fetcher.fetch_trials_paginated(limit=50, max_pages=1)
    parsed = fetcher.parse_trials(raw_data)

    count = 0
    extraction_stats = {"success": 0, "failed": 0, "skipped": 0}

    for trial in parsed:
        # Tier 1: Generate embedding for Tier 2 matching
        trial["embedding"] = semantic.generate_trial_embedding(trial).tolist()

        # Tier 2: Extract structured eligibility criteria
        if criteria_extractor:
            raw_eligibility = trial.get("eligibility", {}).get("raw_text", "")
            if raw_eligibility and len(raw_eligibility) > 20:
                extraction_result = criteria_extractor.extract_criteria(raw_eligibility)
                if extraction_result.success:
                    trial["structured_eligibility"] = extraction_result.structured_eligibility.dict()
                    extraction_stats["success"] += 1
                else:
                    extraction_stats["failed"] += 1
            else:
                extraction_stats["skipped"] += 1

        # Save to MongoDB
        db.trials.update_one(
            {"nct_id": trial["nct_id"]},
            {"$set": trial},
            upsert=True
        )
        count += 1

    return {
        "success": True,
        "message": f"Synced {count} trials",
        "extraction_stats": extraction_stats if extract_criteria else None
    }