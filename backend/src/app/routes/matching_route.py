from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from bson import ObjectId
import csv
import io
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

@router.get("/results/{patient_id}/export-csv")
async def export_results_csv(patient_id: str):
    """Export trial matching results as CSV"""
    db = Database()

    # Get patient info
    patient = db.patients.find_one({"_id": ObjectId(patient_id)})
    if not patient:
        return {"error": "Patient not found"}

    # Get all matches
    matches = list(db.matches.find({"patient_id": patient_id}).sort("confidence_score", -1))

    # Create CSV
    output = io.StringIO()
    writer = csv.writer(output)

    # Write headers
    headers = [
        "Patient ID",
        "Patient Age",
        "Patient Gender",
        "Primary Condition",
        "Trial NCT ID",
        "Trial Status",
        "Match Confidence (%)",
        "Similarity Score",
        "Distance (km)",
        "Explanation",
        "Criteria Met",
        "Criteria Failed"
    ]
    writer.writerow(headers)

    # Get patient info
    demographics = patient.get("demographics", {}) or {}
    display_id = patient.get("display_id", f"PAT-{str(patient['_id'])[-4:].upper()}")
    age = demographics.get("age", "N/A")
    gender = demographics.get("gender", "N/A")
    conditions = patient.get("conditions", []) or []
    primary_condition = conditions[0].get("name", "N/A") if conditions else "N/A"

    # Write data rows
    for match in matches:
        writer.writerow([
            display_id,
            age,
            gender,
            primary_condition,
            match.get("nct_id", ""),
            match.get("status", ""),
            round(match.get("confidence_score", 0) * 100, 1),
            round(match.get("tier2_score", 0), 2) if match.get("tier2_score") else "N/A",
            round(match.get("distance_km", 0), 2) if match.get("distance_km") else "N/A",
            match.get("explanation", ""),
            "; ".join(match.get("criteria_met", [])),
            "; ".join(match.get("criteria_failed", []))
        ])

    # Return as downloadable file
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=trial-matches-{display_id}.csv"}
    )