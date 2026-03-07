from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from bson import ObjectId
import csv
import io
from ..services.match_engine import MatchingEngine
from ..services.trial_matcher import TrialMatcher
from ..core.database import Database
from ..models.users import UserRole
from ..auth import get_current_user

router = APIRouter(prefix="/api/match", tags=["Matching"])

@router.post("/run/{patient_id}")
async def run_match_pipeline(patient_id: str, state: str = "Maharashtra", current_user: dict = Depends(get_current_user)):
    """
    Run match pipeline with state geographic filter and detailed patient-trial mapping (RESEARCHER only).

    Query parameters:
    - state: Filter by state (default: Maharashtra)

    Returns detailed match results showing:
    - How patient data maps to trial criteria
    - Which criteria are met/not met
    - Overall eligibility with reasoning
    """
    if current_user.get("role") != UserRole.RESEARCHER.value:
        raise HTTPException(status_code=403, detail="Only researchers can run matching pipeline")

    db = Database()
    engine = MatchingEngine()
    matcher = TrialMatcher()

    # 1. Get the patient from DB
    patient = db.patients.find_one({"_id": ObjectId(patient_id)})
    if not patient:
        return {"error": "Patient not found"}

    # 2. Run the 3-Tier Matcher with state filter
    results = engine.run_full_pipeline(patient, limit=20, state_filter=state)

    # 3. Enhance results with detailed patient-trial mapping
    detailed_results = []
    for match in results:
        trial = db.trials.find_one({"nct_id": match["nct_id"]})
        if not trial:
            continue

        # Create detailed mapping of patient data to trial criteria
        matching_analysis = matcher.match_patient_to_trial(patient, trial)

        # Enhance match with detailed information
        overall_eligibility = matching_analysis["eligibility_evaluation"]["overall_eligibility"]
        enhanced_match = {
            # Trial Information
            "nct_id": trial.get("nct_id"),
            "title": trial.get("title"),
            "brief_title": trial.get("brief_title"),
            "phase": trial.get("phase"),
            "trial_status": trial.get("status"),  # renamed to avoid conflict
            "sponsor": trial.get("sponsor"),
            "conditions": trial.get("conditions", []),
            "locations": trial.get("locations", []),

            # Patient-Trial Mapping
            "patient_data": matching_analysis["patient_data"],
            "trial_criteria": matching_analysis["trial_criteria"],

            # Eligibility Evaluation
            "inclusion_criteria": matching_analysis["eligibility_evaluation"]["inclusion_criteria"],
            "exclusion_criteria": matching_analysis["eligibility_evaluation"]["exclusion_criteria"],
            "overall_eligibility": overall_eligibility,
            "status": overall_eligibility,  # Frontend-friendly field

            # Detailed Mapping Analysis
            "mapping_analysis": matching_analysis["mapping"],
            "fit_score": matching_analysis["overall_fit"],
            "explanation": matching_analysis["explanation"],

            # Original match data
            "confidence_score": match.get("confidence_score", 0),
            "semantic_score": match.get("semantic_score", 0),
            "distance_km": match.get("distance_km", 0),
            "run_date": match.get("run_date"),
            "tier2_score": match.get("tier2_score")
        }
        detailed_results.append(enhanced_match)

    # 4. Store top results for the doctor to see later
    if detailed_results:
        db.matches.insert_many(detailed_results)

    # Get display ID (handle cases where it might not exist)
    display_id = patient.get("display_id") or f"PAT-{str(patient['_id'])[-4:].upper()}"

    return {
        "success": True,
        "patient": display_id,
        "patient_age": patient.get("demographics", {}).get("age"),
        "patient_gender": patient.get("demographics", {}).get("gender"),
        "state_filter": state,
        "total_matches": len(detailed_results),
        "matches": detailed_results
    }

@router.get("/results/{patient_id}")
async def get_results(patient_id: str, current_user: dict = Depends(get_current_user)):
    """Get matching results (RESEARCHER and AUDITOR)"""
    allowed_roles = [UserRole.RESEARCHER.value, UserRole.AUDITOR.value]
    if current_user.get("role") not in allowed_roles:
        raise HTTPException(status_code=403, detail="Only researchers and auditors can view results")

    db = Database()
    matches = list(db.matches.find({"patient_id": patient_id}).sort("confidence_score", -1))
    for m in matches:
        m["_id"] = str(m["_id"])
    return {"success": True, "data": matches}

@router.get("/results/{patient_id}/export-csv")
async def export_results_csv(patient_id: str, current_user: dict = Depends(get_current_user)):
    """Export trial matching results as CSV (RESEARCHER only)"""
    if current_user.get("role") != UserRole.RESEARCHER.value:
        raise HTTPException(status_code=403, detail="Only researchers can export results")
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