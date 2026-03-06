"""Patient data models"""

from pydantic import Field
from typing import List, Optional
from datetime import datetime
from .base import BaseDocument, GeoPoint, MedicationStatus, utc_now


class Demographics(BaseDocument):
    """Patient demographics"""
    age: Optional[int] = Field(default=None, ge=0, le=150, description="Age in years")
    gender: Optional[str] = Field(default=None, description="Gender (male, female, other)")
    location: Optional[GeoPoint] = Field(default=None, description="Geographic location (GeoJSON Point)")
    notes: Optional[str] = Field(default=None, description="Additional demographic notes")


class Condition(BaseDocument):
    """Medical condition"""
    name: str = Field(..., description="Condition name")
    icd10: Optional[str] = Field(default=None, description="ICD-10 code")
    onset: Optional[datetime] = Field(default=None, description="Onset date")


class Medication(BaseDocument):
    """Current medication"""
    name: str = Field(..., description="Medication name")
    dosage: Optional[str] = Field(default=None, description="Dosage (e.g., 500mg)")
    status: Optional[str] = Field(default="active", description="Medication status")


class LabValue(BaseDocument):
    """Lab test result"""
    name: str = Field(..., description="Lab test name (e.g., HbA1c)")
    value: Optional[float] = Field(default=None, description="Test value")
    unit: Optional[str] = Field(default=None, description="Unit of measurement")
    date: Optional[datetime] = Field(default=None, description="Test date")


class Patient(BaseDocument):
    """Patient document"""
    display_id: Optional[str] = Field(default=None, description="Patient display ID (e.g., PT-0042)")
    demographics: Optional[Demographics] = Field(default=None, description="Demographic information")
    conditions: List[Condition] = Field(default=[], description="Medical conditions")
    medications: List[Medication] = Field(default=[], description="Current medications")
    lab_values: List[LabValue] = Field(default=[], description="Lab test results")
    clinical_notes_text: Optional[str] = Field(default=None, description="Unstructured clinical notes")
    embedding: List[float] = Field(default=[], description="Vector embedding for semantic search")

    class Config:
        json_schema_extra = {
            "example": {
                "display_id": "PT-0042",
                "demographics": {
                    "age": 54,
                    "gender": "female",
                    "location": {
                        "type": "Point",
                        "coordinates": [-122.41, 37.77]
                    }
                },
                "conditions": [
                    {
                        "name": "Type 2 Diabetes",
                        "icd10": "E11.9",
                        "onset": "2021-03-01T00:00:00"
                    }
                ],
                "medications": [
                    {
                        "name": "Metformin",
                        "dosage": "500mg",
                        "status": "active"
                    }
                ],
                "lab_values": [
                    {
                        "name": "HbA1c",
                        "value": 8.2,
                        "unit": "%",
                        "date": "2024-11-15T00:00:00"
                    }
                ],
                "clinical_notes_text": "Patient presents with poorly controlled T2DM...",
                "embedding": [0.012, -0.034, 0.156]
            }
        }
