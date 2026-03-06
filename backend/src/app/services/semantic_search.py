"""
Semantic Search Service using Sentence Transformers
Replaces local filtering with intelligent semantic similarity matching
"""

from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
import numpy as np
import logging
from sentence_transformers import SentenceTransformer, util

logger = logging.getLogger(__name__)


class SemanticSearchService:
    """
    Semantic search using sentence-transformers
    Finds clinically relevant trials based on semantic similarity
    """

    def __init__(self, model_name: str = "sentence-transformers/biomedical-mpnet-base"):
        """
        Initialize semantic search with biomedical model

        Args:
            model_name: Sentence transformer model to use
                Default: biomedical-mpnet-base (optimized for medical/clinical text)
        """
        try:
            self.model = SentenceTransformer(model_name)
            self.model_name = model_name
            logger.info(f"Semantic Search initialized with {model_name}")
        except Exception as e:
            logger.error(f"Error loading model {model_name}: {e}")
            # Fallback to general model
            self.model = SentenceTransformer("all-MiniLM-L6-v2")
            self.model_name = "all-MiniLM-L6-v2"
            logger.warning("Fallback to general-purpose model")

    def generate_patient_embedding(self, patient: Dict[str, Any]) -> np.ndarray:
        """
        Generate semantic embedding for patient profile

        Args:
            patient: Patient document with conditions, medications, notes

        Returns:
            Numpy array of embeddings
        """
        try:
            # Build comprehensive patient context
            patient_text_parts = []

            # Add conditions
            conditions = patient.get("conditions", [])
            if conditions:
                condition_names = [c.get("name", "") for c in conditions]
                patient_text_parts.append(f"Conditions: {', '.join(condition_names)}")

            # Add medications
            medications = patient.get("medications", [])
            if medications:
                med_names = [m.get("name", "") for m in medications]
                patient_text_parts.append(f"Medications: {', '.join(med_names)}")

            # Add lab values
            lab_values = patient.get("lab_values", [])
            if lab_values:
                lab_text = ", ".join([f"{l.get('name')}: {l.get('value')}" for l in lab_values])
                patient_text_parts.append(f"Lab values: {lab_text}")

            # Add demographics
            age = patient.get("demographics", {}).get("age")
            if age:
                patient_text_parts.append(f"Age: {age} years")

            # Add clinical notes
            notes = patient.get("clinical_notes_text", "")
            if notes:
                # Redact PII patterns before embedding
                notes = self._sanitize_text(notes)
                patient_text_parts.append(f"Clinical notes: {notes[:500]}")  # Limit length

            # Combine all parts
            patient_context = " ".join(patient_text_parts)

            if not patient_context.strip():
                patient_context = "Patient with unknown conditions"

            # Generate embedding
            embedding = self.model.encode(patient_context, convert_to_numpy=True)
            return embedding

        except Exception as e:
            logger.error(f"Error generating patient embedding: {e}")
            return np.zeros(self.model.get_sentence_embedding_dimension())

    def generate_trial_embedding(self, trial: Dict[str, Any]) -> np.ndarray:
        """
        Generate semantic embedding for trial profile

        Args:
            trial: Trial document with conditions, interventions, eligibility

        Returns:
            Numpy array of embeddings
        """
        try:
            trial_text_parts = []

            # Add trial title
            title = trial.get("title", "")
            if title:
                trial_text_parts.append(f"Trial: {title}")

            # Add conditions
            conditions = trial.get("conditions", [])
            if conditions:
                trial_text_parts.append(f"Conditions: {', '.join(conditions)}")

            # Add keywords
            keywords = trial.get("keywords", [])
            if keywords:
                trial_text_parts.append(f"Keywords: {', '.join(keywords)}")

            # Add phase
            phase = trial.get("phase")
            if phase:
                trial_text_parts.append(f"Phase: {phase}")

            # Add interventions
            interventions = trial.get("interventions", [])
            if interventions:
                intervention_names = [i.get("name", "") for i in interventions]
                trial_text_parts.append(f"Interventions: {', '.join(intervention_names)}")

            # Add eligibility criteria
            eligibility = trial.get("eligibility", {})
            if eligibility:
                raw_text = eligibility.get("raw_text", "")
                if raw_text:
                    trial_text_parts.append(f"Eligibility: {raw_text[:300]}")

            # Add sponsor
            sponsor = trial.get("sponsor")
            if sponsor:
                trial_text_parts.append(f"Sponsor: {sponsor}")

            # Combine all parts
            trial_context = " ".join(trial_text_parts)

            if not trial_context.strip():
                trial_context = "Clinical trial with unknown information"

            # Generate embedding
            embedding = self.model.encode(trial_context, convert_to_numpy=True)
            return embedding

        except Exception as e:
            logger.error(f"Error generating trial embedding: {e}")
            return np.zeros(self.model.get_sentence_embedding_dimension())

    def find_semantically_similar_trials(
        self,
        patient_embedding: np.ndarray,
        trial_embeddings: List[Tuple[str, np.ndarray]],
        threshold: float = 0.3,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Find trials semantically similar to patient profile

        Args:
            patient_embedding: Patient semantic embedding
            trial_embeddings: List of (trial_id, embedding) tuples
            threshold: Minimum similarity score (0-1)
            limit: Max results to return

        Returns:
            List of dicts with trial_id and similarity_score
        """
        if not trial_embeddings:
            return []

        try:
            results = []

            for trial_id, trial_embedding in trial_embeddings:
                # Calculate cosine similarity
                similarity = util.pytorch_cos_sim(
                    patient_embedding.reshape(1, -1),
                    trial_embedding.reshape(1, -1)
                ).item()

                if similarity >= threshold:
                    results.append({
                        "trial_id": trial_id,
                        "semantic_similarity": float(similarity),
                        "match_source": "semantic"
                    })

            # Sort by similarity (highest first)
            results = sorted(results, key=lambda x: x["semantic_similarity"], reverse=True)

            # Apply limit
            return results[:limit]

        except Exception as e:
            logger.error(f"Error finding similar trials: {e}")
            return []

    def calculate_semantic_match_score(
        self,
        patient: Dict[str, Any],
        trial: Dict[str, Any]
    ) -> float:
        """
        Calculate semantic match score between patient and trial (0-1)

        Args:
            patient: Patient document
            trial: Trial document

        Returns:
            Similarity score (0-1)
        """
        try:
            patient_embedding = self.generate_patient_embedding(patient)
            trial_embedding = self.generate_trial_embedding(trial)

            similarity = util.pytorch_cos_sim(
                patient_embedding.reshape(1, -1),
                trial_embedding.reshape(1, -1)
            ).item()

            return float(similarity)

        except Exception as e:
            logger.error(f"Error calculating semantic score: {e}")
            return 0.0

    def batch_generate_embeddings(
        self,
        texts: List[str],
        batch_size: int = 32
    ) -> List[np.ndarray]:
        """
        Generate embeddings for multiple texts in batches

        Args:
            texts: List of text strings
            batch_size: Batch size for encoding

        Returns:
            List of embeddings
        """
        try:
            embeddings = self.model.encode(
                texts,
                batch_size=batch_size,
                convert_to_numpy=True,
                show_progress_bar=False
            )
            return list(embeddings)
        except Exception as e:
            logger.error(f"Error batch generating embeddings: {e}")
            return [np.zeros(self.model.get_sentence_embedding_dimension()) for _ in texts]

    def find_similar_conditions(
        self,
        condition: str,
        all_conditions: List[str],
        threshold: float = 0.5,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Find similar conditions using semantic similarity

        Args:
            condition: Target condition
            all_conditions: List of all conditions
            threshold: Minimum similarity score
            limit: Max results

        Returns:
            List of similar conditions with scores
        """
        try:
            # Generate embeddings
            condition_embedding = self.model.encode(condition, convert_to_numpy=True)
            all_embeddings = self.batch_generate_embeddings(all_conditions)

            results = []
            for cond, embedding in zip(all_conditions, all_embeddings):
                if cond.lower() == condition.lower():
                    continue  # Skip exact match

                similarity = util.pytorch_cos_sim(
                    condition_embedding.reshape(1, -1),
                    embedding.reshape(1, -1)
                ).item()

                if similarity >= threshold:
                    results.append({
                        "condition": cond,
                        "similarity": float(similarity)
                    })

            # Sort and limit
            results = sorted(results, key=lambda x: x["similarity"], reverse=True)
            return results[:limit]

        except Exception as e:
            logger.error(f"Error finding similar conditions: {e}")
            return []

    @staticmethod
    def _sanitize_text(text: str) -> str:
        """
        Remove potential PII patterns from text before embedding

        Args:
            text: Text to sanitize

        Returns:
            Sanitized text
        """
        if not text:
            return ""

        # Simple redaction of common PII patterns
        import re

        # Email patterns
        text = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '[EMAIL]', text)

        # Phone patterns
        text = re.sub(r'\b(?:\d{3}[-.]?)?\d{3}[-.]?\d{4}\b', '[PHONE]', text)

        # SSN patterns
        text = re.sub(r'\b\d{3}-\d{2}-\d{4}\b', '[SSN]', text)

        # Medical record numbers (common patterns)
        text = re.sub(r'\b(?:MRN|MR|PAT)?[\s:]*\d{6,10}\b', '[MRN]', text)

        return text

    def get_embedding_dimension(self) -> int:
        """Get embedding vector dimension"""
        return self.model.get_sentence_embedding_dimension()

    def get_model_info(self) -> Dict[str, Any]:
        """Get information about loaded model"""
        return {
            "model_name": self.model_name,
            "embedding_dimension": self.get_embedding_dimension(),
            "max_seq_length": self.model.max_seq_length
        }


class TrialEmbeddingCache:
    """Cache embeddings to avoid recalculating"""

    def __init__(self):
        self.cache: Dict[str, np.ndarray] = {}
        self.timestamps: Dict[str, datetime] = {}
        self.max_age_seconds = 3600  # 1 hour

    def get(self, trial_id: str) -> Optional[np.ndarray]:
        """Get cached embedding"""
        if trial_id not in self.cache:
            return None

        # Check age
        age = (datetime.utcnow() - self.timestamps[trial_id]).total_seconds()
        if age > self.max_age_seconds:
            del self.cache[trial_id]
            del self.timestamps[trial_id]
            return None

        return self.cache[trial_id]

    def set(self, trial_id: str, embedding: np.ndarray):
        """Cache embedding"""
        self.cache[trial_id] = embedding
        self.timestamps[trial_id] = datetime.utcnow()

    def clear(self):
        """Clear all cached embeddings"""
        self.cache.clear()
        self.timestamps.clear()

    def size(self) -> int:
        """Get cache size"""
        return len(self.cache)
