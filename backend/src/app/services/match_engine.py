from .geo_service import GeoService
from .llm_service import LLMService
from .semantic_search import SemanticSearchService
from datetime import datetime

class MatchingEngine:
    def __init__(self):
        self.geo = GeoService()
        self.llm = LLMService()
        self.semantic = SemanticSearchService()

    def run_full_pipeline(self, patient: dict, limit: int = 5):
        # Tier 1: Geo + Age Filter
        coords = patient["demographics"]["location"]["coordinates"]
        age = patient["demographics"]["age"]
        candidates = self.geo.find_nearby_trials(coords, age)

        # Tier 2: Semantic Ranking
        # Note: SemanticSearchService should have a ranking method
        ranked = self.semantic.rank_trials(patient, candidates)

        # Tier 3: LLM Analysis
        final_matches = []
        for trial in ranked[:limit]:
            analysis = self.llm.analyze_eligibility(patient, trial)
            
            # Calculate distance for the specific site
            dist = self.geo.calculate_distance(coords, trial["locations"][0])

            final_matches.append({
                "patient_id": str(patient["_id"]),
                "nct_id": trial["nct_id"],
                "status": analysis["status"],
                "confidence_score": analysis["confidence"],
                "explanation": analysis["reasoning"],
                "distance_km": dist,
                "run_date": datetime.utcnow()
            })
        return final_matches