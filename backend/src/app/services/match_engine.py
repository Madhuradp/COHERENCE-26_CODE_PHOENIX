import logging
from datetime import datetime
from .geo_service import GeoService
from .rule_engine import RuleEngineService  # Replaced LLMService
from .semantic_search import SemanticSearchService
from .training_service import TrainingService

logger = logging.getLogger(__name__)

class MatchingEngine:
    """
    3-Tier Deterministic Matching Pipeline:
    Tier 1: Geospatial + Hard Filters (Age/Location)
    Tier 2: ML Gatekeeper + Semantic Similarity (Clinical Context)
    Tier 3: Parameter Logic Engine (Deterministic Rule Matching - NO OPENAI)
    """

    def __init__(self, use_ml_gatekeeper: bool = True):
        self.geo = GeoService()
        self.rule_engine = RuleEngineService() # Deterministic logic engine
        self.semantic = SemanticSearchService()
        self.use_ml_gatekeeper = use_ml_gatekeeper

        self.ml_service = None
        if use_ml_gatekeeper:
            try:
                self.ml_service = TrainingService(model_type="random_forest")
                if not self.ml_service.load_model():
                    logger.warning("ML model not found. Will skip ML gatekeeper.")
                    self.ml_service = None
            except Exception as e:
                logger.warning(f"Could not initialize ML gatekeeper: {e}")
                self.ml_service = None

    def run_full_pipeline(self, patient: dict, limit: int = 100, verbose: bool = False):
        """
        Run 3-tier matching pipeline without external LLM calls.
        """
        demographics = patient.get("demographics", {}) or {}
        age = demographics.get("age")
        location = demographics.get("location")

        # Extract coordinates for distance calculation
        coords = None
        if isinstance(location, dict) and "coordinates" in location:
            coords = location["coordinates"]

        # ===== TIER 1: GEO + AGE FILTERS (Broad) =====
        if verbose:
            logger.info(f"Tier 1: Geospatial + Hard Filters")
        
        if coords and age is not None:
            candidates = self.geo.find_nearby_trials(coords, age)
        else:
            # Fallback if no location: find any recruiting trials matching age
            candidates = self.geo.find_nearby_trials([0,0], age) # find_nearby handles empty coords internally usually

        tier1_count = len(candidates)

        # ===== TIER 2: ML + SEMANTIC RANKING (Clinical Similarity) =====
        if verbose:
            logger.info(f"Tier 2: Semantic Ranking")

        ranked_with_scores = []
        for trial in candidates:
            sem_score = self.semantic.calculate_semantic_match_score(patient, trial)

            ml_probability = 0.5
            if self.ml_service:
                ml_result = self.ml_service.predict(patient, trial)
                if ml_result["success"]:
                    ml_probability = ml_result["probability"]

            ranked_with_scores.append({
                "trial": trial,
                "semantic_score": sem_score,
                "ml_probability": ml_probability,
                "combined_score": (0.4 * sem_score) + (0.6 * ml_probability) if self.ml_service else sem_score
            })

        ranked_with_scores.sort(key=lambda x: x["combined_score"], reverse=True)
        
        # Take the top N candidates for deep parameter checking
        tier2_candidates = ranked_with_scores[:20] 

        # ===== TIER 3: DETERMINISTIC RULE ANALYSIS (Parameter Match) =====
        if verbose:
            logger.info(f"Tier 3: Rule-Based Logic Analysis")

        final_matches = []
        for item in tier2_candidates:
            if len(final_matches) >= limit:
                break
                
            trial = item["trial"]
            
            # This calls the RuleEngine instead of OpenAI
            analysis = self.rule_engine.analyze_eligibility(patient, trial)

            # Only add to results if it's not a hard failure, or keep all for transparency
            dist = self.geo.calculate_distance(
                coords if coords else [0,0],
                trial["locations"][0] if trial.get("locations") else {"geo": {"coordinates": [0,0]}}
            )

            match_result = {
                "patient_id": str(patient["_id"]),
                "nct_id": trial["nct_id"],
                "status": analysis["status"],
                "confidence_score": analysis["confidence"],
                "explanation": analysis.get("reasoning", ""),
                "criteria_met": analysis.get("criteria_met", []),       
                "criteria_failed": analysis.get("criteria_failed", []), 
                "unclear_checks": analysis.get("unclear_checks", []),
                "distance_km": dist,
                "run_date": datetime.utcnow(),
                "tier2_score": round(item["combined_score"], 2)
            }
            final_matches.append(match_result)

        return final_matches