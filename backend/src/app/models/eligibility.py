"""Structured eligibility criteria models"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum


class ConstraintOperator(str, Enum):
    """Constraint operators for matching"""
    EQ = "=="
    NEQ = "!="
    GT = ">"
    GTE = ">="
    LT = "<"
    LTE = "<="
    IN = "in"
    NOT_IN = "not_in"
    CONTAINS = "contains"
    NOT_CONTAINS = "not_contains"


class AgeConstraint(BaseModel):
    """Age constraint"""
    min_age: Optional[int] = Field(None, description="Minimum age in years")
    max_age: Optional[int] = Field(None, description="Maximum age in years")


class LabValueConstraint(BaseModel):
    """Lab value constraint (e.g., HbA1c > 7.0)"""
    test_name: str = Field(..., description="Lab test name (e.g., HbA1c, eGFR, ALT)")
    operator: ConstraintOperator = Field(..., description="Comparison operator")
    value: float = Field(..., description="Threshold value")
    unit: Optional[str] = Field(None, description="Unit of measurement (e.g., %, mg/dL)")


class ConditionConstraint(BaseModel):
    """Medical condition requirement"""
    condition: str = Field(..., description="Condition name (e.g., Type 2 Diabetes)")
    requirement: str = Field(
        default="required",
        description="'required' or 'excluded'"
    )


class MedicationConstraint(BaseModel):
    """Medication requirement or exclusion"""
    medication: str = Field(..., description="Medication name")
    requirement: str = Field(
        default="excluded",
        description="'required', 'excluded', or 'prior_therapy_allowed'"
    )


class PerformanceStatusConstraint(BaseModel):
    """Performance status constraint (ECOG scale 0-4)"""
    max_ecog: Optional[int] = Field(None, description="Maximum ECOG score (0-4)")


class PregnancyConstraint(BaseModel):
    """Pregnancy status requirement"""
    excluded: bool = Field(default=True, description="Pregnant/nursing patients excluded")


class StructuredEligibility(BaseModel):
    """Structured, queryable eligibility criteria"""

    # Demographics
    age: Optional[AgeConstraint] = Field(None, description="Age constraints")
    gender: Optional[str] = Field(None, description="Gender requirement (ALL, MALE, FEMALE, OTHER)")

    # Medical
    conditions: List[ConditionConstraint] = Field(default=[], description="Condition requirements")
    medications: List[MedicationConstraint] = Field(default=[], description="Medication constraints")
    lab_values: List[LabValueConstraint] = Field(default=[], description="Lab value constraints")

    # Status
    performance_status: Optional[PerformanceStatusConstraint] = Field(None, description="Performance status")
    pregnancy: Optional[PregnancyConstraint] = Field(None, description="Pregnancy constraints")

    # Organ function
    organ_function_constraints: List[Dict[str, Any]] = Field(
        default=[],
        description="Organ function constraints (e.g., renal, hepatic)"
    )

    # Extract metadata
    extraction_confidence: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="Confidence score of extraction (0.0-1.0)"
    )

    extraction_timestamp: Optional[str] = Field(None, description="When criteria was extracted/updated")

    raw_text: str = Field(..., description="Original raw eligibility text for reference")


class ExtractedCriteria(BaseModel):
    """Result of criteria extraction"""
    success: bool = Field(..., description="Whether extraction was successful")
    structured_eligibility: Optional[StructuredEligibility] = Field(
        None,
        description="Extracted structured criteria"
    )
    extraction_notes: str = Field(
        default="",
        description="Notes or warnings from extraction"
    )
    error_message: Optional[str] = Field(None, description="Error if extraction failed")
