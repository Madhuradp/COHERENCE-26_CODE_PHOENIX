"""
PII Redaction Service using Microsoft Presidio
Detects and redacts sensitive information from clinical data
"""

from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
from presidio_analyzer import AnalyzerEngine
from presidio_anonymizer import AnonymizerEngine
from presidio_anonymizer.entities import OperatorConfig
import logging

logger = logging.getLogger(__name__)


class PIIRedactionService:
    """Handle PII detection and redaction using Microsoft Presidio"""

    def __init__(self):
        """Initialize Presidio analyzer and anonymizer"""
        try:
            self.analyzer = AnalyzerEngine()
            self.anonymizer = AnonymizerEngine()
            logger.info("Presidio engines initialized successfully")
        except Exception as e:
            logger.error(f"Error initializing Presidio: {e}")
            raise

    def analyze_text(self, text: str, language: str = "en") -> List[Dict[str, Any]]:
        """
        Analyze text for PII entities

        Args:
            text: Text to analyze
            language: Language code (default: 'en' for English)

        Returns:
            List of detected PII entities with locations and scores
        """
        if not text:
            return []

        try:
            results = self.analyzer.analyze(
                text=text,
                language=language,
                score_threshold=0.5
            )

            entities = []
            for result in results:
                entities.append({
                    "entity_type": result.entity_type,
                    "start": result.start,
                    "end": result.end,
                    "score": result.score,
                    "text_sample": text[result.start:min(result.end + 5, len(text))]
                })

            return entities

        except Exception as e:
            logger.error(f"Error analyzing text: {e}")
            return []

    def redact_text(
        self,
        text: str,
        operators: Optional[Dict[str, OperatorConfig]] = None
    ) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Redact PII entities from text

        Args:
            text: Text to redact
            operators: Custom operators for different entity types
                      (default: replace with [ENTITY_TYPE])

        Returns:
            Tuple of (redacted_text, detected_entities)
        """
        if not text:
            return text, []

        try:
            # Detect entities first
            entities = self.analyze_text(text)

            if not entities:
                return text, []

            # Default operators: replace with [ENTITY_TYPE]
            if operators is None:
                operators = {
                    "PERSON": OperatorConfig("replace", {"new_value": "[PERSON]"}),
                    "EMAIL_ADDRESS": OperatorConfig("replace", {"new_value": "[EMAIL]"}),
                    "PHONE_NUMBER": OperatorConfig("replace", {"new_value": "[PHONE]"}),
                    "MEDICAL_LICENSE": OperatorConfig("replace", {"new_value": "[LICENSE]"}),
                    "URL": OperatorConfig("replace", {"new_value": "[URL]"}),
                    "CREDIT_CARD": OperatorConfig("replace", {"new_value": "[CREDIT_CARD]"}),
                    "SSID": OperatorConfig("replace", {"new_value": "[SSN]"}),
                    "DATE_TIME": OperatorConfig("replace", {"new_value": "[DATE]"}),
                }

            # Redact using analyzer results
            redacted = self.anonymizer.anonymize(
                text=text,
                analyzer_results=self.analyzer.analyze(text, language="en"),
                operators=operators
            )

            return redacted.text, entities

        except Exception as e:
            logger.error(f"Error redacting text: {e}")
            return text, []

    def redact_patient_record(
        self,
        patient: Dict[str, Any]
    ) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """
        Redact PII from a complete patient record

        Args:
            patient: Patient document from database

        Returns:
            Tuple of (redacted_patient, pii_summary)

        IMPORTANT: Medical data fields (medications, lab_values, conditions) are NEVER redacted
        as they are essential for clinical trial matching
        """
        # Create deep copy to preserve medical data
        import copy
        redacted = copy.deepcopy(patient)

        # Preserve medical data fields - these are NEVER redacted
        medical_data_fields = ["medications", "lab_values", "conditions", "eligibility"]
        preserved_medical = {}
        for field in medical_data_fields:
            if field in patient:
                preserved_medical[field] = patient[field]

        pii_summary = {
            "has_pii": False,
            "redacted_fields": [],
            "entity_counts": {},
            "total_entities": 0
        }

        # Fields to scan for PII - ONLY narrative text, never structured medical data
        text_fields = [
            "clinical_notes_text",
            "demographics.notes",
            "medical_history"
        ]

        for field_path in text_fields:
            keys = field_path.split(".")
            value = redacted
            parent = None
            last_key = None

            # Navigate nested dict
            for i, key in enumerate(keys[:-1]):
                if isinstance(value, dict) and key in value:
                    parent = value
                    value = value[key]
                else:
                    break

            last_key = keys[-1]

            # Redact if field exists
            if isinstance(value, dict) and last_key in value:
                original_text = value[last_key]
                if isinstance(original_text, str):
                    redacted_text, entities = self.redact_text(original_text)

                    if entities:
                        pii_summary["has_pii"] = True
                        pii_summary["redacted_fields"].append(field_path)
                        pii_summary["total_entities"] += len(entities)

                        # Count entity types
                        for entity in entities:
                            entity_type = entity["entity_type"]
                            pii_summary["entity_counts"][entity_type] = \
                                pii_summary["entity_counts"].get(entity_type, 0) + 1

                        # Update redacted value
                        value[last_key] = redacted_text

        # RESTORE medical data fields to ensure they are never lost
        for field in medical_data_fields:
            if field in preserved_medical:
                redacted[field] = preserved_medical[field]

        return redacted, pii_summary

    def redact_trial_record(
        self,
        trial: Dict[str, Any]
    ) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """
        Redact PII from a clinical trial record

        Args:
            trial: Trial document

        Returns:
            Tuple of (redacted_trial, pii_summary)
        """
        redacted = trial.copy()
        pii_summary = {
            "has_pii": False,
            "redacted_fields": [],
            "entity_counts": {},
            "total_entities": 0
        }

        # Fields to scan in trial
        text_fields = [
            ("eligibility", "raw_text"),
            ("description",),
        ]

        for field_path in text_fields:
            try:
                # Navigate nested structure
                value = redacted
                for key in field_path[:-1]:
                    if isinstance(value, dict):
                        value = value.get(key, {})
                    else:
                        break

                last_key = field_path[-1]

                if isinstance(value, dict) and last_key in value:
                    original_text = str(value[last_key])
                    redacted_text, entities = self.redact_text(original_text)

                    if entities:
                        field_name = ".".join(field_path)
                        pii_summary["has_pii"] = True
                        pii_summary["redacted_fields"].append(field_name)
                        pii_summary["total_entities"] += len(entities)

                        for entity in entities:
                            entity_type = entity["entity_type"]
                            pii_summary["entity_counts"][entity_type] = \
                                pii_summary["entity_counts"].get(entity_type, 0) + 1

                        value[last_key] = redacted_text

            except Exception as e:
                logger.warning(f"Error redacting field {field_path}: {e}")

        return redacted, pii_summary

    def check_for_pii(self, text: str) -> Dict[str, Any]:
        """
        Check if text contains PII without redacting

        Args:
            text: Text to check

        Returns:
            Dictionary with PII detection results
        """
        entities = self.analyze_text(text)

        return {
            "has_pii": len(entities) > 0,
            "entity_count": len(entities),
            "entities": entities,
            "entity_summary": {
                entity["entity_type"]: sum(
                    1 for e in entities if e["entity_type"] == entity["entity_type"]
                )
                for entity in entities
            }
        }

    def get_high_confidence_entities(
        self,
        text: str,
        min_score: float = 0.8
    ) -> List[Dict[str, Any]]:
        """
        Get only high-confidence PII detections

        Args:
            text: Text to analyze
            min_score: Minimum confidence score (0-1)

        Returns:
            List of high-confidence entities
        """
        all_entities = self.analyze_text(text)
        return [e for e in all_entities if e["score"] >= min_score]


class PIIRedactionAuditLog:
    """Helper class to structure PII redaction audit logs"""

    @staticmethod
    def create_redaction_log(
        document_type: str,
        document_id: str,
        pii_summary: Dict[str, Any],
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create audit log entry for PII redaction

        Args:
            document_type: Type of document (patient, trial, etc)
            document_id: ID of the document
            pii_summary: PII detection summary from redaction
            user_id: User who triggered the redaction

        Returns:
            Audit log entry
        """
        return {
            "timestamp": datetime.utcnow(),
            "event_type": "PII_REDACTED",
            "document_type": document_type,
            "document_id": document_id,
            "user_id": user_id,
            "details": {
                "has_pii": pii_summary["has_pii"],
                "total_entities_redacted": pii_summary["total_entities"],
                "entity_types": pii_summary["entity_counts"],
                "redacted_fields": pii_summary["redacted_fields"]
            }
        }
