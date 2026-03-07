# ⚡ Quick Start - What to Do Now

## 🎯 Your Main Issues to Fix (In Order)

### 1️⃣ **Maharashtra-Only Geographic Filter**
- **Problem**: System shows trials from all India, not just Maharashtra
- **Solution**: Add state filter in `geo_service.py`
- **Time**: 15 minutes
- **File**: `backend/src/app/services/geo_service.py`

### 2️⃣ **Show Trial Inclusion/Exclusion Criteria**
- **Problem**: Results don't show which trial criteria patient meets/fails
- **Solution**: Create `eligibility_evaluator.py` service
- **Time**: 45 minutes
- **File**: `backend/src/app/services/eligibility_evaluator.py` (NEW)

### 3️⃣ **Display Criteria Breakdown in API Response**
- **Problem**: API response doesn't include criteria details
- **Solution**: Update matching route to show inclusion/exclusion breakdown
- **Time**: 20 minutes
- **File**: `backend/src/app/routes/matching_route.py`

### 4️⃣ **Ensure Fresh API Data**
- **Problem**: May be using cached/old trial data
- **Solution**: Add freshness validation in semantic search
- **Time**: 15 minutes
- **File**: `backend/src/app/services/semantic_search.py`

---

## 📝 Implementation Steps

### Step 1: Add Maharashtra Filter (geo_service.py)

```python
# Add this to geo_service.py

MAHARASHTRA_CITIES = {
    "mumbai", "pune", "nagpur", "thane", "nashik",
    "aurangabad", "solapur", "satara", "kolhapur",
    "ahmednagar", "sangli", "ratnagiri", "sindhudurg"
}

def find_maharashtra_trials(self, age: int, limit: int = 50):
    """Find trials in Maharashtra ONLY"""
    query = {
        "status": "RECRUITING",
        "eligibility.min_age": {"$lte": age},
        "$or": [{"eligibility.max_age": {"$gte": age}}, {"eligibility.max_age": None}],
        "locations.state": {"$in": ["Maharashtra", "MH"]}  # STATE FILTER
    }
    return list(self.db.trials.find(query).limit(limit))
```

---

### Step 2: Create Eligibility Evaluator (NEW SERVICE)

**Create new file:** `backend/src/app/services/eligibility_evaluator.py`

```python
class EligibilityEvaluator:
    """Evaluates how patient matches trial's inclusion/exclusion criteria"""

    def evaluate_trial_criteria(self, patient: dict, trial: dict) -> dict:
        """Compare patient to trial criteria, show which are met/failed"""
        structured_criteria = trial.get("structured_eligibility", {})

        inclusions = self._evaluate_inclusions(patient, structured_criteria)
        exclusions = self._evaluate_exclusions(patient, structured_criteria)

        return {
            "inclusion_criteria": inclusions,
            "exclusion_criteria": exclusions,
            "overall_eligibility": self._compute_overall(inclusions, exclusions)
        }

    def _evaluate_inclusions(self, patient, criteria):
        """Check which inclusion criteria patient meets"""
        inclusions = []

        # Age check
        age = patient.get("demographics", {}).get("age")
        min_age = criteria.get("age", {}).get("min_age")
        max_age = criteria.get("age", {}).get("max_age")

        met = (min_age is None or age >= min_age) and (max_age is None or age <= max_age)
        inclusions.append({
            "criterion": f"Age {min_age}-{max_age}",
            "patient_value": age,
            "status": "MET" if met else "NOT_MET"
        })

        # Condition checks
        patient_conditions = [c.get("name", "").lower() for c in patient.get("conditions", [])]
        for cond in criteria.get("conditions", []):
            if cond.get("requirement") == "required":
                has_it = any(cond["condition"].lower() in pc for pc in patient_conditions)
                inclusions.append({
                    "criterion": f"Has condition: {cond['condition']}",
                    "patient_has": has_it,
                    "status": "MET" if has_it else "NOT_MET"
                })

        return inclusions

    def _evaluate_exclusions(self, patient, criteria):
        """Check exclusion criteria"""
        exclusions = []

        # Medication exclusions
        patient_meds = [m.get("name", "").lower() for m in patient.get("medications", [])]
        for med in criteria.get("medications", []):
            if med.get("requirement") == "excluded":
                has_it = any(med["medication"].lower() in pm for pm in patient_meds)
                exclusions.append({
                    "criterion": f"Cannot have: {med['medication']}",
                    "patient_has": has_it,
                    "status": "NOT_EXCLUDED" if not has_it else "EXCLUDED"
                })

        return exclusions

    def _compute_overall(self, inclusions, exclusions):
        """ELIGIBLE if all inclusions met AND no exclusions"""
        all_met = all(c["status"] == "MET" for c in inclusions)
        none_excluded = all(e["status"] == "NOT_EXCLUDED" for e in exclusions)

        if all_met and none_excluded:
            return "ELIGIBLE"
        elif any(e["status"] == "EXCLUDED" for e in exclusions):
            return "INELIGIBLE"
        else:
            return "REVIEW_NEEDED"
```

---

### Step 3: Update Matching Route

**File:** `backend/src/app/routes/matching_route.py`

