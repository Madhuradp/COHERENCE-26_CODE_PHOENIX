from pydantic import Field
from typing import List
from datetime import datetime
from .base import BaseDocument, MatchStatus, utc_now


class MatchAnalysis(BaseDocument):
    """Match analysis and explanation"""
    summary: str = Field(..., description="Summary of match analysis")
    criteria_met: List[str] = Field(default=[], description="Criteria patient meets")
    criteria_failed: List[str] = Field(default=[], description="Criteria patient fails")
    warnings: List[str] = Field(default=[], description="Warnings or additional notes")


class MatchResult(BaseDocument):
    """Match result document"""
    patient_id: str = Field(..., description="Patient ObjectId as string")
    nct_id: str = Field(..., description="Trial NCT ID")
    run_date: datetime = Field(default_factory=utc_now, description="Date match was generated")

    # Verdict
    status: MatchStatus = Field(..., description="Match status (ELIGIBLE, INELIGIBLE, REVIEW_NEEDED)")
    confidence_score: float = Field(..., ge=0, le=1, description="Confidence score (0-1)")

    # Analysis
    analysis: MatchAnalysis = Field(..., description="Detailed match analysis")

    # Metadata
    distance_km: float = Field(..., description="Distance from patient to trial site in km")

    class Config:
        json_schema_extra = {
            "example": {
                "patient_id": "507f1f77bcf86cd799439011",
                "nct_id": "NCT04582292",
                "run_date": "2024-11-20T10:30:00",
                "status": "ELIGIBLE",
                "confidence_score": 0.84,
                "analysis": {
                    "summary": "Strong match. Patient meets HbA1c requirements.",
                    "criteria_met": ["Age (54 within 18-75)", "Condition (Diabetes)"],
                    "criteria_failed": [],
                    "warnings": ["Requires confirmation of Metformin dosage consistency."]
                },
                "distance_km": 12.4
            }
        }
