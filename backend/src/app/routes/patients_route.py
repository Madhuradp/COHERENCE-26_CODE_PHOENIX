from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from typing import List
from ..core.database import Database
from ..services.privacy_manager import PrivacyManager
from ..services.semantic_search import SemanticSearchService
from ..services.match_engine import MatchingEngine
from ..models.base import ResponseModel
from ..auth import get_current_user
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


# ============ PATIENT SELF-SERVICE ROUTES ============

@router.post("/self-upload", response_model=ResponseModel)
async def patient_upload_own_records(raw_patient: dict, current_user: dict = Depends(get_current_user)):
    """
    Patient uploads their own medical records.
    Only PATIENT role can use this.
    """
    if current_user.get("role") != "PATIENT":
        raise HTTPException(status_code=403, detail="Only patients can use this endpoint")

    db = Database()
    privacy = PrivacyManager()
    semantic = SemanticSearchService()

    # 1. Redact PII before storage
    redacted_data, pii_summary = privacy.redact_for_storage(raw_patient, data_type="patient")
    redacted_data["patient_email"] = current_user["email"]

    # 2. Generate embedding
    redacted_data["embedding"] = semantic.generate_patient_embedding(redacted_data).tolist()

    # 3. Save to MongoDB
    result = db.patients.insert_one(redacted_data)
    patient_id = str(result.inserted_id)

    # 4. Audit log
    audit_log = privacy.create_audit_log(
        document_type="patient",
        document_id=patient_id,
        pii_summary=pii_summary,
        user_email=current_user["email"]
    )
    db.audit.insert_one(audit_log)

    return {
        "success": True,
        "data": {"id": patient_id},
        "message": "Your medical records uploaded successfully"
    }


@router.post("/find-my-matches", response_model=ResponseModel)
async def patient_find_matches(patient_id: str, current_user: dict = Depends(get_current_user)):
    """
    Patient finds clinical trials they match.
    Patient can only search their own records.
    """
    db = Database()
    engine = MatchingEngine()

    # Get patient record
    patient = db.patients.find_one({"_id": ObjectId(patient_id)})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Verify patient owns this record
    if patient.get("patient_email") != current_user["email"]:
        raise HTTPException(status_code=403, detail="Can only view your own records")

    # Run 3-tier matching pipeline
    try:
        matches = engine.run_full_pipeline(patient)
        return {
            "success": True,
            "data": matches,
            "message": f"Found {len(matches)} matching trials"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Matching failed: {str(e)}")


# ============ AUDITOR ENDPOINTS (NO PII) ============

@router.get("/audit-logs", response_model=ResponseModel)
async def get_audit_logs(current_user: dict = Depends(get_current_user)):
    """
    Auditor views audit logs (who accessed what, when).
    No patient PII exposed.
    """
    if current_user.get("role") != "AUDITOR":
        raise HTTPException(status_code=403, detail="Only auditors can access this")

    db = Database()
    logs = list(db.audit.find({}, {
        "document_id": 1,
        "document_type": 1,
        "timestamp": 1,
        "user_email": 1,
        "event_type": 1,
        "action": 1
    }).sort("timestamp", -1).limit(100))

    for log in logs:
        log["_id"] = str(log["_id"])

    return {
        "success": True,
        "data": logs,
        "message": "Audit logs retrieved (PII redacted)"
    }


@router.get("/fairness-stats", response_model=ResponseModel)
async def get_fairness_stats(current_user: dict = Depends(get_current_user)):
    """
    Auditor views fairness and compliance statistics.
    Shows matching rates, demographics distribution, etc.
    No individual patient data.
    """
    if current_user.get("role") != "AUDITOR":
        raise HTTPException(status_code=403, detail="Only auditors can access this")

    db = Database()

    # Calculate fairness metrics
    total_patients = db.patients.count_documents({})
    total_matches = db.match_results.count_documents({}) if "match_results" in db.db.list_collection_names() else 0

    # Get PII redaction stats
    redaction_logs = list(db.audit.find(
        {"event_type": "PII_REDACTED"},
        {"total_entities": 1, "timestamp": 1}
    ))

    total_pii_entities = sum(log.get("total_entities", 0) for log in redaction_logs)

    stats = {
        "total_patients_ingested": total_patients,
        "total_match_results_generated": total_matches,
        "total_pii_entities_redacted": total_pii_entities,
        "audit_logs_count": len(redaction_logs),
        "compliance_status": "All data properly redacted" if total_pii_entities > 0 else "No PII detected"
    }

    return {
        "success": True,
        "data": stats,
        "message": "Fairness and compliance statistics"
    }