import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..core.database import Database
from ..services.training_service import TrainingService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


class TrainRequest(BaseModel):
    """ML Model training request"""
    model_type: str = "random_forest"  # or "gradient_boosting"
    test_size: float = 0.2
    save_model: bool = True


class TrainResponse(BaseModel):
    """ML Model training response"""
    success: bool
    model_type: str
    message: str
    metrics: dict = {}
    error: str = None


@router.get("/summary")
async def get_system_summary():
    """Get system overview with counts and health metrics"""
    db = Database()

    total_patients = db.patients.count_documents({})
    total_trials = db.trials.count_documents({})
    total_matches = db.matches.count_documents({})

    # Audit stats (Proof of Privacy)
    redaction_logs = list(db.audit.find({"event_type": "PII_REDACTED"}))
    total_redacted = sum(log["details"]["total_entities_redacted"] for log in redaction_logs) if redaction_logs else 0

    # Match Accuracy
    eligible_matches = db.matches.count_documents({"status": "ELIGIBLE"})
    review_needed = db.matches.count_documents({"status": "REVIEW_NEEDED"})

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
                "review_needed": review_needed,
                "ineligible_count": db.matches.count_documents({"status": "INELIGIBLE"})
            }
        }
    }


@router.post("/train", response_model=TrainResponse)
async def train_ml_gatekeeper(request: TrainRequest = None):
    """
    Train ML gatekeeper model on existing match_results data.

    This trains a Random Forest or Gradient Boosting classifier to predict
    trial eligibility before expensive LLM analysis.

    Features engineered from:
    - Patient demographics (age)
    - Trial eligibility criteria (age constraints)
    - Condition overlap (patient conditions vs trial conditions)
    - Lab compatibility (from structured eligibility)
    - Semantic similarity score
    - Trial characteristics (phase, status, enrollment)

    Request body:
    {
        "model_type": "random_forest",  # or "gradient_boosting"
        "test_size": 0.2,
        "save_model": true
    }

    Returns training metrics: accuracy, precision, recall, F1, ROC-AUC
    """
    if not request:
        request = TrainRequest()

    try:
        # Validate request
        if request.model_type not in ["random_forest", "gradient_boosting"]:
            raise HTTPException(
                status_code=400,
                detail="model_type must be 'random_forest' or 'gradient_boosting'"
            )

        logger.info(f"Starting ML gatekeeper training: {request.model_type}")

        # Initialize training service
        training_service = TrainingService(model_type=request.model_type)

        # Run training
        result = training_service.train(
            test_size=request.test_size,
            random_state=42,
            save=request.save_model
        )

        if not result["success"]:
            raise HTTPException(
                status_code=400,
                detail=result.get("error", "Training failed")
            )

        logger.info(f"Training complete: {result['metrics']}")

        return TrainResponse(
            success=True,
            model_type=request.model_type,
            message=f"Model trained successfully on {result['metrics']['train_size']} samples",
            metrics=result["metrics"],
            error=None
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error training model: {e}")
        raise HTTPException(status_code=500, detail=f"Training error: {str(e)}")


@router.get("/ml-model-info")
async def get_ml_model_info():
    """Get information about the trained ML gatekeeper model"""
    try:
        training_service = TrainingService(model_type="random_forest")
        info = training_service.get_model_info()

        return {
            "success": True,
            "data": info
        }

    except Exception as e:
        logger.error(f"Error getting model info: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/training-stats")
async def get_training_stats():
    """Get statistics about training data"""
    try:
        db = Database()

        # Count training samples by label
        eligible_count = db.matches.count_documents({"status": "ELIGIBLE"})
        ineligible_count = db.matches.count_documents({"status": "INELIGIBLE"})
        review_needed_count = db.matches.count_documents({"status": "REVIEW_NEEDED"})
        total_matches = db.matches.count_documents({})

        # Training data would use ELIGIBLE + INELIGIBLE (REVIEW_NEEDED excluded)
        training_samples = eligible_count + ineligible_count

        return {
            "success": True,
            "data": {
                "total_match_results": total_matches,
                "training_samples_available": training_samples,
                "eligible_samples": eligible_count,
                "ineligible_samples": ineligible_count,
                "review_needed_samples": review_needed_count,
                "class_balance": {
                    "eligible_ratio": eligible_count / training_samples if training_samples > 0 else 0,
                    "ineligible_ratio": ineligible_count / training_samples if training_samples > 0 else 0
                },
                "ready_to_train": training_samples >= 50  # Minimum samples needed
            }
        }

    except Exception as e:
        logger.error(f"Error getting training stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))