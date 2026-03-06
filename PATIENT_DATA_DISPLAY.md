# Patient Data Display - Privacy-Friendly View

## What Changed

The patient list endpoint now returns a **privacy-friendly, display-optimized format** that shows essential information for matching without exposing sensitive PII.

---

## Data Returned in Patient List

Each patient now includes:

```json
{
  "_id": "69ab29daee2fc4893915cd86",
  "display_id": "PAT-001",
  "age": 58,
  "gender": "Male",
  "primary_condition": "Stage III Non-Small Cell Lung Cancer",
  "additional_conditions_count": 1,
  "medications_count": 3,
  "lab_values_count": 3
}
```

### Fields Displayed:

| Field | Visible | Purpose |
|-------|---------|---------|
| `display_id` | ✅ Yes | Friendly patient identifier (PAT-001, etc.) |
| `age` | ✅ Yes | Age for trial matching eligibility |
| `gender` | ✅ Yes | Gender for trial matching eligibility |
| `primary_condition` | ✅ Yes | Main diagnosis (first condition) |
| `additional_conditions_count` | ✅ Yes | Number of other conditions |
| `medications_count` | ✅ Yes | Total active medications |
| `lab_values_count` | ✅ Yes | Recent lab tests available |

### What's NOT Returned:

| Field | Hidden | Reason |
|-------|--------|--------|
| Specific medication names | ❌ Redacted | Privacy (could identify patient) |
| Lab value details | ❌ Redacted | Privacy (specific health metrics) |
| Contact info | ❌ Redacted | PII protection |
| Dates (exact) | ❌ Redacted | Privacy |
| Clinical notes | ❌ Redacted | PII (mentions doctors, hospitals) |

---

## Patient Dropdown Display

When selecting a patient for matching, you'll see:

```
PAT-001 · Stage III Non-Small Cell Lung Cancer · Age 58 · Male (3 meds) (+1 more)
PAT-002 · Metastatic Breast Cancer · Age 72 · Female (3 meds)
PAT-003 · Melanoma Stage IIIC · Age 45 · Male (2 meds)
```

---

## Full Patient Data Access

When a patient is **selected for matching**, the system loads the complete patient record including:

- All conditions (not just primary)
- All medications (names, dosages, status)
- All lab values (with test results)
- Clinical notes (for LLM analysis)
- Demographics details (location, etc.)

This full data is used internally for:
1. **Tier 1 Matching**: Age/location filters
2. **Tier 2 Matching**: Semantic similarity against trials
3. **Tier 3 Matching**: Rule-based eligibility analysis

---

## Backend Endpoint

**GET `/api/patients/`**

Returns array of simplified patient summaries (non-sensitive display data):

```typescript
[
  {
    _id: string,
    display_id: string,
    age: number | null,
    gender: string | null,
    primary_condition: string,
    additional_conditions_count: number,
    medications_count: number,
    lab_values_count: number
  }
]
```

---

## Privacy Approach

✅ **What You See**: Enough to identify and select patients
✅ **What's Protected**: Sensitive health details remain private
✅ **What's Used**: Full data used internally only for matching analysis

This balances **usability** (you can see who you're matching) with **privacy** (patient details aren't exposed unnecessarily).

---

## Example Patient Upload Data Structure

When uploading patients (for reference):

```json
{
  "display_id": "PAT-001",
  "demographics": {
    "age": 58,
    "gender": "Male",
    "location": { "city": "San Francisco", "state": "CA", "country": "USA" }
  },
  "conditions": [
    { "name": "Stage III Non-Small Cell Lung Cancer", "icd10": "C34.90" },
    { "name": "Type 2 Diabetes Mellitus", "icd10": "E11.9" }
  ],
  "medications": [
    { "name": "Carboplatin", "dosage": "450 mg IV", "status": "active" },
    { "name": "Pemetrexed", "dosage": "500 mg/m2", "status": "active" },
    { "name": "Metformin", "dosage": "1000 mg daily", "status": "active" }
  ],
  "lab_values": [
    { "name": "EGFR", "value": 45, "unit": "mL/min/1.73m2", "date": "2024-03-01" },
    { "name": "HbA1c", "value": 7.2, "unit": "%", "date": "2024-03-01" },
    { "name": "WBC", "value": 6.8, "unit": "K/uL", "date": "2024-03-01" }
  ],
  "clinical_notes_text": "58-year-old male with stage 3 NSCLC...",
  "patient_email": "patient1@example.com"
}
```

---

## Now You Can:

1. ✅ **See patient names** (PAT-001, etc.)
2. ✅ **See age and gender** (relevant for trial matching)
3. ✅ **See primary condition** (diagnosis)
4. ✅ **See data availability** (how many meds, labs, conditions)
5. ✅ **Keep patient privacy** (no sensitive details exposed)

Refresh your dashboard and try the patient matching again! 🎯
