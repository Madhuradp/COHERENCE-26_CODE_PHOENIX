"""
Eligibility Evaluator Service

Evaluates how a patient matches trial's inclusion and exclusion criteria.
Compares patient data to trial eligibility requirements and provides
transparent, itemized evaluation of each criterion.
"""

from typing import Dict, List, Any, Optional


class EligibilityEvaluator:
    """
    Evaluates trial eligibility by comparing patient data to trial criteria.

    Returns:
    - inclusion_criteria: List of inclusion criteria with patient status
    - exclusion_criteria: List of exclusion criteria with patient status
    - overall_eligibility: ELIGIBLE / INELIGIBLE / REVIEW_NEEDED
    """

    def evaluate_trial_criteria(self, patient: Dict, trial: Dict) -> Dict:
        """
        Main method: Evaluate how patient matches trial criteria.

        Args:
            patient: Patient record with demographics, conditions, meds, labs
            trial: Trial record with structured eligibility criteria

        Returns:
            {
                "inclusion_criteria": [...],
                "exclusion_criteria": [...],
                "overall_eligibility": "ELIGIBLE"|"INELIGIBLE"|"REVIEW_NEEDED"
            }
        """
        structured_criteria = trial.get("structured_eligibility", {})

        # If no structured criteria, return review needed
        if not structured_criteria:
            return {
                "inclusion_criteria": [],
                "exclusion_criteria": [],
                "overall_eligibility": "REVIEW_NEEDED"
            }

        # Evaluate each type of criterion
        inclusions = self._evaluate_inclusions(patient, structured_criteria)
        exclusions = self._evaluate_exclusions(patient, structured_criteria)

        # Determine overall eligibility
        overall = self._compute_overall(inclusions, exclusions)

        return {
            "inclusion_criteria": inclusions,
            "exclusion_criteria": exclusions,
            "overall_eligibility": overall
        }

    def _evaluate_inclusions(self, patient: Dict, criteria: Dict) -> List[Dict]:
        """
        Evaluate inclusion criteria.
        Patient MUST meet these criteria to be eligible.
        """
        inclusions = []

        # 1. Age check
        age = patient.get("demographics", {}).get("age")
        if age is not None:
            min_age = criteria.get("age", {}).get("min_age")
            max_age = criteria.get("age", {}).get("max_age")

            # Determine if age is met
            age_met = True
            if min_age is not None and age < min_age:
                age_met = False
            if max_age is not None and age > max_age:
                age_met = False

            age_range_text = self._format_age_range(min_age, max_age)
            inclusions.append({
                "criterion": f"Age {age_range_text}",
                "patient_value": age,
                "status": "MET" if age_met else "NOT_MET",
                "type": "age"
            })

        # 2. Gender check
        gender = patient.get("demographics", {}).get("gender", "").upper()
        trial_gender = criteria.get("gender", "ALL").upper()
        if trial_gender and trial_gender != "ALL":
            gender_met = gender == trial_gender or trial_gender == "ALL"
            inclusions.append({
                "criterion": f"Gender: {trial_gender}",
                "patient_value": gender,
                "status": "MET" if gender_met else "NOT_MET",
                "type": "gender"
            })

        # 3. Condition checks (required conditions)
        patient_conditions = [
            c.get("name", "").lower()
            for c in patient.get("conditions", []) or []
        ]

        for cond in criteria.get("conditions", []) or []:
            if cond.get("requirement") == "required":
                has_condition = any(
                    cond["condition"].lower() in pc
                    for pc in patient_conditions
                )
                inclusions.append({
                    "criterion": f"Diagnosis: {cond['condition']}",
                    "patient_has": has_condition,
                    "status": "MET" if has_condition else "NOT_MET",
                    "type": "condition"
                })

        # 4. Lab value checks
        for lab in criteria.get("lab_values", []) or []:
            patient_lab_value = self._get_patient_lab_value(patient, lab["test_name"])
            lab_met = self._check_lab_constraint(patient_lab_value, lab)

            lab_text = f"{lab['test_name']} {lab['operator']} {lab['value']}"
            if lab.get("unit"):
                lab_text += f" {lab['unit']}"

            inclusions.append({
                "criterion": lab_text,
                "patient_value": patient_lab_value,
                "status": "MET" if lab_met else "NOT_MET",
                "type": "lab"
            })

        return inclusions

    def _evaluate_exclusions(self, patient: Dict, criteria: Dict) -> List[Dict]:
        """
        Evaluate exclusion criteria.
        Patient MUST NOT have these to be eligible.
        """
        exclusions = []

        # 1. Medication exclusions
        patient_meds = [
            m.get("name", "").lower()
            for m in patient.get("medications", []) or []
        ]

        for med in criteria.get("medications", []) or []:
            if med.get("requirement") == "excluded":
                has_med = any(
                    med["medication"].lower() in pm
                    for pm in patient_meds
                )
                exclusions.append({
                    "criterion": f"Cannot use: {med['medication']}",
                    "patient_has": has_med,
                    "status": "NOT_EXCLUDED" if not has_med else "EXCLUDED",
                    "type": "medication"
                })

        # 2. Pregnancy exclusion
        preg = criteria.get("pregnancy", {})
        if preg.get("excluded", False):
            is_pregnant = (
                patient.get("demographics", {}).get("pregnancy_status", "").lower() == "pregnant"
            )
            is_nursing = (
                patient.get("demographics", {}).get("nursing_status", "").lower() == "nursing"
            )
            has_pregnancy_issue = is_pregnant or is_nursing

            exclusions.append({
                "criterion": "Cannot be pregnant or nursing",
                "patient_status": "pregnant/nursing" if has_pregnancy_issue else "not pregnant/nursing",
                "status": "NOT_EXCLUDED" if not has_pregnancy_issue else "EXCLUDED",
                "type": "pregnancy"
            })

        # 3. Performance status exclusion
        perf = criteria.get("performance_status", {})
        if perf.get("max_ecog") is not None:
            patient_ecog = patient.get("clinical_data", {}).get("ecog_score")
            ecog_ok = patient_ecog is None or patient_ecog <= perf["max_ecog"]

            exclusions.append({
                "criterion": f"ECOG score <= {perf['max_ecog']}",
                "patient_value": patient_ecog,
                "status": "NOT_EXCLUDED" if ecog_ok else "EXCLUDED",
                "type": "performance_status"
            })

        # 4. Organ function exclusions
        for organ_func in criteria.get("organ_function_constraints", []) or []:
            organ = organ_func.get("organ", "")
            min_value = organ_func.get("min_value")

            patient_value = patient.get("lab_values", {}).get(organ)
            organ_ok = patient_value is None or patient_value >= min_value

            exclusions.append({
                "criterion": f"{organ} function >= {min_value}",
                "patient_value": patient_value,
                "status": "NOT_EXCLUDED" if organ_ok else "EXCLUDED",
                "type": "organ_function"
            })

        return exclusions

    def _compute_overall(self, inclusions: List[Dict], exclusions: List[Dict]) -> str:
        """
        Determine overall eligibility verdict.

        ELIGIBLE: All inclusions met AND no exclusions
        INELIGIBLE: Any exclusion triggered OR any inclusion not met
        REVIEW_NEEDED: Missing data or unclear criteria
        """
        if not inclusions and not exclusions:
            return "REVIEW_NEEDED"

        # Check inclusions
        inclusions_met = all(i["status"] == "MET" for i in inclusions)
        inclusions_clear = all(i["patient_value"] is not None or i.get("patient_has") is not None for i in inclusions)

        # Check exclusions
        no_exclusions = all(e["status"] == "NOT_EXCLUDED" for e in exclusions)
        exclusions_clear = all(e.get("patient_has") is not None or e.get("patient_value") is not None or e.get("patient_status") is not None for e in exclusions)

        # Determine verdict
        if any(e["status"] == "EXCLUDED" for e in exclusions):
            return "INELIGIBLE"
        elif inclusions_met and no_exclusions:
            return "ELIGIBLE"
        elif not inclusions_clear or not exclusions_clear:
            return "REVIEW_NEEDED"
        else:
            return "REVIEW_NEEDED"

    def _get_patient_lab_value(self, patient: Dict, test_name: str) -> Optional[float]:
        """Extract lab value from patient record."""
        lab_values = patient.get("lab_values", []) or []
        for lab in lab_values:
            if lab.get("test_name", "").lower() == test_name.lower():
                return lab.get("value")
        return None

    def _check_lab_constraint(self, patient_value: Optional[float], constraint: Dict) -> bool:
        """Check if patient lab value meets constraint."""
        if patient_value is None:
            return False

        operator = constraint.get("operator", "==")
        threshold = constraint.get("value", 0)

        if operator == "==":
            return patient_value == threshold
        elif operator == "!=":
            return patient_value != threshold
        elif operator == ">":
            return patient_value > threshold
        elif operator == ">=":
            return patient_value >= threshold
        elif operator == "<":
            return patient_value < threshold
        elif operator == "<=":
            return patient_value <= threshold
        else:
            return False

    def _format_age_range(self, min_age: Optional[int], max_age: Optional[int]) -> str:
        """Format age range as human-readable text."""
        if min_age and max_age:
            return f"{min_age}-{max_age} years"
        elif min_age:
            return f">= {min_age} years"
        elif max_age:
            return f"<= {max_age} years"
        else:
            return "Any age"
