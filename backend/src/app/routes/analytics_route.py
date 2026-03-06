from fastapi import APIRouter
from ..core.database import Database

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

@router.get("/summary")
async def get_system_summary():
    db = Database()
    
    total_patients = db.patients.count_documents({})
    total_trials = db.trials.count_documents({})
    total_matches = db.matches.count_documents({})
    
    # Audit stats (Proof of Privacy)
    redaction_logs = list(db.audit.find({"event_type": "PII_REDACTED"}))
    total_redacted = sum(log["details"]["total_entities_redacted"] for log in redaction_logs)
    
    # Match Accuracy
    eligible_matches = db.matches.count_documents({"status": "ELIGIBLE"})
    
    return {
        "success": True,
        "data": {
            "counts": {
                "patients": total_patients,
                "trials": total_trials,
                "matches": total_matches
            },
            "privacy": {
                "entities_protected": total_redacted,
                "audit_logs_count": len(redaction_logs)
            },
            "matching_health": {
                "eligible_count": eligible_matches,
                "review_needed": db.matches.count_documents({"status": "REVIEW_NEEDED"})
            }
        }
    }