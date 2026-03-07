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
    location: str = "Maharashtra",
    limit: int = 50
):
    """
    Search clinical trials with flexible filtering (Maharashtra-focused).

    Simple search: GET /api/trials/search?condition=diabetes
    Advanced search: GET /api/trials/search?condition=diabetes&min_age=40&max_age=70&phase=PHASE2&location=Maharashtra

    Args:
        condition: Search by medical condition
        min_age: Minimum patient age requirement
        max_age: Maximum patient age requirement
        excluded_medication: Avoid trials excluding this medication
        phase: Trial phase (PHASE1, PHASE2, PHASE3, PHASE4)
        location: Geographic filter (default "Maharashtra")
        limit: Max results (default 50)
    """
    db = Database()
    query = {}

    # Always filter by location (Maharashtra by default)
    if location:
        query["locations.state"] = location

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
    Sync trials from ClinicalTrials.gov (Maharashtra only with strict location filtering).

    Args:
        condition: Medical condition filter e.g. "diabetes", "cancer"
        phase: Trial phase filter e.g. "PHASE2"
        limit: Number of trials to fetch (10–500, default 50)
        extract_criteria: If true, extract structured eligibility criteria

    Returns:
        Count of NEW trials synced (not previously in database)
    """
    from datetime import datetime

    db = Database()
    fetcher = ClinicalTrialsFetcher()
    semantic = SemanticSearchService()
    criteria_extractor = CriteriaExtractor() if extract_criteria else None

    # Fetch from Maharashtra with filters
    parsed = fetcher.fetch_maharashtra_trials(
        condition=condition,
        phase=phase,
        limit=limit * 2  # Fetch extra since we'll filter strictly
    )

    # STRICT Maharashtra filtering - Remove any non-Maharashtra trials
    maharashtra_cities = {
        "Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad", "Kolhapur",
        "Solapur", "Amravati", "Nanded", "Thane", "Navi Mumbai",
        "Satara", "Sangli", "Latur", "Jalgaon", "Akola"
    }

    strictly_filtered = []
    for trial in parsed:
        trial_locations = trial.get("locations", [])
        has_maharashtra = False

        for loc in trial_locations:
            city = loc.get("city", "").strip()
            state = loc.get("state", "").strip()
            country = loc.get("country", "").strip()

            # Check if location is in Maharashtra
            if city in maharashtra_cities or (state == "Maharashtra" and country == "India"):
                has_maharashtra = True
                break

        if has_maharashtra:
            strictly_filtered.append(trial)

    # Limit to requested count
    parsed = strictly_filtered[:limit]

    count = 0
    extraction_stats = {"success": 0, "failed": 0, "skipped": 0}
    sync_timestamp = datetime.utcnow()
    newly_synced_ids = []

    for trial in parsed:
        # Check if trial already exists
        existing = db.trials.find_one({"nct_id": trial["nct_id"]})

        # Tier 1: Generate embedding for Tier 2 matching
        trial["embedding"] = semantic.generate_trial_embedding(trial).tolist()

        # Add sync metadata
        trial["sync_timestamp"] = sync_timestamp
        trial["synced_from"] = "Maharashtra, India"
        trial["sync_condition"] = condition
        trial["sync_phase"] = phase

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

        # Track if this is a new trial
        if not existing:
            newly_synced_ids.append(trial["nct_id"])

        count += 1

    # Store sync history record
    from bson import ObjectId
    sync_history = {
        "_id": ObjectId(),
        "timestamp": sync_timestamp,
        "condition_filter": condition,
        "phase_filter": phase,
        "trials_synced": count,
        "new_trials": len(newly_synced_ids),
        "new_trial_ids": newly_synced_ids,
        "synced_from": "Maharashtra, India",
        "extraction_stats": extraction_stats if extract_criteria else None
    }

    # Create sync_history collection if it doesn't exist
    if "sync_history" not in db.db.list_collection_names():
        db.db.create_collection("sync_history")

    db.db.sync_history.insert_one(sync_history)

    return {
        "success": True,
        "message": f"Synced {count} trials from Maharashtra ({len(newly_synced_ids)} new)",
        "synced_from": "Maharashtra, India",
        "count": count,
        "new_trials": len(newly_synced_ids),
        "newly_synced_trial_ids": newly_synced_ids,
        "condition_filter": condition,
        "phase_filter": phase,
        "extraction_stats": extraction_stats if extract_criteria else None,
        "sync_id": str(sync_history["_id"])
    }


@router.get("/sync-history")
async def get_sync_history(limit: int = 20):
    """
    Get sync history - shows when trials were last synced.

    Args:
        limit: Number of recent syncs to retrieve (default 20)

    Returns:
        List of sync operations in reverse chronological order
    """
    db = Database()

    # Create collection if it doesn't exist
    if "sync_history" not in db.db.list_collection_names():
        return {"success": True, "data": []}

    syncs = list(
        db.db.sync_history.find({})
        .sort("timestamp", -1)
        .limit(limit)
    )

    for sync in syncs:
        sync["_id"] = str(sync["_id"])
        sync["sync_id"] = str(sync.get("sync_id", ""))

    return {"success": True, "data": syncs}


@router.get("/recently-synced")
async def get_recently_synced_trials(hours: int = 24, limit: int = 50):
    """
    Get trials synced in the last N hours (shows ONLY recently synced trials).

    Args:
        hours: Show trials synced in last N hours (default 24)
        limit: Max results (default 50)

    Returns:
        List of recently synced trials from Maharashtra
    """
    from datetime import datetime, timedelta

    db = Database()

    # Calculate cutoff time
    cutoff = datetime.utcnow() - timedelta(hours=hours)

    # Find trials synced after cutoff
    trials = list(
        db.trials.find(
            {
                "sync_timestamp": {"$gte": cutoff},
                "synced_from": "Maharashtra, India"
            },
            {"embedding": 0}  # Exclude embeddings from response
        )
        .sort("sync_timestamp", -1)
        .limit(limit)
    )

    # Format response
    for trial in trials:
        trial["_id"] = str(trial["_id"])
        if "sync_timestamp" in trial:
            trial["synced_ago_hours"] = round(
                (datetime.utcnow() - trial["sync_timestamp"]).total_seconds() / 3600, 1
            )

    return {
        "success": True,
        "data": trials,
        "count": len(trials),
        "synced_in_last_hours": hours,
        "message": f"{len(trials)} trials synced in last {hours} hour(s)"
    }