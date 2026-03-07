"""
Trial Matcher Service

Maps patient clinical data to trial eligibility criteria and provides
detailed matching analysis showing how patient data satisfies or fails
each trial requirement.
"""

from typing import Dict, List, Any, Optional
from .eligibility_evaluator import EligibilityEvaluator


class TrialMatcher:
    """
    Maps patient data to trial criteria and provides transparent matching analysis.

    Shows exactly:
    - Which patient values/conditions are relevant
    - Which trial criteria they satisfy
    - Why a trial is ELIGIBLE/INELIGIBLE
    """

    def __init__(self):
        self.evaluator = EligibilityEvaluator()

    def match_patient_to_trial(self, patient: Dict, trial: Dict) -> Dict:
        """
        Match patient to trial and return detailed mapping analysis.

        Returns comprehensive result showing:
        - Patient data extracted for this trial
        - How it maps to trial criteria
        - Overall eligibility verdict with reasoning
        """
        # 1. Extract relevant patient data
        patient_data = self._extract_patient_data(patient)

        # 2. Extract trial criteria
        trial_criteria = self._extract_trial_criteria(trial)

        # 3. Evaluate criteria match
        criteria_evaluation = self.evaluator.evaluate_trial_criteria(patient, trial)

        # 4. Create detailed mapping
        matching_analysis = {
            "patient_data": patient_data,
            "trial_criteria": trial_criteria,
            "eligibility_evaluation": criteria_evaluation,
            "mapping": self._create_mapping(
                patient_data,
                trial_criteria,
                criteria_evaluation
            ),
            "overall_fit": self._compute_fit_score(criteria_evaluation),
            "explanation": self._generate_explanation(
                patient_data,
                criteria_evaluation
            )
        }

        return matching_analysis

    def _extract_patient_data(self, patient: Dict) -> Dict:
        """Extract relevant clinical data from patient record."""
        demographics = patient.get("demographics", {}) or {}

        return {
            "age": demographics.get("age"),
            "gender": demographics.get("gender"),
            "location": demographics.get("location"),
            "conditions": [
                {
                    "name": c.get("name"),
                    "status": c.get("status", "active"),
                    "onset_date": c.get("onset_date")
                }
                for c in patient.get("conditions", []) or []
            ],
            "medications": [
                {
                    "name": m.get("name"),
                    "dosage": m.get("dosage"),
                    "frequency": m.get("frequency"),
                    "start_date": m.get("start_date")
                }
                for m in patient.get("medications", []) or []
            ],
            "lab_values": [
                {
                    "test_name": l.get("test_name"),
                    "value": l.get("value"),
                    "unit": l.get("unit"),
                    "reference_range": l.get("reference_range"),
                    "date": l.get("date")
                }
                for l in patient.get("lab_values", []) or []
            ],
            "clinical_notes": patient.get("clinical_notes", ""),
            "pregnancy_status": demographics.get("pregnancy_status"),
            "nursing_status": demographics.get("nursing_status"),
            "performance_status": patient.get("clinical_data", {}).get("ecog_score")
        }

    def _extract_trial_criteria(self, trial: Dict) -> Dict:
        """Extract trial eligibility criteria."""
        structured = trial.get("structured_eligibility", {})

        return {
            "trial_id": trial.get("nct_id"),
            "trial_title": trial.get("title"),
            "phase": trial.get("phase"),
            "status": trial.get("status"),
            "enrollment": trial.get("enrollment"),
            "sponsor": trial.get("sponsor"),
            "conditions": trial.get("conditions", []),
            "keywords": trial.get("keywords", []),
            "locations": [
                {
                    "facility": loc.get("facility"),
                    "city": loc.get("city"),
                    "state": loc.get("state"),
                    "country": loc.get("country")
                }
                for loc in trial.get("locations", []) or []
            ],
            "eligibility_criteria": {
                "age": structured.get("age"),
                "gender": structured.get("gender"),
                "conditions": structured.get("conditions", []),
                "medications": structured.get("medications", []),
                "lab_values": structured.get("lab_values", []),
                "pregnancy": structured.get("pregnancy"),
                "performance_status": structured.get("performance_status"),
                "organ_function": structured.get("organ_function_constraints", [])
            }
        }

    def _create_mapping(
        self,
        patient_data: Dict,
        trial_criteria: Dict,
        criteria_eval: Dict
    ) -> Dict:
        """Create detailed mapping showing how patient data matches trial criteria."""
        mapping = {
            "age_mapping": self._map_age(patient_data, criteria_eval),
            "gender_mapping": self._map_gender(patient_data, criteria_eval),
            "condition_mapping": self._map_conditions(patient_data, criteria_eval),
            "lab_mapping": self._map_labs(patient_data, criteria_eval),
            "medication_mapping": self._map_medications(patient_data, criteria_eval),
            "pregnancy_mapping": self._map_pregnancy(patient_data, criteria_eval),
            "performance_mapping": self._map_performance(patient_data, criteria_eval)
        }
        return mapping

    def _map_age(self, patient_data: Dict, criteria_eval: Dict) -> Dict:
        """Map patient age to trial age criteria."""
        age_criterion = next(
            (c for c in criteria_eval.get("inclusion_criteria", []) if c.get("type") == "age"),
            None
        )

        if age_criterion:
            return {
                "criterion": age_criterion["criterion"],
                "patient_value": patient_data.get("age"),
                "status": age_criterion["status"],
                "explanation": f"Patient age is {patient_data.get('age')} years old, "
                              f"trial requires {age_criterion['criterion'].lower()}"
            }
        return {}

    def _map_gender(self, patient_data: Dict, criteria_eval: Dict) -> Dict:
        """Map patient gender to trial gender criteria."""
        gender_criterion = next(
            (c for c in criteria_eval.get("inclusion_criteria", []) if c.get("type") == "gender"),
            None
        )

        if gender_criterion:
            return {
                "criterion": gender_criterion["criterion"],
                "patient_value": patient_data.get("gender"),
                "status": gender_criterion["status"],
                "explanation": f"Patient gender is {patient_data.get('gender')}, "
                              f"trial requires {gender_criterion['criterion'].lower()}"
            }
        return {}

    def _map_conditions(self, patient_data: Dict, criteria_eval: Dict) -> List[Dict]:
        """Map patient conditions to trial condition criteria."""
        condition_criteria = [
            c for c in criteria_eval.get("inclusion_criteria", [])
            if c.get("type") == "condition"
        ]

        mappings = []
        patient_conditions = [c.get("name", "").lower() for c in patient_data.get("conditions", [])]

        for criterion in condition_criteria:
            condition_name = criterion["criterion"].replace("Diagnosis: ", "").lower()
            has_condition = any(condition_name in pc for pc in patient_conditions)

            mappings.append({
                "criterion": criterion["criterion"],
                "patient_has": has_condition,
                "patient_conditions": patient_data.get("conditions", []),
                "status": criterion["status"],
                "explanation": f"Patient has {len(patient_data.get('conditions', []))} condition(s): "
                              f"{', '.join([c.get('name') for c in patient_data.get('conditions', [])])}. "
                              f"Trial requires: {criterion['criterion'].lower()}"
            })

        return mappings

    def _map_labs(self, patient_data: Dict, criteria_eval: Dict) -> List[Dict]:
        """Map patient lab values to trial lab criteria."""
        lab_criteria = [
            c for c in criteria_eval.get("inclusion_criteria", [])
            if c.get("type") == "lab"
        ]

        mappings = []
        for criterion in lab_criteria:
            lab_value = criterion.get("patient_value")

            mappings.append({
                "criterion": criterion["criterion"],
                "patient_value": lab_value,
                "patient_labs": patient_data.get("lab_values", []),
                "status": criterion["status"],
                "explanation": f"Patient lab result: {lab_value if lab_value else 'Not recorded'}. "
                              f"Trial requires: {criterion['criterion'].lower()}"
            })

        return mappings

    def _map_medications(self, patient_data: Dict, criteria_eval: Dict) -> List[Dict]:
        """Map patient medications to trial medication exclusions."""
        med_criteria = [
            c for c in criteria_eval.get("exclusion_criteria", [])
            if c.get("type") == "medication"
        ]

        mappings = []
        patient_meds = [m.get("name", "").lower() for m in patient_data.get("medications", [])]

        for criterion in med_criteria:
            med_name = criterion["criterion"].replace("Cannot use: ", "").lower()
            has_med = any(med_name in pm for pm in patient_meds)

            mappings.append({
                "criterion": criterion["criterion"],
                "patient_has": has_med,
                "patient_medications": patient_data.get("medications", []),
                "status": criterion["status"],
                "explanation": f"Patient currently takes: {', '.join([m.get('name') for m in patient_data.get('medications', [])])}. "
                              f"Trial excludes: {criterion['criterion'].lower()}"
            })

        return mappings

    def _map_pregnancy(self, patient_data: Dict, criteria_eval: Dict) -> Dict:
        """Map patient pregnancy status to trial criteria."""
        preg_criterion = next(
            (c for c in criteria_eval.get("exclusion_criteria", []) if c.get("type") == "pregnancy"),
            None
        )

        if preg_criterion:
            pregnancy_status = patient_data.get("pregnancy_status", "unknown")
            nursing_status = patient_data.get("nursing_status", "unknown")

            return {
                "criterion": preg_criterion["criterion"],
                "patient_status": f"{pregnancy_status}, nursing: {nursing_status}",
                "status": preg_criterion["status"],
                "explanation": f"Patient pregnancy status: {pregnancy_status}. "
                              f"Patient nursing status: {nursing_status}. "
                              f"Trial excludes: {preg_criterion['criterion'].lower()}"
            }
        return {}

    def _map_performance(self, patient_data: Dict, criteria_eval: Dict) -> Dict:
        """Map patient performance status to trial criteria."""
        perf_criterion = next(
            (c for c in criteria_eval.get("exclusion_criteria", []) if c.get("type") == "performance_status"),
            None
        )

        if perf_criterion:
            ecog_score = patient_data.get("performance_status")

            return {
                "criterion": perf_criterion["criterion"],
                "patient_value": ecog_score,
                "status": perf_criterion["status"],
                "explanation": f"Patient ECOG score: {ecog_score if ecog_score is not None else 'Not recorded'}. "
                              f"Trial requires: {perf_criterion['criterion'].lower()}"
            }
        return {}

    def _compute_fit_score(self, criteria_eval: Dict) -> Dict:
        """Compute how well patient fits this trial (0-100%)."""
        inclusions = criteria_eval.get("inclusion_criteria", [])
        exclusions = criteria_eval.get("exclusion_criteria", [])

        if not inclusions and not exclusions:
            return {"score": 50, "reasoning": "Insufficient data for evaluation"}

        inclusions_met = sum(1 for c in inclusions if c["status"] == "MET")
        inclusions_total = len(inclusions) if inclusions else 1

        exclusions_clear = sum(1 for c in exclusions if c["status"] == "NOT_EXCLUDED")
        exclusions_total = len(exclusions) if exclusions else 1

        inclusion_score = (inclusions_met / inclusions_total * 100) if inclusions else 100
        exclusion_score = (exclusions_clear / exclusions_total * 100) if exclusions else 100

        overall_score = (inclusion_score + exclusion_score) / 2

        return {
            "overall_fit": int(overall_score),
            "inclusion_fit": int(inclusion_score),
            "exclusion_fit": int(exclusion_score),
            "reasoning": self._compute_fit_reasoning(
                inclusions_met,
                inclusions_total,
                exclusions_clear,
                exclusions_total
            )
        }

    def _compute_fit_reasoning(
        self,
        inclusions_met: int,
        inclusions_total: int,
        exclusions_clear: int,
        exclusions_total: int
    ) -> str:
        """Generate reasoning for fit score."""
        if inclusions_total > 0 and exclusions_total > 0:
            return (f"Patient meets {inclusions_met}/{inclusions_total} inclusion criteria "
                   f"and avoids {exclusions_clear}/{exclusions_total} exclusion criteria")
        elif inclusions_total > 0:
            return f"Patient meets {inclusions_met}/{inclusions_total} inclusion criteria"
        else:
            return f"Patient avoids {exclusions_clear}/{exclusions_total} exclusion criteria"

    def _generate_explanation(self, patient_data: Dict, criteria_eval: Dict) -> str:
        """Generate human-readable explanation of match."""
        overall = criteria_eval.get("overall_eligibility", "REVIEW_NEEDED")

        if overall == "ELIGIBLE":
            return (f"Patient ({patient_data.get('age')} year old {patient_data.get('gender')}) "
                   f"meets all inclusion criteria and has no exclusions. "
                   f"Strong match for this trial.")
        elif overall == "INELIGIBLE":
            excluded = [c for c in criteria_eval.get("exclusion_criteria", [])
                       if c["status"] == "EXCLUDED"]
            return (f"Patient does not qualify due to: "
                   f"{', '.join([e['criterion'].lower() for e in excluded[:2]])}.")
        else:
            unmet = [c for c in criteria_eval.get("inclusion_criteria", [])
                    if c["status"] == "NOT_MET"]
            return (f"Requires review. Patient does not clearly meet: "
                   f"{', '.join([u['criterion'].lower() for u in unmet[:2]])}.")
