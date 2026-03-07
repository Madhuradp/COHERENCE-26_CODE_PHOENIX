"""
Dynamic Test Engine

Automatically generates test cases using:
- Real clinical trial data from API or database
- Uploaded patient data from database
- Runs matching pipeline against all combinations
- Generates comprehensive test reports
"""

from typing import Dict, List, Any, Optional
from datetime import datetime
from .match_engine import MatchingEngine
from .trial_matcher import TrialMatcher
from ..core.database import Database
import logging

logger = logging.getLogger(__name__)


class DynamicTestEngine:
    """
    Generates and runs dynamic tests using real data:
    - Clinical trials from database
    - Patient data from uploads
    - Creates test scenarios automatically
    - Generates results and reports
    """

    def __init__(self):
        self.db = Database()
        self.match_engine = MatchingEngine()
        self.trial_matcher = TrialMatcher()

    def run_dynamic_tests(
        self,
        state: str = "Maharashtra",
        limit_trials: int = 10,
        limit_patients: int = 5
    ) -> Dict[str, Any]:
        """
        Run dynamic tests against real data.

        Args:
            state: State filter for trials
            limit_trials: Max trials to test
            limit_patients: Max patients to test

        Returns:
            {
                "test_run_id": "...",
                "timestamp": "2024-03-07T10:30:00",
                "summary": {...},
                "test_cases": [...],
                "statistics": {...}
            }
        """
        test_run_id = self._generate_test_run_id()

        # 1. Get available data
        trials = self._get_available_trials(state, limit_trials)
        patients = self._get_available_patients(limit_patients)

        if not trials or not patients:
            return {
                "error": "Insufficient data for testing",
                "available_trials": len(trials),
                "available_patients": len(patients)
            }

        # 2. Generate test cases
        test_cases = self._generate_test_cases(patients, trials)

        # 3. Run tests
        results = self._execute_test_cases(test_cases)

        # 4. Compute statistics
        statistics = self._compute_statistics(results)

        return {
            "success": True,
            "test_run_id": test_run_id,
            "timestamp": datetime.utcnow().isoformat(),
            "summary": {
                "total_test_cases": len(results),
                "passed": sum(1 for r in results if r["status"] == "PASSED"),
                "eligible_matches": sum(1 for r in results if r["overall_eligibility"] == "ELIGIBLE"),
                "ineligible_matches": sum(1 for r in results if r["overall_eligibility"] == "INELIGIBLE"),
                "review_needed": sum(1 for r in results if r["overall_eligibility"] == "REVIEW_NEEDED"),
            },
            "test_cases": results,
            "statistics": statistics,
            "data_summary": {
                "trials_tested": len(trials),
                "patients_tested": len(patients),
                "state_filter": state
            }
        }

    def run_specific_patient_tests(
        self,
        patient_id: str,
        state: str = "Maharashtra",
        limit_trials: int = 20
    ) -> Dict[str, Any]:
        """
        Run tests for a specific patient against available trials.

        Args:
            patient_id: Patient ObjectId
            state: State filter
            limit_trials: Max trials to test

        Returns:
            Test results for specific patient
        """
        patient = self.db.patients.find_one({"_id": self.db.ObjectId(patient_id) if isinstance(patient_id, str) else patient_id})
        if not patient:
            return {"error": "Patient not found"}

        trials = self._get_available_trials(state, limit_trials)
        if not trials:
            return {"error": "No trials available"}

        # Run tests
        results = []
        for trial in trials:
            test_result = self._run_single_test(patient, trial)
            results.append(test_result)

        # Sort by fit score
        results.sort(key=lambda x: x.get("fit_score", {}).get("overall_fit", 0), reverse=True)

        return {
            "success": True,
            "patient_id": str(patient_id),
            "patient_age": patient.get("demographics", {}).get("age"),
            "patient_gender": patient.get("demographics", {}).get("gender"),
            "state_filter": state,
            "total_trials_tested": len(results),
            "results": results,
            "summary": self._compute_patient_test_summary(results)
        }

    def _get_available_trials(self, state: str, limit: int) -> List[Dict]:
        """Get available trial data from database."""
        query = {
            "status": "RECRUITING",
            "locations.state": {"$in": [state, state.upper(), state.lower()]}
        }
        trials = list(self.db.trials.find(query).limit(limit))
        logger.info(f"Found {len(trials)} recruiting trials in {state}")
        return trials

    def _get_available_patients(self, limit: int) -> List[Dict]:
        """Get available patient data from database."""
        patients = list(self.db.patients.find({}).limit(limit))
        logger.info(f"Found {len(patients)} patients for testing")
        return patients

    def _generate_test_cases(self, patients: List[Dict], trials: List[Dict]) -> List[Dict]:
        """Generate test cases from patient-trial combinations."""
        test_cases = []

        for patient in patients:
            for trial in trials:
                test_case = {
                    "patient_id": str(patient.get("_id", "")),
                    "trial_id": trial.get("nct_id"),
                    "patient_age": patient.get("demographics", {}).get("age"),
                    "patient_gender": patient.get("demographics", {}).get("gender"),
                    "patient_conditions": [c.get("name") for c in patient.get("conditions", [])],
                    "trial_title": trial.get("title"),
                    "trial_phase": trial.get("phase"),
                }
                test_cases.append(test_case)

        logger.info(f"Generated {len(test_cases)} test cases")
        return test_cases

    def _execute_test_cases(self, test_cases: List[Dict]) -> List[Dict]:
        """Execute test cases and collect results."""
        results = []

        for test_case in test_cases:
            # Get patient and trial
            patient = self.db.patients.find_one({"_id": self.db.ObjectId(test_case["patient_id"])})
            trial = self.db.trials.find_one({"nct_id": test_case["trial_id"]})

            if not patient or not trial:
                continue

            # Run test
            test_result = self._run_single_test(patient, trial)
            results.append(test_result)

        logger.info(f"Executed {len(results)} test cases")
        return results

    def _run_single_test(self, patient: Dict, trial: Dict) -> Dict:
        """Run a single patient-trial test."""
        try:
            # Use TrialMatcher for detailed analysis
            matching_analysis = self.trial_matcher.match_patient_to_trial(patient, trial)

            return {
                "patient_id": str(patient.get("_id", "")),
                "patient_age": patient.get("demographics", {}).get("age"),
                "patient_gender": patient.get("demographics", {}).get("gender"),
                "trial_id": trial.get("nct_id"),
                "trial_title": trial.get("title"),
                "trial_phase": trial.get("phase"),
                "trial_sponsor": trial.get("sponsor"),

                # Eligibility
                "overall_eligibility": matching_analysis["eligibility_evaluation"]["overall_eligibility"],
                "inclusion_criteria": matching_analysis["eligibility_evaluation"]["inclusion_criteria"],
                "exclusion_criteria": matching_analysis["eligibility_evaluation"]["exclusion_criteria"],

                # Mapping
                "patient_data": matching_analysis["patient_data"],
                "trial_criteria": matching_analysis["trial_criteria"],
                "mapping_analysis": matching_analysis["mapping"],

                # Fit Score
                "fit_score": matching_analysis["overall_fit"],
                "explanation": matching_analysis["explanation"],

                # Test Status
                "status": "PASSED",
                "test_timestamp": datetime.utcnow().isoformat(),
            }

        except Exception as e:
            logger.error(f"Test failed for {patient.get('_id')} vs {trial.get('nct_id')}: {str(e)}")
            return {
                "patient_id": str(patient.get("_id", "")),
                "trial_id": trial.get("nct_id"),
                "status": "FAILED",
                "error": str(e),
                "test_timestamp": datetime.utcnow().isoformat(),
            }

    def _compute_statistics(self, results: List[Dict]) -> Dict:
        """Compute statistics from test results."""
        passed = [r for r in results if r.get("status") == "PASSED"]
        failed = [r for r in results if r.get("status") == "FAILED"]

        if not passed:
            return {
                "total_tests": len(results),
                "passed_tests": 0,
                "failed_tests": len(failed),
                "pass_rate": 0.0,
                "fit_scores": {
                    "average": 0,
                    "min": 0,
                    "max": 0
                }
            }

        fit_scores = [r.get("fit_score", {}).get("overall_fit", 0) for r in passed]
        eligible_count = sum(1 for r in passed if r.get("overall_eligibility") == "ELIGIBLE")
        ineligible_count = sum(1 for r in passed if r.get("overall_eligibility") == "INELIGIBLE")
        review_count = sum(1 for r in passed if r.get("overall_eligibility") == "REVIEW_NEEDED")

        return {
            "total_tests": len(results),
            "passed_tests": len(passed),
            "failed_tests": len(failed),
            "pass_rate": round(len(passed) / len(results) * 100, 2) if results else 0,
            "fit_scores": {
                "average": round(sum(fit_scores) / len(fit_scores), 2) if fit_scores else 0,
                "min": min(fit_scores) if fit_scores else 0,
                "max": max(fit_scores) if fit_scores else 0,
            },
            "eligibility_breakdown": {
                "eligible": eligible_count,
                "ineligible": ineligible_count,
                "review_needed": review_count,
            }
        }

    def _compute_patient_test_summary(self, results: List[Dict]) -> Dict:
        """Compute summary for patient-specific tests."""
        eligible = [r for r in results if r.get("overall_eligibility") == "ELIGIBLE"]
        ineligible = [r for r in results if r.get("overall_eligibility") == "INELIGIBLE"]
        review = [r for r in results if r.get("overall_eligibility") == "REVIEW_NEEDED"]

        return {
            "total_trials": len(results),
            "eligible_count": len(eligible),
            "ineligible_count": len(ineligible),
            "review_needed_count": len(review),
            "best_match": max(results, key=lambda x: x.get("fit_score", {}).get("overall_fit", 0)) if results else None,
            "worst_match": min(results, key=lambda x: x.get("fit_score", {}).get("overall_fit", 100)) if results else None,
        }

    def _generate_test_run_id(self) -> str:
        """Generate unique test run ID."""
        import uuid
        return f"TEST-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{str(uuid.uuid4())[:8]}"

    def get_test_history(self, limit: int = 10) -> List[Dict]:
        """Get test execution history."""
        # This would retrieve from a test_results collection
        test_results = list(self.db.test_results.find({}).sort("timestamp", -1).limit(limit))
        for result in test_results:
            result["_id"] = str(result.get("_id", ""))
        return test_results

    def save_test_results(self, test_results: Dict) -> str:
        """Save test results to database."""
        try:
            result = self.db.test_results.insert_one({
                **test_results,
                "saved_at": datetime.utcnow()
            })
            return str(result.inserted_id)
        except Exception as e:
            logger.error(f"Failed to save test results: {str(e)}")
            return None
