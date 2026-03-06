import logging
from .geo_service import GeoService
from .llm_service import LLMService
from .semantic_search import SemanticSearchService
from .training_service import TrainingService
from datetime import datetime

logger = logging.getLogger(__name__)


class MatchingEngine:
    """
    3-Tier Matching Pipeline:
    Tier 1: Geospatial + Hard Filters (fast, broad)
    Tier 2: ML Gatekeeper + Semantic Ranking (medium, intelligent pre-filtering)
    Tier 3: LLM Analysis (slow, deep reasoning on top candidates)
    """

    def __init__(self, use_ml_gatekeeper: bool = True):
        self.geo = GeoService()
        self.llm = LLMService()
        self.semantic = SemanticSearchService()
        self.use_ml_gatekeeper = use_ml_gatekeeper

        # Initialize ML gatekeeper if enabled
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

    def run_full_pipeline(self, patient: dict, limit: int = 5, verbose: bool = False):
        """
        Run 3-tier matching pipeline with optional verbose logging

        Args:
            patient: Patient document from MongoDB
            limit: Max trials to return
            verbose: Log each tier's filtering results

        Returns:
            List of match result dictionaries
        """
        demographics = patient.get("demographics", {}) or {}
        age = demographics.get("age") if isinstance(demographics, dict) else None
        location = demographics.get("location") if isinstance(demographics, dict) else None

        # Location may be GeoJSON {"coordinates": [lon, lat]} or plain string city name
        if isinstance(location, dict) and "coordinates" in location:
            coords = location["coordinates"]
        elif isinstance(location, list) and len(location) == 2:
            coords = location
        else:
            coords = None  # string like "Mumbai" — skip geo query

        # ===== TIER 1: GEO + HARD FILTERS (Broad) =====
        if verbose:
            logger.info(f"Tier 1: Geospatial + Hard Filters")
        city_name = location if isinstance(location, str) else None

        if coords is not None and age is not None:
            candidates = self.geo.find_nearby_trials(coords, age)
        else:
            candidates = self.geo.find_all_recruiting_trials(age, city_name=city_name)
        tier1_count = len(candidates)
        if verbose:
            logger.info(f"  Tier 1 result: {tier1_count} candidates")

        # ===== TIER 2: ML GATEKEEPER + SEMANTIC RANKING (Intelligent) =====
        if verbose:
            logger.info(f"Tier 2: ML Gatekeeper + Semantic Ranking")

        ranked_with_scores = []
        for trial in candidates:
            # Calculate semantic similarity
            sem_score = self.semantic.calculate_semantic_match_score(patient, trial)

            # ML prediction if model available
            ml_prediction = None
            ml_probability = 0.5
            if self.ml_service:
                ml_result = self.ml_service.predict(patient, trial)
                if ml_result["success"]:
                    ml_prediction = ml_result["prediction"]
                    ml_probability = ml_result["probability"]

            ranked_with_scores.append({
                "trial": trial,
                "semantic_score": sem_score,
                "ml_probability": ml_probability,
                "ml_prediction": ml_prediction,
                # Combined score: weight semantic + ML
                "combined_score": (0.4 * sem_score) + (0.6 * ml_probability) if self.ml_service else sem_score
            })

        # Sort by combined score and filter to top candidates
        ranked_with_scores.sort(key=lambda x: x["combined_score"], reverse=True)

        # Apply ML threshold if available (only send high-confidence to LLM)
        if self.ml_service:
            # Filter to trials with either good ML score OR good semantic score
            tier2_candidates = [
                r for r in ranked_with_scores
                if r["ml_probability"] > 0.3 or r["semantic_score"] > 0.4
            ]
        else:
            # Fallback to semantic ranking only
            tier2_candidates = ranked_with_scores

        tier2_count = len(tier2_candidates)
        if verbose:
            logger.info(f"  Tier 2 result: {tier2_count} candidates after gating")

        # ===== TIER 3: LLM ANALYSIS (Deep) =====
        if verbose:
            logger.info(f"Tier 3: LLM Deep Analysis")

        final_matches = []
        for item in tier2_candidates[:limit]:
            trial = item["trial"]
            try:
                analysis = self.llm.analyze_eligibility(patient, trial)

                # Calculate distance for the specific site
                if coords is not None:
                    dist = self.geo.calculate_distance(
                        coords,
                        trial["locations"][0] if trial.get("locations") else {"geo": {"coordinates": coords}}
                    )
                else:
                    dist = None

                match_result = {
                    "patient_id": str(patient["_id"]),
                    "nct_id": trial["nct_id"],
                    "status": analysis["status"],
                    "confidence_score": analysis["confidence"],
                    "explanation": analysis.get("reasoning", ""),
                    "distance_km": dist,
                    "run_date": datetime.utcnow(),
                    # Store tier scores for analysis
                    "tier2_semantic_score": item["semantic_score"],
                    "tier2_ml_probability": item["ml_probability"],
                }
                final_matches.append(match_result)
            except Exception as e:
                logger.error(f"Error in LLM analysis for trial {trial.get('nct_id')}: {e}")
                continue

        if verbose:
            logger.info(f"  Tier 3 result: {len(final_matches)} matches after LLM analysis")
            logger.info(f"Funnel: {tier1_count} → {tier2_count} → {len(final_matches)}")

        return final_matches