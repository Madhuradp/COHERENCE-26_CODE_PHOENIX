from fastapi import APIRouter
from ..core.database import Database
from scrapper.fetch_clinical_trials import ClinicalTrialsFetcher
from ..services.semantic_search import SemanticSearchService
from ..services.criteria_extractor import CriteriaExtractor

router = APIRouter(prefix="/api/trials", tags=["Trials"])

@router.get("/")
async def get_trials(condition: str = None):
    db = Database()
    query = {}
    if condition:
        query = {"conditions": {"$regex": condition, "$options": "i"}}

    trials = list(db.trials.find(query, {"embedding": 0}).limit(20))
    for t in trials:
        t["_id"] = str(t["_id"])
    return {"success": True, "data": trials}


@router.get("/search/structured")
async def search_by_structured_criteria(
    min_age: int = None,
    max_age: int = None,
    condition: str = None,
    excluded_medication: str = None
):
    """
    Search trials using structured eligibility criteria.
    More intelligent than text-based search since criteria are parsed.

    Examples:
    - GET /api/trials/search/structured?min_age=18&condition=diabetes
    - GET /api/trials/search/structured?max_age=65&excluded_medication=warfarin
    """
    db = Database()
    query = {"structured_eligibility": {"$exists": True}}

    # Age range query
    if min_age is not None:
        query["structured_eligibility.age.max_age"] = {"$gte": min_age}
    if max_age is not None:
        query["structured_eligibility.age.min_age"] = {"$lte": max_age}

    # Condition search (required)
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

    trials = list(db.trials.find(query, {"embedding": 0}).limit(50))
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