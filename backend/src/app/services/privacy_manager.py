"""
Privacy Manager - Unified PII handling
Encapsulates all privacy/compliance logic
"""

from typing import Dict, Any, Tuple, Optional
from datetime import datetime
from .pii_redaction import PIIRedactionService, PIIRedactionAuditLog
import logging

logger = logging.getLogger(__name__)


class PrivacyManager:
    """
    High-level privacy/compliance manager
    Coordinates PII detection, redaction, and audit logging
    """

    def __init__(self):
        """Initialize privacy manager with PII service"""
        self.pii_service = PIIRedactionService()

    def redact_for_storage(
        self,
        data: Dict[str, Any],
        data_type: str = "patient"
    ) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """
        Redact PII from data before storage (main use case)

        Args:
            data: Data to redact (patient, trial, etc.)
            data_type: Type of data ("patient", "trial")

        Returns:
            Tuple of (redacted_data, pii_summary)
        """
        if data_type == "patient":
            return self.pii_service.redact_patient_record(data)
        elif data_type == "trial":
            return self.pii_service.redact_trial_record(data)
        else:
            logger.warning(f"Unknown data type: {data_type}")
            return data, {"has_pii": False, "entity_counts": {}, "total_entities": 0}

    def audit_for_pii(
        self,
        data: Dict[str, Any],
        data_type: str = "patient",
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Check for PII without modifying (audit/compliance mode)

        Args:
            data: Data to check
            data_type: Type of data
            user_id: User performing the audit

        Returns:
            Audit results with PII findings
        """
        if data_type == "patient":
            return self._audit_patient(data, user_id)
        elif data_type == "trial":
            return self._audit_trial(data, user_id)
        else:
            return {"error": f"Unknown data type: {data_type}"}

    def _audit_patient(
        self,
        patient: Dict[str, Any],
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Audit patient for PII"""
        text_fields = [
            "clinical_notes_text",
            "demographics.notes"
        ]

        results = {}
        has_any_pii = False

        for field_path in text_fields:
            keys = field_path.split(".")
            value = patient
            for key in keys:
                if isinstance(value, dict):
                    value = value.get(key)
                else:
                    break

            if isinstance(value, str):
                pii_check = self.pii_service.check_for_pii(value)
                results[field_path] = pii_check
                if pii_check["has_pii"]:
                    has_any_pii = True

        return {
            "document_type": "patient",
            "document_id": str(patient.get("_id", "unknown")),
            "has_pii": has_any_pii,
            "field_results": results,
            "audited_by": user_id,
            "audit_timestamp": datetime.utcnow().isoformat()
        }

    def _audit_trial(
        self,
        trial: Dict[str, Any],
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Audit trial for PII"""
        text_fields = [
            ("eligibility", "raw_text"),
            ("description",)
        ]

        results = {}
        has_any_pii = False

        for field_path in text_fields:
            try:
                value = trial
                for key in field_path[:-1]:
                    if isinstance(value, dict):
                        value = value.get(key, {})

                last_key = field_path[-1]
                if isinstance(value, dict) and last_key in value:
                    text_value = str(value[last_key])
                    field_name = ".".join(field_path)
                    pii_check = self.pii_service.check_for_pii(text_value)
                    results[field_name] = pii_check
                    if pii_check["has_pii"]:
                        has_any_pii = True
            except Exception as e:
                logger.warning(f"Error auditing field {field_path}: {e}")

        return {
            "document_type": "trial",
            "document_id": trial.get("nct_id", "unknown"),
            "has_pii": has_any_pii,
            "field_results": results,
            "audited_by": user_id,
            "audit_timestamp": datetime.utcnow().isoformat()
        }

    def check_text_for_pii(self, text: str) -> Dict[str, Any]:
        """
        Check arbitrary text for PII

        Args:
            text: Text to check

        Returns:
            PII detection results
        """
        return self.pii_service.check_for_pii(text)

    def create_audit_log(
        self,
        document_type: str,
        document_id: str,
        pii_summary: Dict[str, Any],
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create audit log entry for PII redaction

        Args:
            document_type: Type of document (patient, trial)
            document_id: ID of document
            pii_summary: PII detection summary
            user_id: User who triggered the action

        Returns:
            Audit log entry ready for insertion
        """
        return PIIRedactionAuditLog.create_redaction_log(
            document_type=document_type,
            document_id=document_id,
            pii_summary=pii_summary,
            user_id=user_id
        )

    def get_high_confidence_pii(
        self,
        text: str,
        min_score: float = 0.8
    ) -> Dict[str, Any]:
        """
        Get only high-confidence PII detections

        Args:
            text: Text to analyze
            min_score: Minimum confidence score

        Returns:
            High-confidence PII entities
        """
        entities = self.pii_service.get_high_confidence_entities(text, min_score)
        return {
            "has_high_confidence_pii": len(entities) > 0,
            "entity_count": len(entities),
            "entities": entities,
            "min_score": min_score
        }
