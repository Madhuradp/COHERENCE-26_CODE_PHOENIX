from typing import Dict, Any, List
from .eligibility_logic import check_eligibility  # We'll define this below

class RuleEngineService:
    """Deterministic matching engine using clinical parameters"""
    
    def analyze_eligibility(self, patient: Dict, trial: Dict) -> Dict:
        # 1. Check if we have structured data for this trial
        structured_criteria = trial.get("structured_eligibility")
        
        if not structured_criteria:
            return {
                "status": "REVIEW_NEEDED",
                "confidence": 0.4,
                "reasoning": "Trial criteria not structured. Manual review required.",
                "criteria_met": [],
                "criteria_failed": []
            }

        # 2. Run the logic comparison
        result = check_eligibility(patient, structured_criteria)
        
        # 3. Format the response to match the system expectations
        return {
            "status": "ELIGIBLE" if result["overall_match"] else "INELIGIBLE",
            "confidence": 1.0,  # Rules are 100% certain based on available data
            "reasoning": "Deterministic rule-match based on patient EMR and trial parameters.",
            "criteria_met": result["passed_checks"],
            "criteria_failed": result["failed_checks"],
            "unclear_checks": result["unclear_checks"]
        }