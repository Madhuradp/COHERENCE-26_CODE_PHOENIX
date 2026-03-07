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
    phase: str = None,
    limit: int = 50
):
    """
    Search clinical trials with flexible filtering.

    Simple search: GET /api/trials/search?condition=diabetes
    Advanced search: GET /api/trials/search?condition=diabetes&min_age=40&max_age=70&phase=PHASE2

    Args:
        condition: Search by medical condition
        min_age: Minimum patient age requirement
        max_age: Maximum patient age requirement
        excluded_medication: Avoid trials excluding this medication
        phase: Trial phase (PHASE1, PHASE2, PHASE3, PHASE4)
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

    # Phase filter (applies to all searches)
    if phase:
        query["phase"] = {"$regex": phase, "$options": "i"}

    trials = list(db.trials.find(query, {"embedding": 0}).limit(limit))
    for t in trials:
        t["_id"] = str(t["_id"])

    return {
        "success": True,
        "count": len(trials),
        "data": trials
    }

@router.get("/search-live")
async def search_trials_live(
    condition: str = None,
    location: str = None,
    phase: str = None,
    limit: int = 20,
):
    """
    Fetch trials directly from ClinicalTrials.gov in real-time (Maharashtra only).
    Results are NOT stored in DB — use /sync to persist them.

    Args:
        condition: Medical condition e.g. "diabetes", "hypertension"
        location: City/state (defaults to Maharashtra, India if not specified)
        phase: Trial phase (PHASE1, PHASE2, PHASE3, PHASE4)
        limit: Max results (default 20, max 100)
    """
    fetcher = ClinicalTrialsFetcher()
    # Default location to Maharashtra if not provided
    if not location:
        location = "Maharashtra, India"

    # Use Maharashtra-specific fetcher if location is Maharashtra
    if "maharashtra" in location.lower() or "mh" in location.lower():
        trials = fetcher.fetch_maharashtra_trials(
            condition=condition,
            phase=phase,
            limit=min(limit, 100),
        )
    else:
        trials = fetcher.fetch_by_condition_and_location(
            condition=condition,
            location=location,
            limit=min(limit, 100),
        )
    for t in trials:
        for key in ("start_date", "completion_date"):
            val = t.get(key)
            if val and hasattr(val, "isoformat"):
                t[key] = val.isoformat()
        t.pop("embedding", None)

    return {
        "success": True,
        "count": len(trials),
        "source": "ClinicalTrials.gov (live)",
        "data": trials,
    }


@router.post("/sync")
async def sync_trials(
    condition: str = None,
    phase: str = None,
    limit: int = 50,
    extract_criteria: bool = True
):
    """
    Sync trials from ClinicalTrials.gov (Maharashtra only).

    Args:
        condition: Medical condition filter e.g. "diabetes", "cancer"
        phase: Trial phase filter e.g. "PHASE2"
        limit: Number of trials to fetch (10–500, default 50)
        extract_criteria: If true, extract structured eligibility criteria
    """
    db = Database()
    fetcher = ClinicalTrialsFetcher()
    semantic = SemanticSearchService()
    criteria_extractor = CriteriaExtractor() if extract_criteria else None

    # Fetch from Maharashtra with filters
    parsed = fetcher.fetch_maharashtra_trials(
        condition=condition,
        phase=phase,
        limit=limit
    )

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
        "message": f"Synced {count} trials from Maharashtra",
        "synced_from": "Maharashtra, India",
        "count": count,
        "condition_filter": condition,
        "phase_filter": phase,
        "extraction_stats": extraction_stats if extract_criteria else None
    }