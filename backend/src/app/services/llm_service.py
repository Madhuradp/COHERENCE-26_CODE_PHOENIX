import json, os, re
from typing import Dict


class LLMService:
    def __init__(self):
        self._openai_client = None
        api_key = os.getenv("OPENAI_API_KEY", "")
        if api_key and api_key not in ("your_openai_api_key_here", ""):
            try:
                from openai import OpenAI
                self._openai_client = OpenAI(api_key=api_key)
                self.model = os.getenv("LLM_MODEL", "gpt-4o")
            except Exception:
                pass

    def analyze_eligibility(self, patient: Dict, trial: Dict) -> Dict:
        if self._openai_client:
            return self._analyze_with_llm(patient, trial)
        return self._analyze_rule_based(patient, trial)

    def _analyze_with_llm(self, patient: Dict, trial: Dict) -> Dict:
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
            res = self._openai_client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"}
            )
            return json.loads(res.choices[0].message.content)
        except Exception:
            return self._analyze_rule_based(patient, trial)

    def _analyze_rule_based(self, patient: Dict, trial: Dict) -> Dict:
        """Rule-based eligibility analysis used when OpenAI is not configured."""
        criteria_met = []
        criteria_failed = []
        score = 0.5

        demographics = patient.get("demographics", {}) or {}
        age = demographics.get("age") if isinstance(demographics, dict) else None

        eligibility = trial.get("eligibility", {}) or {}
        min_age = eligibility.get("min_age")
        max_age = eligibility.get("max_age")

        # Age check
        if age is not None:
            if min_age is not None and int(age) < int(min_age):
                criteria_failed.append(f"Age {age} below minimum required age {min_age}")
                score -= 0.35
            elif max_age is not None and int(age) > int(max_age):
                criteria_failed.append(f"Age {age} above maximum allowed age {max_age}")
                score -= 0.35
            else:
                criteria_met.append(f"Age {age} is within the eligible range")
                score += 0.1

        # Condition match
        patient_conditions = [
            c.get("name", "").lower()
            for c in (patient.get("conditions") or [])
            if c.get("name")
        ]
        trial_conditions = [c.lower() for c in (trial.get("conditions") or [])]

        matched = []
        for pc in patient_conditions:
            pc_words = [w for w in pc.split() if len(w) > 3]
            for tc in trial_conditions:
                if pc in tc or tc in pc or any(w in tc for w in pc_words):
                    matched.append(pc)
                    break

        if matched:
            criteria_met.append(f"Condition match: {', '.join(matched)}")
            score += 0.3
        elif patient_conditions and trial_conditions:
            criteria_failed.append("No direct condition overlap found")
            score -= 0.1

        # Smoking status check (if trial eligibility text mentions it)
        raw_text = (eligibility.get("raw_text") or "").lower()
        lab_values = patient.get("lab_values") or []
        smoking_entry = next((l for l in lab_values if l.get("name", "").lower() == "smoking status"), None)
        if smoking_entry and "smoker" in raw_text:
            val = str(smoking_entry.get("value", "")).lower()
            if "non-smoker" in raw_text and val == "smoker":
                criteria_failed.append("Patient is a smoker; trial requires non-smokers")
                score -= 0.2
            else:
                criteria_met.append("Smoking status compatible with trial criteria")

        # Clamp score
        score = round(max(0.1, min(0.95, score)), 2)

        if score >= 0.65:
            status = "ELIGIBLE"
        elif score >= 0.35:
            status = "REVIEW_NEEDED"
        else:
            status = "INELIGIBLE"

        reasoning = (
            f"Rule-based analysis: {len(criteria_met)} criteria met, "
            f"{len(criteria_failed)} criteria failed. "
            f"Confidence: {score}."
        )

        return {
            "status": status,
            "confidence": score,
            "reasoning": reasoning,
            "criteria_met": criteria_met,
            "criteria_failed": criteria_failed,
            "warnings": ["Automated rule-based analysis — configure OPENAI_API_KEY for AI-powered matching"],
        }
