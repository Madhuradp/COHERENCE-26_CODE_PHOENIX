"""
Testing API Routes

Endpoints for dynamic testing against real clinical trial and patient data.
"""

from fastapi import APIRouter, Query, Depends, HTTPException
from ..services.dynamic_test_engine import DynamicTestEngine
from ..core.database import Database
from ..models.users import UserRole
from ..auth import get_current_user

router = APIRouter(prefix="/api/test", tags=["Testing"])
db = Database()


@router.post("/run-dynamic-tests")
async def run_dynamic_tests(
    state: str = Query("Maharashtra", description="State filter for trials"),
    limit_trials: int = Query(10, description="Max trials to test"),
    limit_patients: int = Query(5, description="Max patients to test"),
    current_user: dict = Depends(get_current_user)
):
    """
    Run dynamic tests against all available trials and patients (RESEARCHER only).

    This endpoint:
    1. Fetches available trials from database (filtered by state)
    2. Fetches available patient data from uploads
    3. Creates test cases for all combinations
    4. Runs matching pipeline for each combination
    5. Returns comprehensive test results and statistics

    Query Parameters:
    - state: Filter trials by state (default: Maharashtra)
    - limit_trials: Maximum trials to test (default: 10)
    - limit_patients: Maximum patients to test (default: 5)
    """
    if current_user.get("role") != UserRole.RESEARCHER.value:
        raise HTTPException(status_code=403, detail="Only researchers can run tests")

    engine = DynamicTestEngine()

    # Run tests
    results = engine.run_dynamic_tests(
        state=state,
        limit_trials=limit_trials,
        limit_patients=limit_patients
    )

    # Save results
    if results.get("success"):
        test_run_id = engine.save_test_results(results)
        results["saved_test_id"] = test_run_id

    return results


@router.post("/run-patient-tests/{patient_id}")
async def run_patient_tests(
    patient_id: str,
    state: str = Query("Maharashtra", description="State filter for trials"),
    limit_trials: int = Query(20, description="Max trials to test"),
    current_user: dict = Depends(get_current_user)
):
    """
    Run tests for a specific patient against available trials (RESEARCHER only).

    This endpoint:
    1. Fetches specific patient data
    2. Fetches available trials (filtered by state)
    3. Runs matching pipeline for each trial
    4. Returns ranked results with detailed analysis

    Path Parameters:
    - patient_id: Patient MongoDB ID

    Query Parameters:
    - state: Filter trials by state (default: Maharashtra)
    - limit_trials: Maximum trials to test (default: 20)
    """
    if current_user.get("role") != UserRole.RESEARCHER.value:
        raise HTTPException(status_code=403, detail="Only researchers can run tests")

    engine = DynamicTestEngine()

    # Run patient-specific tests
    results = engine.run_specific_patient_tests(
        patient_id=patient_id,
        state=state,
        limit_trials=limit_trials
    )

    return results


