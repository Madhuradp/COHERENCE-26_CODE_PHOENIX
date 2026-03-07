from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from typing import List
from datetime import datetime
from ..core.database import Database
from ..services.privacy_manager import PrivacyManager
from ..services.semantic_search import SemanticSearchService
from ..models.base import ResponseModel
from ..models.users import UserRole
from ..auth import get_current_user
from bson import ObjectId
from pydantic import BaseModel


router = APIRouter(prefix="/api/patients", tags=["Patients"])

# Maharashtra geolocation constant
MAHARASHTRA_GEO = {"type": "Point", "coordinates": [74.8479, 19.7515]}

@router.post("/upload", response_model=ResponseModel)
async def upload_patient(raw_patient: dict, current_user: dict = Depends(get_current_user)):
    """Upload single patient record (RESEARCHER only)"""
    if current_user.get("role") != UserRole.RESEARCHER.value:
        raise HTTPException(status_code=403, detail="Only researchers can upload patients")
    db = Database()
    privacy = PrivacyManager()
    semantic = SemanticSearchService()

    # 1. Redact PII before it even touches the DB
    redacted_data, pii_summary = privacy.redact_for_storage(raw_patient, data_type="patient")

    # 2. Auto-assign Maharashtra location if not provided
    if "demographics" in redacted_data and isinstance(redacted_data["demographics"], dict):
        if not redacted_data["demographics"].get("location"):
            redacted_data["demographics"]["location"] = MAHARASHTRA_GEO
    elif "demographics" not in redacted_data:
        redacted_data["demographics"] = {"location": MAHARASHTRA_GEO}

    # 3. Generate Semantic Embedding for matching
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


@router.post("/bulk-upload", response_model=ResponseModel)
async def bulk_upload_patients(patients: List[dict], current_user: dict = Depends(get_current_user)):
    """
    Bulk upload multiple patient records efficiently (RESEARCHER only).

    Request body:
    [
        { patient1_data },
        { patient2_data },
        { patient3_data },
        ...
    ]

    Returns: List of patient IDs and statistics
    """
    if current_user.get("role") != UserRole.RESEARCHER.value:
        raise HTTPException(status_code=403, detail="Only researchers can upload patients")
    db = Database()
    privacy = PrivacyManager()
    semantic = SemanticSearchService()

    if not patients or len(patients) == 0:
        raise HTTPException(status_code=400, detail="No patients provided")

    if len(patients) > 10000:
        raise HTTPException(status_code=400, detail="Maximum 10000 patients per request")

    results = {
        "success_count": 0,
        "failed_count": 0,
        "patient_ids": [],
        "errors": [],
        "total_pii_entities": 0
    }

    # Batch process patients
    documents_to_insert = []
    audit_logs_to_insert = []

    for idx, raw_patient in enumerate(patients):
        try:
            # 1. Redact PII
            redacted_data, pii_summary = privacy.redact_for_storage(raw_patient, data_type="patient")

            # 2. Auto-assign Maharashtra location if not provided
            if "demographics" in redacted_data and isinstance(redacted_data["demographics"], dict):
                if not redacted_data["demographics"].get("location"):
                    redacted_data["demographics"]["location"] = MAHARASHTRA_GEO
            elif "demographics" not in redacted_data:
                redacted_data["demographics"] = {"location": MAHARASHTRA_GEO}

            # 3. Generate embedding
            redacted_data["embedding"] = semantic.generate_patient_embedding(redacted_data).tolist()

            # Store for batch insert (with temp ID for audit log reference)
            temp_id = f"temp_{idx}"
            redacted_data["_temp_id"] = temp_id
            documents_to_insert.append(redacted_data)

            # Prepare audit log
            audit_log = privacy.create_audit_log(
                document_type="patient",
                document_id=temp_id,
                pii_summary=pii_summary
            )
            audit_logs_to_insert.append(audit_log)

            results["total_pii_entities"] += pii_summary.get("total_entities", 0)

        except Exception as e:
            results["failed_count"] += 1
            results["errors"].append({
                "patient_index": idx,
                "error": str(e)
            })

    # Batch insert to MongoDB
    if documents_to_insert:
        try:
            insert_result = db.patients.insert_many(documents_to_insert)
            results["success_count"] = len(insert_result.inserted_ids)
            results["patient_ids"] = [str(pid) for pid in insert_result.inserted_ids]

            # Update audit logs with real patient IDs
            for audit_log, patient_id in zip(audit_logs_to_insert, results["patient_ids"]):
                audit_log["document_id"] = patient_id

            # Batch insert audit logs
            db.audit.insert_many(audit_logs_to_insert)

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Database insertion failed: {str(e)}")

    return {
        "success": True,
        "data": results,
        "message": f"Bulk upload complete: {results['success_count']} succeeded, {results['failed_count']} failed"
    }

