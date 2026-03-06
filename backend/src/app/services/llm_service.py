import json, os
from openai import OpenAI
from typing import Dict

class LLMService:
    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.model = os.getenv("LLM_MODEL", "gpt-4o")

    def analyze_eligibility(self, patient: Dict, trial: Dict) -> Dict:
        prompt = f"""
        Analyze if Patient is eligible for Trial.
        PATIENT: {patient.get('conditions')}, Labs: {patient.get('lab_values')}
        TRIAL CRITERIA: {trial['eligibility']['raw_text']}
        
        Return JSON ONLY:
        {{
            "status": "ELIGIBLE" | "INELIGIBLE" | "REVIEW_NEEDED",
            "confidence": 0.0-1.0,
            "reasoning": "Clinical explanation",
            "criteria_met": [], "criteria_failed": []
        }}
        """
        try:
            res = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"}
            )
            return json.loads(res.choices[0].message.content)
        except Exception as e:
            return {"status": "REVIEW_NEEDED", "reasoning": str(e), "confidence": 0.5}