
from pydantic import Field
from typing import List, Optional
from datetime import datetime
from .base import BaseDocument, GeoPoint, RecruitmentStatus


class Eligibility(BaseDocument):
    """Trial eligibility criteria"""
    min_age: Optional[int] = Field(None, description="Minimum age in years")
    max_age: Optional[int] = Field(None, description="Maximum age in years")
    gender: str = Field(default="ALL", description="Gender requirement (ALL, MALE, FEMALE)")
    raw_text: str = Field(..., description="Raw eligibility text from trial")


class TrialLocation(BaseDocument):
    """Trial location"""
    facility: str = Field(..., description="Facility name")
    city: str = Field(..., description="City")
    state: Optional[str] = Field(None, description="State (US)")
    country: str = Field(..., description="Country")
    geo: GeoPoint = Field(..., description="Geographic location (GeoJSON Point)")


class ClinicalTrial(BaseDocument):
    """Clinical trial document"""
    nct_id: str = Field(..., description="ClinicalTrials.gov NCT ID")
    title: str = Field(..., description="Official trial title")
    brief_title: str = Field(..., description="Brief title")
    phase: Optional[str] = Field(None, description="Trial phase (Phase 1, 2, 3, 4)")
    status: RecruitmentStatus = Field(..., description="Recruitment status")

    # Eligibility
    eligibility: Eligibility = Field(..., description="Eligibility criteria")

    # Locations
    locations: List[TrialLocation] = Field(default=[], description="Trial locations")

    # Dates
    start_date: Optional[datetime] = Field(None, description="Trial start date")
    completion_date: Optional[datetime] = Field(None, description="Expected completion date")

    # Clinical Info
    conditions: List[str] = Field(default=[], description="Medical conditions studied")
    keywords: List[str] = Field(default=[], description="Trial keywords")
    interventions: List[dict] = Field(default=[], description="Intervention details")
    enrollment: Optional[int] = Field(None, description="Target enrollment")
    sponsor: Optional[str] = Field(None, description="Sponsor organization")

    # Vector
    embedding: List[float] = Field(default=[], description="Vector embedding of title+summary")

    class Config:
        json_schema_extra = {
            "example": {
                "nct_id": "NCT04582292",
                "title": "HARMONY OUTCOMES Extension Study",
                "brief_title": "HARMONY Trial Extension",
                "phase": "Phase 3",
                "status": "RECRUITING",
                "eligibility": {
                    "min_age": 18,
                    "max_age": 75,
                    "gender": "ALL",
                    "raw_text": "Inclusion: HbA1c >= 7.5%... Exclusion: Pregnancy..."
                },
                "locations": [
                    {
                        "facility": "UCSF Medical Center",
                        "city": "San Francisco",
                        "state": "CA",
                        "country": "United States",
                        "geo": {
                            "type": "Point",
                            "coordinates": [-122.45, 37.76]
                        }
                    }
                ],
                "conditions": ["Type 2 Diabetes Mellitus"],
                "keywords": ["diabetes", "glycemic control"],
                "sponsor": "Eli Lilly and Company"
            }
        }
