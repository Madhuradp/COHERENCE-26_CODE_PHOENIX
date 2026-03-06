from fastapi import APIRouter, Depends
from bson import ObjectId
from ..services.match_engine import MatchingEngine
from ..core.database import Database

router = APIRouter(prefix="/api/match", tags=["Matching"])

@router.post("/run/{patient_id}")
async def run_match_pipeline(patient_id: str):
    db = Database()
    engine = MatchingEngine()

    # 1. Get the patient from DB
    patient = db.patients.find_one({"_id": ObjectId(patient_id)})
    if not patient:
        return {"error": "Patient not found"}

    # 2. Run the 3-Tier Matcher (DB -> Semantic -> LLM)
    results = engine.run_full_pipeline(patient, limit=20)

    # 3. Store top results for the doctor to see later
    if results:
        db.matches.insert_many(results)

    # Get display ID (handle cases where it might not exist)
    display_id = patient.get("display_id") or f"PAT-{str(patient['_id'])[-4:].upper()}"

    return {"success": True, "patient": display_id, "matches": results}

@router.get("/results/{patient_id}")
async def get_results(patient_id: str):
    db = Database()
    matches = list(db.matches.find({"patient_id": patient_id}).sort("confidence_score", -1))
    for m in matches:
        m["_id"] = str(m["_id"])
    return {"success": True, "data": matches}