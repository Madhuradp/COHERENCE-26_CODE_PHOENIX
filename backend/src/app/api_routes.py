"""
FastAPI routes for clinical trials data
"""

from fastapi import APIRouter, Query, HTTPException
from typing import Optional, List
import sys
from pathlib import Path

# Add scripts to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from scrapper.fetch_clinical_trials import ClinicalTrialsFetcher

router = APIRouter(prefix="/api/trials", tags=["clinical-trials"])
fetcher = ClinicalTrialsFetcher()


@router.get("/search")
async def search_trials(
    condition: Optional[str] = Query(None, description="Medical condition"),
    intervention: Optional[str] = Query(None, description="Type of intervention"),
    status: Optional[str] = Query(None, description="Trial status (RECRUITING, ACTIVE_NOT_RECRUITING, etc.)"),
    country: Optional[str] = Query(None, description="Country code"),
    limit: int = Query(20, ge=1, le=100, description="Number of results"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
):
    """Search clinical trials with filters"""
    try:
        data = fetcher.fetch_trials(
            condition=condition,
            intervention=intervention,
            status=status,
            country=country,
            limit=limit,
            offset=offset
        )

        if "error" in data:
            raise HTTPException(status_code=400, detail=data["error"])

        trials = fetcher.parse_trials(data)
        return {
            "total": data.get("totalCount", len(trials)),
            "count": len(trials),
            "trials": trials
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/details/{nct_id}")
async def get_trial_details(nct_id: str):
    """Get detailed information about a specific trial"""
    try:
        data = fetcher.fetch_trial_details(nct_id)

        if "error" in data:
            raise HTTPException(status_code=404, detail=f"Trial {nct_id} not found")

        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/conditions")
async def get_trials_by_condition(
    condition: str = Query(..., description="Medical condition to search"),
    limit: int = Query(20, ge=1, le=100),
):
    """Get trials for a specific medical condition"""
    try:
        data = fetcher.fetch_trials(condition=condition, limit=limit)

        if "error" in data:
            raise HTTPException(status_code=400, detail=data["error"])

        trials = fetcher.parse_trials(data)
        return {
            "condition": condition,
            "total": data.get("totalCount", len(trials)),
            "trials": trials
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status/{status}")
async def get_trials_by_status(
    status: str = Query(..., description="Trial status filter"),
    limit: int = Query(20, ge=1, le=100),
):
    """Get trials filtered by status"""
    valid_statuses = [
        "RECRUITING",
        "ACTIVE_NOT_RECRUITING",
        "ENROLLING_BY_INVITATION",
        "NOT_YET_RECRUITING",
        "COMPLETED",
        "SUSPENDED",
        "TERMINATED",
        "WITHDRAWN"
    ]

    if status.upper() not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
        )

    try:
        data = fetcher.fetch_trials(status=status.upper(), limit=limit)

        if "error" in data:
            raise HTTPException(status_code=400, detail=data["error"])

        trials = fetcher.parse_trials(data)
        return {
            "status": status.upper(),
            "total": data.get("totalCount", len(trials)),
            "trials": trials
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
