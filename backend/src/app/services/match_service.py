import os
import json
from openai import OpenAI
from datetime import datetime
from bson import ObjectId
from typing import Dict, Any, List, Optional

from ..core.database import Database
from .criteria_extractor import CriteriaExtractor

_client = None

def get_openai_client():
    global _client
    if _client is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable is not set")
        _client = OpenAI(api_key=api_key)
    return _client

class MatchingService:
    def __init__(self):
        self.db = Database()
        self.criteria_extractor = CriteriaExtractor()

    def find_nearby_candidates(self, patient: dict, radius_km: int = 100):
        """Phase 1: Hard Filter (Geo + Age + Status)"""
        if not patient.get('demographics'):
            return []

        coords = patient['demographics']['location']['coordinates']
        age = patient['demographics']['age']

        query = {
            "status": "RECRUITING",
            "eligibility.min_age": {"$lte": age},
            "$or": [
                {"eligibility.max_age": {"$gte": age}},
                {"eligibility.max_age": None}
            ],
            "locations.geo": {
                "$near": {
                    "$geometry": { "type": "Point", "coordinates": coords },
                    "$maxDistance": radius_km * 1000 
                }
            }
        }
        return list(self.db.clinical_trials.find(query).limit(10))

    def analyze_with_llm(self, patient: dict, trial: dict):
        """Phase 2: AI Analysis"""
        prompt = f"""
        Act as a Clinical Research Coordinator.
        
        PATIENT:
        - Age: {patient['demographics']['age']}
        - Conditions: {[c['name'] for c in patient.get('conditions', [])]}
        - Labs: {[f"{l['name']}: {l['value']}" for l in patient.get('lab_values', [])]}
        - Notes: {patient.get('clinical_notes_text', 'N/A')}

        TRIAL CRITERIA:
        {trial['eligibility']['raw_text']}

        TASK:
        Compare strictly. Return JSON ONLY:
        {{
            "status": "ELIGIBLE" (or "INELIGIBLE", "REVIEW_NEEDED"),
            "confidence": 0.0 to 1.0,
            "summary": "1 sentence explanation",
            "criteria_met": ["list of strings"],
            "criteria_failed": ["list of strings"],
            "warnings": ["list of strings"]
        }}
        """

        try:
            response = get_openai_client().chat.completions.create(
                model="gpt-4o",
                response_format={ "type": "json_object" },
                messages=[{"role": "user", "content": prompt}]
            )
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            print(f"LLM Error: {e}")
            return {"status": "REVIEW_NEEDED", "confidence": 0.0, "summary": "AI Error", "analysis": {}}

    def filter_by_structured_criteria(
        self,
        patient: Dict[str, Any],
        candidates: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Tier 1.5: Filter candidates using structured eligibility criteria.
        Faster and cheaper than LLM analysis, more intelligent than age/location only.
        """
        filtered = []

        for trial in candidates:
            structured_criteria = trial.get("structured_eligibility")
            if not structured_criteria:
                # No structured criteria, pass through to LLM
                filtered.append(trial)
                continue

            # Check patient against structured criteria
            eligibility_check = self.criteria_extractor.check_patient_eligibility(
                patient,
                # Convert dict to StructuredEligibility object if needed
                structured_criteria
            )

            # Only pass if no failed checks
            if eligibility_check["overall_match"]:
                filtered.append(trial)

        return filtered

    def save_match_result(self, patient_id, trial_id, analysis, distance):
        record = {
            "patient_id": str(patient_id),
            "nct_id": trial_id,
            "run_date": datetime.utcnow(),
            "status": analysis.get('status', 'REVIEW_NEEDED'),
            "confidence_score": analysis.get('confidence', 0),
            "analysis": analysis,
            "distance_km": distance
        }
        result = self.db.db.match_results.insert_one(record)
        record['_id'] = str(result.inserted_id)
        return record