Replace the match pipeline to include criteria breakdown:

```python
from ..services.eligibility_evaluator import EligibilityEvaluator

@router.post("/run/{patient_id}")
async def run_match_pipeline(patient_id: str, state: str = "Maharashtra"):
    """Run matching with inclusion/exclusion criteria breakdown"""
    db = Database()
    engine = MatchingEngine()
    evaluator = EligibilityEvaluator()  # NEW

    patient = db.patients.find_one({"_id": ObjectId(patient_id)})
    if not patient:
        return {"error": "Patient not found"}

    # Run 3-tier matching
    results = engine.run_full_pipeline(patient, limit=20)

    # NEW: Add criteria breakdown to each result
    detailed_results = []
    for match in results:
        trial = match["trial"]
        criteria_eval = evaluator.evaluate_trial_criteria(patient, trial)  # NEW

        detailed_results.append({
            "nct_id": trial.get("nct_id"),
            "title": trial.get("title"),
            "brief_title": trial.get("brief_title"),
            "phase": trial.get("phase"),
            "status": trial.get("status"),
            "sponsor": trial.get("sponsor"),

            # NEW: Inclusion/Exclusion breakdown
            "inclusion_criteria": criteria_eval["inclusion_criteria"],
            "exclusion_criteria": criteria_eval["exclusion_criteria"],

            # Existing fields
            "confidence_score": match.get("confidence_score", 0),
            "semantic_score": match.get("semantic_score", 0),
            "distance_km": match.get("distance_km", 0),
            "overall_eligibility": criteria_eval["overall_eligibility"]  # NEW
        })

    return {
        "success": True,
        "patient_id": str(patient["_id"]),
        "state_filter": state,
        "total_matches": len(detailed_results),
        "matches": detailed_results
    }
```

---

### Step 4: Data Freshness Check

**File:** `backend/src/app/services/semantic_search.py`

Add age validation to embedding cache:

```python
# Add to SemanticSearchService

MAX_EMBEDDING_AGE_HOURS = 24

def get_trial_embedding(self, trial_id: str):
    """Get cached embedding if fresh, else recompute"""
    cached = self.embedding_cache.get(trial_id)

    if cached:
        age_hours = (datetime.now() - cached["timestamp"]).total_seconds() / 3600
        if age_hours <= self.MAX_EMBEDDING_AGE_HOURS:
            return cached["embedding"]
        else:
            # Too old, recompute
            del self.embedding_cache[trial_id]

    # Recompute from fresh trial data
    return self._compute_embedding(trial_id)
```

---

## ✅ Verification Checklist

After implementing:

- [ ] Add Maharashtra trial to DB
- [ ] Create test patient with matching condition
- [ ] Run matching: `POST /api/match/run/{patient_id}?state=Maharashtra`
- [ ] Verify response includes `inclusion_criteria` array
- [ ] Verify response includes `exclusion_criteria` array
- [ ] Verify response includes `overall_eligibility` field
- [ ] Verify ALL trials are from Maharashtra only
- [ ] Verify confidence scores are present
- [ ] Verify semantic scores are present

---

## 📊 Before/After Response

### BEFORE (Current)
```json
{
  "success": true,
  "matches": [
    {
      "nct_id": "NCT04582292",
      "title": "Trial Title",
      "confidence_score": 0.87,
      "explanation": "Good match"
    }
  ]
}
```

### AFTER (With Your Enhancements)
```json
{
  "success": true,
  "state_filter": "Maharashtra",
  "total_matches": 3,
  "matches": [
    {
      "nct_id": "NCT04582292",
      "title": "Trial Title",

      "inclusion_criteria": [
        {"criterion": "Age 18-75", "patient_value": 54, "status": "MET"},
        {"criterion": "Type 2 Diabetes", "patient_has": true, "status": "MET"},
        {"criterion": "HbA1c >= 7.5%", "patient_value": "8.2%", "status": "MET"}
      ],

      "exclusion_criteria": [
        {"criterion": "Pregnancy", "patient_has": false, "status": "NOT_EXCLUDED"},
        {"criterion": "Cannot use Insulin", "patient_has": false, "status": "NOT_EXCLUDED"}
      ],

      "overall_eligibility": "ELIGIBLE",
      "confidence_score": 0.87,
      "semantic_score": 0.75,
      "distance_km": 12.5
    }
  ]
}
```

---

## ⏱️ Time Breakdown

| Task | Time | Difficulty |
|------|------|-----------|
| Maharashtra Filter | 15 min | Easy ⭐ |
| Eligibility Evaluator | 45 min | Medium ⭐⭐ |
| Update Route | 20 min | Easy ⭐ |
| Data Freshness | 15 min | Easy ⭐ |
| **TOTAL** | **~2 hours** | |

---

## 🎓 Why These Changes?

Your PS says you must provide:
1. ✅ **"clear eligibility explanations"** → Inclusion/Exclusion breakdown
2. ✅ **"geographic filters"** → Maharashtra state filter
3. ✅ **"ranked recommendations"** → Already done
4. ✅ **"confidence scores"** → Already done
5. ✅ **"transparent matching"** → Detailed criteria evaluation

These 4 tasks complete your Problem Statement requirements! 🎉