@router.get("/available-data")
async def get_available_data(
    state: str = Query("Maharashtra", description="State filter"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get statistics about available test data (RESEARCHER and AUDITOR).

    Returns:
    - Number of available trials
    - Number of available patients
    - State filter applied
    """
    allowed_roles = [UserRole.RESEARCHER.value, UserRole.AUDITOR.value]
    if current_user.get("role") not in allowed_roles:
        raise HTTPException(status_code=403, detail="Only researchers and auditors can view available data")
    # Count trials
    trials_count = db.trials.count_documents({
        "status": "RECRUITING",
        "locations.state": {"$in": [state, state.upper(), state.lower()]}
    })

    # Count patients
    patients_count = db.patients.count_documents({})

    # Get sample data info
    sample_trial = db.trials.find_one({
        "status": "RECRUITING",
        "locations.state": {"$in": [state, state.upper(), state.lower()]}
    })

    sample_patient = db.patients.find_one({})

    return {
        "available_trials": trials_count,
        "available_patients": patients_count,
        "state_filter": state,
        "can_run_tests": trials_count > 0 and patients_count > 0,
        "data_summary": {
            "trials": {
                "total": trials_count,
                "sample": {
                    "nct_id": sample_trial.get("nct_id") if sample_trial else None,
                    "title": sample_trial.get("title") if sample_trial else None,
                    "phase": sample_trial.get("phase") if sample_trial else None,
                } if sample_trial else None
            },
            "patients": {
                "total": patients_count,
                "sample": {
                    "age": sample_patient.get("demographics", {}).get("age") if sample_patient else None,
                    "gender": sample_patient.get("demographics", {}).get("gender") if sample_patient else None,
                    "conditions": [c.get("name") for c in sample_patient.get("conditions", [])] if sample_patient else None,
                } if sample_patient else None
            }
        }
    }


@router.get("/test-history")
async def get_test_history(
    limit: int = Query(10, description="Number of test runs to retrieve"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get history of previous test runs (RESEARCHER and AUDITOR).

    Query Parameters:
    - limit: Number of test runs to retrieve (default: 10)
    """
    allowed_roles = [UserRole.RESEARCHER.value, UserRole.AUDITOR.value]
    if current_user.get("role") not in allowed_roles:
        raise HTTPException(status_code=403, detail="Only researchers and auditors can view test history")
    engine = DynamicTestEngine()
    history = engine.get_test_history(limit=limit)

    return {
        "success": True,
        "total_test_runs": len(history),
        "test_runs": history
    }


@router.post("/validate-matching")
async def validate_matching(
    patient_id: str = Query(..., description="Patient ID to validate"),
    trial_id: str = Query(..., description="Trial NCT ID to validate"),
    current_user: dict = Depends(get_current_user)
):
    """
    Validate matching for a specific patient-trial combination (RESEARCHER only).

    This is a quick validation endpoint that shows:
    - Whether patient meets inclusion criteria
    - Whether patient has exclusions
    - Overall eligibility
    - Fit score

    Query Parameters:
    - patient_id: Patient MongoDB ID
    - trial_id: Trial NCT ID
    """
    if current_user.get("role") != UserRole.RESEARCHER.value:
        raise HTTPException(status_code=403, detail="Only researchers can validate matching")

    from bson import ObjectId

    # Get data
    patient = db.patients.find_one({"_id": ObjectId(patient_id)})
    trial = db.trials.find_one({"nct_id": trial_id})

    if not patient or not trial:
        return {
            "error": "Patient or trial not found",
            "patient_found": patient is not None,
            "trial_found": trial is not None
        }

    # Run validation
    engine = DynamicTestEngine()
    result = engine._run_single_test(patient, trial)

    return result


@router.post("/bulk-validate")
async def bulk_validate(
    state: str = Query("Maharashtra", description="State filter"),
    limit: int = Query(5, description="Number of patient-trial pairs to validate"),
    current_user: dict = Depends(get_current_user)
):
    """
    Quickly validate multiple patient-trial combinations (RESEARCHER only).

    Useful for:
    - Getting a quick overview of matching performance
    - Checking system responsiveness
    - Validating data quality

    Query Parameters:
    - state: Filter trials by state (default: Maharashtra)
    - limit: Number of combinations to validate (default: 5)
    """
    if current_user.get("role") != UserRole.RESEARCHER.value:
        raise HTTPException(status_code=403, detail="Only researchers can validate matching")

    engine = DynamicTestEngine()

    # Get sample data
    trials = engine._get_available_trials(state, limit)
    patients = engine._get_available_patients(limit)

    if not trials or not patients:
        return {
            "error": "Insufficient data",
            "trials_available": len(trials),
            "patients_available": len(patients)
        }

    # Validate combinations
    validations = []
    for i, patient in enumerate(patients[:limit]):
        for j, trial in enumerate(trials[:limit]):
            if i + j < limit:  # Limit total validations
                result = engine._run_single_test(patient, trial)
                validations.append({
                    "patient_id": str(patient.get("_id", "")),
                    "trial_id": trial.get("nct_id"),
                    "eligibility": result.get("overall_eligibility"),
                    "fit_score": result.get("fit_score", {}).get("overall_fit", 0),
                })

    return {
        "success": True,
        "total_validations": len(validations),
        "validations": validations,
        "summary": {
            "eligible": sum(1 for v in validations if v["eligibility"] == "ELIGIBLE"),
            "ineligible": sum(1 for v in validations if v["eligibility"] == "INELIGIBLE"),
            "review_needed": sum(1 for v in validations if v["eligibility"] == "REVIEW_NEEDED"),
            "average_fit_score": round(sum(v["fit_score"] for v in validations) / len(validations), 2) if validations else 0,
        }
    }
