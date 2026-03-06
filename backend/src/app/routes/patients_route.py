from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import List
from ..core.database import Database
from ..services.privacy_manager import PrivacyManager
from ..services.semantic_search import SemanticSearchService
from ..models.base import ResponseModel
from bson import ObjectId
from pydantic import BaseModel
from ..services.patient_service import PatientService


router = APIRouter(prefix="/api/patients", tags=["Patients"])

@router.post("/upload", response_model=ResponseModel)
async def upload_patient(raw_patient: dict):
    db = Database()
    privacy = PrivacyManager()
    semantic = SemanticSearchService()
    
    # 1. Redact PII before it even touches the DB
    redacted_data, pii_summary = privacy.redact_for_storage(raw_patient, data_type="patient")
    
    # 2. Generate Semantic Embedding for matching
    redacted_data["embedding"] = semantic.generate_patient_embedding(redacted_data).tolist()
    
    # 3. Save to MongoDB
    result = db.patients.insert_one(redacted_data)
    patient_id = str(result.inserted_id)
    
    # 4. Create Audit Log for Privacy Compliance
    audit_log = privacy.create_audit_log(
        document_type="patient",
        document_id=patient_id,
        pii_summary=pii_summary
    )
    db.audit.insert_one(audit_log)
    
    return {
        "success": True, 
        "data": {"id": patient_id, "pii_redacted": pii_summary["total_entities"]},
        "message": "Patient ingested and redacted successfully"
    }

@router.get("/", response_model=ResponseModel)
async def list_patients():
    db = Database()
    # Return redacted patients, exclude embeddings for speed
    patients = list(db.patients.find({}, {"embedding": 0}))
    for p in patients:
        p["_id"] = str(p["_id"])
    return {"success": True, "data": patients}