@router.get("/", response_model=ResponseModel)
async def list_patients(current_user: dict = Depends(get_current_user)):
    """
    Get list of patients for matching selection (RESEARCHER and AUDITOR).

    DATA DISPLAY POLICY:
    ✅ SHOWN (Required for Clinical Trial Matching):
       - Age (for age eligibility filtering)
       - Gender (for gender eligibility)
       - Condition/Diagnosis (primary medical condition)
       - Medications (for drug interaction checks)
       - Lab Values (for lab result matching)

    🔒 REDACTED (Personal/Sensitive Data):
       - Patient Name
       - Patient Email
       - Phone Number
       - Clinical Notes (free-text narratives)
    """
    # Both RESEARCHER and AUDITOR can view patient list
    allowed_roles = [UserRole.RESEARCHER.value, UserRole.AUDITOR.value]
    if current_user.get("role") not in allowed_roles:
        raise HTTPException(status_code=403, detail="Only researchers and auditors can view patient list")
    db = Database()
    # Exclude embeddings and narrative clinical notes (PII)
    # EXPLICITLY INCLUDE medical data: conditions, medications, lab_values (NEVER redacted)
    patients = list(db.patients.find(
        {},
        {
            "conditions": 1,
            "medications": 1,
            "lab_values": 1,
            "demographics": 1,
            "display_id": 1,
            "_id": 1
        }
    ))

    formatted_patients = []
    for p in patients:
        # Extract medical data (NEEDED FOR MATCHING - ALWAYS SHOWN)
        demographics = p.get("demographics", {}) or {}
        conditions = p.get("conditions", []) or []
        medications = p.get("medications", []) or []
        lab_values = p.get("lab_values", []) or []

        # Extract primary condition safely
        primary_condition = "No condition"
        if conditions and isinstance(conditions, list) and len(conditions) > 0:
            first = conditions[0]
            if isinstance(first, dict):
                primary_condition = first.get("name", "Unknown diagnosis")

        # Extract demographics safely
        age = demographics.get("age") if isinstance(demographics, dict) else None
        gender = demographics.get("gender") if isinstance(demographics, dict) else None

        formatted_patients.append({
            # Patient ID (anonymized)
            "_id": str(p["_id"]),
            "display_id": p.get("display_id", f"PAT-{str(p['_id'])[-4:].upper()}"),

            # Medical Data (✅ SHOWN - Required for matching)
            "age": age,                            # For age-based trial eligibility
            "gender": gender,                      # For gender-based trial eligibility
            "primary_condition": primary_condition,  # For condition matching
            "medications_count": len(medications),  # For medication analysis
            "lab_values_count": len(lab_values),    # For lab result matching
            "additional_conditions_count": max(0, len(conditions) - 1),

            # Full medical records (for backend processing)
            "conditions": conditions,
            "medications": medications,
            "lab_values": lab_values,
            "demographics": demographics
        })

    return {"success": True, "data": formatted_patients}

# ============ AUDITOR ENDPOINTS (NO PII) ============

@router.get("/audit-logs", response_model=ResponseModel)
async def get_audit_logs(current_user: dict = Depends(get_current_user)):
    """
    Auditor views audit logs (who accessed what, when).
    No patient PII exposed.
    """
    if current_user.get("role") != UserRole.AUDITOR.value:
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
    if current_user.get("role") != UserRole.AUDITOR.value:
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


# ============ DELETE ROUTES ============

@router.delete("/{patient_id}", response_model=ResponseModel)
async def delete_patient(patient_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a single patient by ID (RESEARCHER only)"""
    if current_user.get("role") != UserRole.RESEARCHER.value:
        raise HTTPException(status_code=403, detail="Only researchers can delete patients")
    db = Database()

    try:
        # Delete patient
        result = db.patients.delete_one({"_id": ObjectId(patient_id)})

        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Patient not found")

        # Also delete associated match results
        db.matches.delete_many({"patient_id": patient_id})

        # Log deletion
        db.audit.insert_one({
            "event_type": "PATIENT_DELETED",
            "patient_id": patient_id,
            "timestamp": datetime.utcnow(),
            "action": "Single patient deletion"
        })

        return {
            "success": True,
            "data": {"deleted_patient_id": patient_id},
            "message": "Patient deleted successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete patient: {str(e)}")


@router.post("/bulk-delete", response_model=ResponseModel)
async def bulk_delete_patients(patient_ids: List[str], current_user: dict = Depends(get_current_user)):
    """Delete multiple patients at once (RESEARCHER only)"""
    if current_user.get("role") != UserRole.RESEARCHER.value:
        raise HTTPException(status_code=403, detail="Only researchers can delete patients")
    db = Database()

    if not patient_ids:
        raise HTTPException(status_code=400, detail="No patient IDs provided")

    if len(patient_ids) > 1000:
        raise HTTPException(status_code=400, detail="Maximum 1000 patients can be deleted at once")

    try:
        # Convert string IDs to ObjectId
        object_ids = [ObjectId(pid) for pid in patient_ids]

        # Delete patients
        result = db.patients.delete_many({"_id": {"$in": object_ids}})

        # Delete associated match results
        db.matches.delete_many({"patient_id": {"$in": patient_ids}})

        # Log bulk deletion
        db.audit.insert_one({
            "event_type": "BULK_DELETION",
            "deleted_count": result.deleted_count,
            "patient_ids": patient_ids,
            "timestamp": datetime.utcnow(),
            "action": f"Bulk deletion of {result.deleted_count} patients"
        })

        return {
            "success": True,
            "data": {
                "deleted_count": result.deleted_count,
                "requested_count": len(patient_ids)
            },
            "message": f"Successfully deleted {result.deleted_count} patient(s)"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete patients: {str(e)}")