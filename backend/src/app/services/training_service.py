"""
ML Model Training Service - Gatekeeper for Tier 2→3 Transition
Trains lightweight classifier to score trial eligibility before expensive LLM analysis.
Uses RandomForest or XGBoost to learn from existing match_results labels.
"""

import logging
from typing import Dict, List, Any, Tuple, Optional
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
import joblib

from ..core.database import Database
from .semantic_search import SemanticSearchService

logger = logging.getLogger(__name__)


class TrainingService:
    """
    ML Model Training Service
    Trains lightweight classifier to score trial eligibility before LLM analysis.
    Learns from MongoDB match_results labels (ELIGIBLE/INELIGIBLE).
    """

    def __init__(self, model_type: str = "random_forest"):
        """
        Initialize training service

        Args:
            model_type: "random_forest" or "gradient_boosting"
        """
        self.db = Database()
        self.semantic = SemanticSearchService()
        self.model_type = model_type
        self.model = None
        self.scaler = StandardScaler()
        self.feature_names = []

        # Model persistence
        self.model_path = Path(__file__).parent.parent.parent / "models" / f"{model_type}_gatekeeper.joblib"
        self.model_path.parent.mkdir(parents=True, exist_ok=True)

    def load_training_data(self) -> Tuple[pd.DataFrame, pd.Series]:
        """
        Load training data from MongoDB match_results

        Returns:
            Tuple of (features_dataframe, labels_series)
        """
        logger.info("Loading training data from MongoDB...")

        # Load matches with clear labels (exclude REVIEW_NEEDED which are ambiguous)
        matches = list(self.db.matches.find({
            "status": {"$in": ["ELIGIBLE", "INELIGIBLE"]}
        }))

        if not matches:
            logger.warning("No match results found in database")
            return pd.DataFrame(), pd.Series()

        logger.info(f"Loaded {len(matches)} match records")

        data_rows = []
        for match in matches:
            try:
                # Get patient and trial documents
                patient = self.db.patients.find_one({"_id": match["patient_id"]})
                trial = self.db.trials.find_one({"nct_id": match["nct_id"]})

                if not patient or not trial:
                    continue

                # Engineer features
                features = self._engineer_features(patient, trial, match)
                if features:
                    data_rows.append(features)
            except Exception as e:
                logger.warning(f"Error processing match {match.get('nct_id')}: {e}")
                continue

        if not data_rows:
            logger.error("No valid training data generated")
            return pd.DataFrame(), pd.Series()

        df = pd.DataFrame(data_rows)

        # Extract labels and ensure numeric
        labels = df.pop("label").astype(int)

        # Store feature names for later predictions
        self.feature_names = df.columns.tolist()

        logger.info(f"Generated {len(df)} training samples with {len(self.feature_names)} features")
        logger.info(f"Feature names: {self.feature_names}")
        logger.info(f"Class distribution:\n{labels.value_counts()}")

        return df, labels

    def _engineer_features(
        self,
        patient: Dict[str, Any],
        trial: Dict[str, Any],
        match: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Engineer features from patient, trial, and match data

        Args:
            patient: Patient document from MongoDB
            trial: Trial document from MongoDB
            match: Match result document from MongoDB

        Returns:
            Dictionary of features or None if error
        """
        try:
            features = {}

            # ===== DEMOGRAPHIC FEATURES =====
            patient_age = patient.get("demographics", {}).get("age")
            trial_eligibility = trial.get("eligibility", {})
            trial_min_age = trial_eligibility.get("min_age")
            trial_max_age = trial_eligibility.get("max_age")

            if patient_age is None:
                return None

            features["patient_age"] = patient_age
            features["trial_min_age"] = trial_min_age if trial_min_age else 18
            features["trial_max_age"] = trial_max_age if trial_max_age else 120

            # Age compatibility features
            if trial_min_age:
                features["age_meets_min"] = 1 if patient_age >= trial_min_age else 0
                features["age_delta_from_min"] = max(0, trial_min_age - patient_age)
            else:
                features["age_meets_min"] = 1
                features["age_delta_from_min"] = 0

            if trial_max_age:
                features["age_meets_max"] = 1 if patient_age <= trial_max_age else 0
                features["age_delta_from_max"] = max(0, patient_age - trial_max_age)
            else:
                features["age_meets_max"] = 1
                features["age_delta_from_max"] = 0

            # ===== CONDITION FEATURES =====
            patient_conditions = set(
                c.get("name", "").lower()
                for c in patient.get("conditions", [])
                if c.get("name")
            )
            trial_conditions = set(
                c.lower()
                for c in trial.get("conditions", [])
            )

            condition_overlap = len(patient_conditions & trial_conditions)
            max_conditions = max(len(patient_conditions), len(trial_conditions), 1)

            features["condition_overlap_count"] = condition_overlap
            features["condition_overlap_ratio"] = condition_overlap / max_conditions
            features["num_patient_conditions"] = len(patient_conditions)
            features["num_trial_conditions"] = len(trial_conditions)

            # ===== LAB FEATURES =====
            lab_compatibility = self._calculate_lab_compatibility(patient, trial)
            features["lab_compatibility_score"] = lab_compatibility

            # ===== MEDICATION FEATURES =====
            patient_meds = set(
                m.get("name", "").lower()
                for m in patient.get("medications", [])
                if m.get("name")
            )
            features["num_active_medications"] = len(patient_meds)

            # ===== TRIAL CHARACTERISTICS =====
            features["trial_phase_encoded"] = self._encode_phase(trial.get("phase"))
            features["trial_status_encoded"] = self._encode_status(trial.get("status"))

            enrollment = trial.get("enrollment")
            features["trial_enrollment_log"] = np.log(enrollment + 1) if enrollment else 0
            features["num_trial_locations"] = len(trial.get("locations", []))

            # ===== SEMANTIC SIMILARITY =====
            # Try to get from match document or calculate
            if "semantic_similarity" in match and match["semantic_similarity"]:
                features["semantic_similarity"] = match["semantic_similarity"]
            else:
                try:
                    features["semantic_similarity"] = self.semantic.calculate_semantic_match_score(patient, trial)
                except Exception as e:
                    logger.debug(f"Could not calculate semantic similarity: {e}")
                    features["semantic_similarity"] = 0.5  # Neutral default

            # ===== LABEL =====
            status_map = {"ELIGIBLE": 1, "INELIGIBLE": 0, "REVIEW_NEEDED": 0}
            features["label"] = status_map.get(match.get("status", "INELIGIBLE"), 0)

            return features

        except Exception as e:
            logger.error(f"Error engineering features: {e}")
            return None

    def _calculate_lab_compatibility(
        self,
        patient: Dict[str, Any],
        trial: Dict[str, Any]
    ) -> float:
        """
        Calculate numeric lab compatibility score (0-1)

        Args:
            patient: Patient document
            trial: Trial document

        Returns:
            Compatibility score
        """
        try:
            patient_labs = {
                lab.get("name", "").lower(): lab.get("value")
                for lab in patient.get("lab_values", [])
                if lab.get("value") is not None
            }

            if not patient_labs:
                return 0.5  # Neutral if no labs

            # Check trial structured eligibility constraints
            structured = trial.get("structured_eligibility", {})
            if not structured:
                return 0.5  # Can't verify without structured data

            lab_constraints = structured.get("lab_values", [])
            if not lab_constraints:
                return 0.5

            # Count labs that match trial requirements
            matches = 0
            for constraint in lab_constraints:
                test_name = constraint.get("test_name", "").lower()
                if test_name in patient_labs:
                    matches += 1

            # Ratio of matched labs to required labs
            score = matches / len(lab_constraints) if lab_constraints else 0.5
            return min(score, 1.0)

        except Exception as e:
            logger.warning(f"Error calculating lab compatibility: {e}")
            return 0.5

    def _encode_phase(self, phase: Optional[str]) -> float:
        """Encode trial phase as numeric value"""
        if not phase:
            return 0.0
        phase_lower = str(phase).lower()
        phase_map = {
            "phase 0": 0.0,
            "phase 1": 0.25,
            "phase 2": 0.5,
            "phase 3": 0.75,
            "phase 4": 1.0
        }
        return phase_map.get(phase_lower, 0.0)

    def _encode_status(self, status: Optional[str]) -> float:
        """Encode trial recruitment status as numeric value"""
        if not status:
            return 0.0
        status_lower = str(status).lower().replace(" ", "_")
        status_map = {
            "recruiting": 1.0,
            "active_not_recruiting": 0.6,
            "enrolling_by_invitation": 0.4,
            "not_yet_recruiting": 0.2,
            "completed": 0.0,
            "suspended": 0.0,
            "terminated": 0.0,
            "withdrawn": 0.0
        }
        return status_map.get(status_lower, 0.0)

    def train(
        self,
        test_size: float = 0.2,
        random_state: int = 42,
        save: bool = True
    ) -> Dict[str, Any]:
        """
        Train the classifier model

        Args:
            test_size: Fraction of data for testing
            random_state: Random seed for reproducibility
            save: Whether to save the model to disk

        Returns:
            Dictionary with training metrics and status
        """
        logger.info(f"Starting training with {self.model_type}...")

        # Load and prepare data
        X, y = self.load_training_data()

        if X.empty:
            return {
                "success": False,
                "error": "No training data available",
                "metrics": {}
            }

        # Check class balance
        if len(y.unique()) < 2:
            logger.warning("Only one class in training data")
            return {
                "success": False,
                "error": "Need both ELIGIBLE and INELIGIBLE samples to train",
                "metrics": {}
            }

        # Handle missing values
        X = X.fillna(X.mean(numeric_only=True))

        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y,
            test_size=test_size,
            random_state=random_state,
            stratify=y
        )

        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)

        # Build model
        if self.model_type == "random_forest":
            self.model = RandomForestClassifier(
                n_estimators=100,
                max_depth=15,
                min_samples_split=5,
                min_samples_leaf=2,
                random_state=random_state,
                n_jobs=-1,
                class_weight="balanced"
            )
        elif self.model_type == "gradient_boosting":
            self.model = GradientBoostingClassifier(
                n_estimators=100,
                learning_rate=0.1,
                max_depth=5,
                random_state=random_state
            )
        else:
            return {"success": False, "error": f"Unknown model type: {self.model_type}"}

        # Train
        logger.info(f"Training on {len(X_train)} samples...")
        self.model.fit(X_train_scaled, y_train)

        # Evaluate
        y_pred_train = self.model.predict(X_train_scaled)
        y_pred_test = self.model.predict(X_test_scaled)
        y_pred_proba = self.model.predict_proba(X_test_scaled)[:, 1]

        metrics = {
            "train_accuracy": float(accuracy_score(y_train, y_pred_train)),
            "test_accuracy": float(accuracy_score(y_test, y_pred_test)),
            "precision": float(precision_score(y_test, y_pred_test, zero_division=0)),
            "recall": float(recall_score(y_test, y_pred_test, zero_division=0)),
            "f1": float(f1_score(y_test, y_pred_test, zero_division=0)),
            "roc_auc": float(roc_auc_score(y_test, y_pred_proba)) if len(y_test.unique()) > 1 else 0.0,
            "train_size": len(X_train),
            "test_size": len(X_test),
            "feature_count": len(self.feature_names)
        }

        # Feature importance
        if hasattr(self.model, "feature_importances_"):
            feature_importance = sorted(
                zip(self.feature_names, self.model.feature_importances_),
                key=lambda x: x[1],
                reverse=True
            )
            metrics["top_10_features"] = [
                {"feature": fname, "importance": float(imp)}
                for fname, imp in feature_importance[:10]
            ]

        logger.info(f"Training complete. Test Accuracy: {metrics['test_accuracy']:.4f}, F1: {metrics['f1']:.4f}")

        # Save if requested
        if save:
            self.save_model()
            logger.info(f"Model saved to {self.model_path}")

        return {
            "success": True,
            "model_type": self.model_type,
            "metrics": metrics,
            "timestamp": datetime.utcnow().isoformat()
        }

    def save_model(self):
        """Save model and scaler to disk"""
        model_data = {
            "model": self.model,
            "scaler": self.scaler,
            "feature_names": self.feature_names,
            "model_type": self.model_type
        }
        joblib.dump(model_data, self.model_path)
        logger.info(f"Model saved: {self.model_path}")

    def load_model(self) -> bool:
        """Load model and scaler from disk"""
        if not self.model_path.exists():
            logger.warning(f"Model not found at {self.model_path}")
            return False

        try:
            model_data = joblib.load(self.model_path)
            self.model = model_data["model"]
            self.scaler = model_data["scaler"]
            self.feature_names = model_data["feature_names"]
            logger.info(f"Model loaded from {self.model_path}")
            return True
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            return False

    def predict(self, patient: Dict[str, Any], trial: Dict[str, Any]) -> Dict[str, Any]:
        """
        Predict eligibility score for a patient-trial pair

        Args:
            patient: Patient document
            trial: Trial document

        Returns:
            Dictionary with prediction and probability
        """
        if not self.model:
            logger.debug("Model not loaded. Attempting to load...")
            if not self.load_model():
                return {
                    "success": False,
                    "error": "Model not available",
                    "prediction": None,
                    "probability": 0.5
                }

        try:
            # Create dummy match for feature extraction
            dummy_match = {"status": "ELIGIBLE"}

            features = self._engineer_features(patient, trial, dummy_match)
            if not features:
                return {
                    "success": False,
                    "error": "Could not extract features",
                    "prediction": None,
                    "probability": 0.5
                }

            # Remove label if present
            features.pop("label", None)

            # Ensure all features are present in order
            feature_vector = []
            for fname in self.feature_names:
                feature_vector.append(features.get(fname, 0.0))

            X = np.array([feature_vector])
            X_scaled = self.scaler.transform(X)

            prediction = self.model.predict(X_scaled)[0]
            probability = self.model.predict_proba(X_scaled)[0][1]

            return {
                "success": True,
                "prediction": int(prediction),
                "probability": float(probability),
                "eligible": probability > 0.5
            }

        except Exception as e:
            logger.error(f"Error making prediction: {e}")
            return {
                "success": False,
                "error": str(e),
                "prediction": None,
                "probability": 0.5
            }

    def get_model_info(self) -> Dict[str, Any]:
        """Get information about the loaded model"""
        return {
            "model_type": self.model_type,
            "model_path": str(self.model_path),
            "model_exists": self.model_path.exists(),
            "model_loaded": self.model is not None,
            "feature_count": len(self.feature_names),
            "feature_names": self.feature_names,
            "scaler_fitted": hasattr(self.scaler, 'mean_') and self.scaler.mean_ is not None
        }
