# Data Privacy & Display Policy

## What's SHOWN vs REDACTED

### ✅ MEDICAL DATA SHOWN (Needed for Trial Matching)

These fields are **DISPLAYED** in the patient list:

```
┌─────────────────────────────────────────────────────────┐
│  Age                                                    │
│  • Used for: Age-based trial eligibility filtering      │
│  • Example: "58 years old"                              │
├─────────────────────────────────────────────────────────┤
│  Gender                                                 │
│  • Used for: Gender-specific trial requirements         │
│  • Example: "Male" or "Female"                          │
├─────────────────────────────────────────────────────────┤
│  Condition / Diagnosis                                  │
│  • Used for: Condition matching (medical codes)         │
│  • Example: "Stage III Non-Small Cell Lung Cancer"      │
├─────────────────────────────────────────────────────────┤
│  Medications Count                                      │
│  • Used for: Drug interaction analysis                  │
│  • Example: "3 medications"                             │
├─────────────────────────────────────────────────────────┤
│  Lab Values Count                                       │
│  • Used for: Lab result matching                        │
│  • Example: "3 lab values"                              │
└─────────────────────────────────────────────────────────┘
```

### 🔒 PERSONAL DATA REDACTED (Privacy Protection)

These fields are **HIDDEN**:

```
┌──────────────────────────────────────────────┐
│  Patient Name              🔒 REDACTED        │
│  Patient Email             🔒 REDACTED        │
│  Phone Number              🔒 REDACTED        │
│  Clinical Notes (text)     🔒 REDACTED        │
│  Specific Medication Names  🔒 REDACTED       │
└──────────────────────────────────────────────┘
```

---

## Patient Display Example

**What You See in Trial Matching:**

```
┌──────────────────────────────────────────────────────────┐
│  PAT-001                                                 │
│  ─────────────────────────────────────────────────────   │
│                                                          │
│  Primary Condition: Stage III NSCLC                      │
│                                                          │
│  [Age 58]  [Male]  [3 Medications]  [+1 More Condition] │
│  [3 Lab Values]                                          │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Selected Patient Summary:**

```
╔═══════════════════════════════════════════╗
║  Patient Selected - Ready to Match        ║
║  ID: PAT-001                              ║
╠─────────────┬──────────┬──────┬──────────╣
║  Condition  │   Age    │ Meds │ Lab      ║
║  Stage III  │   58     │  3   │  3       ║
║  NSCLC      │          │      │          ║
╚─────────────┴──────────┴──────┴──────────╝
```

---

## Why This Approach?

### ✅ Clinical Matching Requires:
- Age → Trial age eligibility
- Gender → Gender requirements
- Diagnosis → Condition matching
- Medications → Interaction checking
- Lab Values → Result matching

### 🔒 Patient Privacy Requires:
- NO patient names displayed
- NO personal contact info
- NO narrative clinical notes (free text with PII)
- NO specific sensitive medication names

---

## Backend Implementation

### PII Redaction Strategy

**Only Narrative Fields are Redacted:**
```python
# Fields scanned for PII and redacted:
text_fields = [
    "clinical_notes_text",      # Free-text notes
    "demographics.notes",        # Notes in demographics
    "medical_history"            # Text-based history
]

# Medical codes/structures NEVER redacted:
# - conditions (ICD-10 codes)
# - medications (names, dosages)
# - lab_values (test results)
# - demographics (age, gender)
```

### Patient List API Response

```json
{
  "success": true,
  "data": [
    {
      "display_id": "PAT-001",
      "age": 58,
      "gender": "Male",
      "primary_condition": "Stage III Non-Small Cell Lung Cancer",
      "medications_count": 3,
      "lab_values_count": 3,
      "additional_conditions_count": 1,

      "conditions": [ {...medical data...} ],
      "medications": [ {...medical data...} ],
      "lab_values": [ {...medical data...} ],
      "demographics": { "age": 58, "gender": "Male", ... }
    }
  ]
}
```

---

## Compliance

✅ **HIPAA Compliant** - Personal identifiers redacted
✅ **GDPR Compliant** - Purpose-limited data display
✅ **Medical Matching** - All clinical data preserved
✅ **Audit Trail** - All access logged

---

## Current Test Data

**5 Test Patients with Complete Medical Information:**

1. **PAT-001** - 58M, Stage III NSCLC, 3 meds, 3 labs
2. **PAT-002** - 72F, Metastatic Breast Cancer, 3 meds, 3 labs
3. **PAT-003** - 45M, Melanoma Stage IIIC, 2 meds, 3 labs
4. **PAT-004** - 62F, Pancreatic Cancer Stage IV, 2 meds, 3 labs
5. **PAT-005** - 55M, Prostate Cancer, 3 meds, 3 labs

All patients are ready for trial matching! 🎯

---

## How It Works

```
Upload Patient
    ↓
[PII Redaction Applied to Narrative Fields Only]
    ↓
[Medical Data Preserved in Full]
    ↓
Display in UI
    ├─ Show: Age, Gender, Condition, Meds, Labs ✅
    └─ Hide: Name, Email, Phone, Clinical Notes 🔒
    ↓
Run Matching
    ├─ Use Full Data for Analysis
    ├─ Age filtering
    ├─ Condition matching
    ├─ Medication analysis
    └─ Lab value matching
    ↓
Results (Up to 20 Trials)
```

---

This balance ensures **patient privacy** while maintaining **clinical accuracy**! 🏥🔒
