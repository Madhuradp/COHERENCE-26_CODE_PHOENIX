"""
Criteria Extractor Service
Converts raw eligibility text into structured, queryable JSON format using LLM
"""

import json
import os
import re
from datetime import datetime
from typing import Dict, Any, Optional
from openai import OpenAI

from ..models.eligibility import (
    StructuredEligibility,
    ExtractedCriteria,
    AgeConstraint,
    LabValueConstraint,
    ConditionConstraint,
    MedicationConstraint,
    PerformanceStatusConstraint,
    PregnancyConstraint,
    ConstraintOperator
)


class CriteriaExtractor:
    """Extract structured eligibility criteria from raw text using LLM"""

    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.model = os.getenv("LLM_MODEL", "gpt-4o")

    def extract_criteria(self, raw_eligibility_text: str) -> ExtractedCriteria:
        """
        Parse raw eligibility text into structured format.

        Args:
            raw_eligibility_text: Raw eligibility criteria from trial

        Returns:
            ExtractedCriteria with structured eligibility data
        """
        if not raw_eligibility_text or len(raw_eligibility_text.strip()) < 10:
            return ExtractedCriteria(
                success=False,
                error_message="Eligibility text is empty or too short",
                structured_eligibility=None
            )

        prompt = f"""You are an expert clinical trial specialist. Extract structured eligibility criteria from the following raw text.

RAW ELIGIBILITY TEXT:
{raw_eligibility_text}

TASK:
Extract all eligibility criteria into a structured JSON format. Be thorough and conservative - if unclear, note it in extraction_notes.

REQUIRED JSON STRUCTURE:
{{
    "age": {{
        "min_age": <int or null>,
        "max_age": <int or null>
    }},
    "gender": "ALL" | "MALE" | "FEMALE" | "OTHER" | null,
    "conditions": [
        {{"condition": "<condition name>", "requirement": "required" | "excluded"}}
    ],
    "medications": [
        {{"medication": "<drug name>", "requirement": "required" | "excluded" | "prior_therapy_allowed"}}
    ],
    "lab_values": [
        {{
            "test_name": "<test name, e.g., HbA1c>",
            "operator": "==" | "!=" | ">" | ">=" | "<" | "<=" | "in" | "not_in" | "contains",
            "value": <float>,
            "unit": "<unit, e.g., %, mg/dL>" | null
        }}
    ],
    "performance_status": {{
        "max_ecog": <int 0-4> | null
    }} | null,
    "pregnancy": {{
        "excluded": <boolean>
    }} | null,
    "organ_function_constraints": [
        {{"organ": "kidney|liver|heart", "constraint": "<description>"}}
    ],
    "extraction_confidence": <0.0-1.0>,
    "extraction_notes": "<any ambiguities or important notes>"
}}

GUIDELINES:
- Age: Extract numeric values. If "18 years and older", min_age = 18, max_age = null
- Gender: Look for male/female only restrictions, default to "ALL"
- Conditions: Separate inclusion from exclusion
- Lab Values: Extract numeric thresholds with operators (>, <, >=, <=, =)
- Medications: Common exclusions (pregnant patients, certain drugs)
- Performance Status: ECOG scores (0=fully active to 4=bedbound)
- Pregnancy: Mark true if pregnant/nursing are excluded
- Confidence: Rate extraction confidence (0.0 to 1.0) based on text clarity
- Extraction Notes: Any uncertainties, assumptions, or special notes

Return ONLY valid JSON, no markdown, no explanation."""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                temperature=0.3  # Low temp for consistent extraction
            )

            # Parse LLM response
            extracted_json = json.loads(response.choices[0].message.content)

            # Validate and construct StructuredEligibility
            structured = self._build_structured_eligibility(extracted_json, raw_eligibility_text)

            return ExtractedCriteria(
                success=True,
                structured_eligibility=structured,
                extraction_notes=extracted_json.get("extraction_notes", "")
            )

        except json.JSONDecodeError as e:
            return ExtractedCriteria(
                success=False,
                error_message=f"JSON parsing error: {str(e)}",
                structured_eligibility=None
            )
        except Exception as e:
            return ExtractedCriteria(
                success=False,
                error_message=f"Extraction error: {str(e)}",
                structured_eligibility=None
            )

    def _build_structured_eligibility(
        self,
        extracted_json: Dict[str, Any],
        raw_text: str
    ) -> StructuredEligibility:
        """Build StructuredEligibility object from extracted JSON"""

        # Age
        age_data = extracted_json.get("age")
        age_constraint = None
        if age_data:
            age_constraint = AgeConstraint(
                min_age=age_data.get("min_age"),
                max_age=age_data.get("max_age")
            )

        # Gender
        gender = extracted_json.get("gender", "ALL")

        # Conditions
        conditions = []
        for cond in extracted_json.get("conditions", []):
            conditions.append(ConditionConstraint(
                condition=cond.get("condition", ""),
                requirement=cond.get("requirement", "required")
            ))

        # Medications
        medications = []
        for med in extracted_json.get("medications", []):
            medications.append(MedicationConstraint(
                medication=med.get("medication", ""),
                requirement=med.get("requirement", "excluded")
            ))

        # Lab Values
        lab_values = []
        for lab in extracted_json.get("lab_values", []):
            try:
                operator = ConstraintOperator(lab.get("operator", "=="))
                lab_values.append(LabValueConstraint(
                    test_name=lab.get("test_name", ""),
                    operator=operator,
                    value=float(lab.get("value", 0)),
                    unit=lab.get("unit")
                ))
            except (ValueError, KeyError):
                continue  # Skip malformed lab values

        # Performance Status
        performance_data = extracted_json.get("performance_status")
        performance_status = None
        if performance_data and performance_data.get("max_ecog") is not None:
            performance_status = PerformanceStatusConstraint(
                max_ecog=int(performance_data.get("max_ecog"))
            )

        # Pregnancy
        pregnancy_data = extracted_json.get("pregnancy")
        pregnancy = None
        if pregnancy_data is not None:
            pregnancy = PregnancyConstraint(
                excluded=pregnancy_data.get("excluded", True)
            )

        # Organ function constraints
        organ_constraints = extracted_json.get("organ_function_constraints", [])

        return StructuredEligibility(
            age=age_constraint,
            gender=gender,
            conditions=conditions,
            medications=medications,
            lab_values=lab_values,
            performance_status=performance_status,
            pregnancy=pregnancy,
            organ_function_constraints=organ_constraints,
            extraction_confidence=float(extracted_json.get("extraction_confidence", 0.5)),
            extraction_timestamp=datetime.utcnow().isoformat(),
            raw_text=raw_text
        )

    def check_patient_eligibility(
        self,
        patient: Dict[str, Any],
        structured_criteria: StructuredEligibility
    ) -> Dict[str, Any]:
        """
        Check if patient matches structured criteria.
        Returns detailed matching results.
        """
        results = {
            "overall_match": True,
            "failed_checks": [],
            "passed_checks": [],
            "unclear_checks": []
        }

        # Age check
        if structured_criteria.age:
            age = patient.get("demographics", {}).get("age")
            if age:
                if structured_criteria.age.min_age and age < structured_criteria.age.min_age:
                    results["overall_match"] = False
                    results["failed_checks"].append(
                        f"Age {age} below minimum {structured_criteria.age.min_age}"
                    )
                elif structured_criteria.age.max_age and age > structured_criteria.age.max_age:
                    results["overall_match"] = False
                    results["failed_checks"].append(
                        f"Age {age} above maximum {structured_criteria.age.max_age}"
                    )
                else:
                    results["passed_checks"].append(f"Age {age} within range")

        # Condition checks
        patient_conditions = set(
            c.lower() for c in patient.get("conditions", [])
        )
        for cond_constraint in structured_criteria.conditions:
            cond_name = cond_constraint.condition.lower()
            if cond_constraint.requirement == "required":
                if cond_name in patient_conditions:
                    results["passed_checks"].append(f"Has required condition: {cond_constraint.condition}")
                else:
                    results["overall_match"] = False
                    results["failed_checks"].append(f"Missing required condition: {cond_constraint.condition}")
            elif cond_constraint.requirement == "excluded":
                if cond_name in patient_conditions:
                    results["overall_match"] = False
                    results["failed_checks"].append(f"Has excluded condition: {cond_constraint.condition}")
                else:
                    results["passed_checks"].append(f"Does not have excluded condition: {cond_constraint.condition}")

        # Lab value checks (simplified - would need actual lab data)
        if structured_criteria.lab_values:
            patient_labs = patient.get("lab_values", {})
            for lab_constraint in structured_criteria.lab_values:
                if lab_constraint.test_name.lower() in [k.lower() for k in patient_labs.keys()]:
                    results["passed_checks"].append(
                        f"Has lab test: {lab_constraint.test_name}"
                    )
                else:
                    results["unclear_checks"].append(
                        f"Lab test {lab_constraint.test_name} not found in patient data"
                    )

        return results
