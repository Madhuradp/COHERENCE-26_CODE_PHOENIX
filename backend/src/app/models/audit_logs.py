"""Audit log models"""

from pydantic import Field
from typing import Optional, Dict, Any
from datetime import datetime
from .base import BaseDocument, EventType, utc_now


class AuditLog(BaseDocument):
    """Audit log document"""
    timestamp: datetime = Field(default_factory=utc_now, description="Event timestamp")
    event_type: EventType = Field(..., description="Event type")
    patient_id: Optional[str] = Field(None, description="Patient ObjectId as string (if applicable)")
    user_id: Optional[str] = Field(None, description="User ObjectId as string (if applicable)")
    details: Dict[str, Any] = Field(default_factory=dict, description="Event details")
    action_by: str = Field(default="System", description="Who performed the action")

    class Config:
        json_schema_extra = {
            "example": {
                "timestamp": "2024-11-20T10:30:45",
                "event_type": "MATCH_GENERATED",
                "patient_id": "507f1f77bcf86cd799439011",
                "user_id": "507f1f77bcf86cd799439012",
                "details": {
                    "nct_id": "NCT04582292",
                    "bias_check_passed": True,
                    "confidence_score": 0.84
                },
                "action_by": "System"
            }
        }
