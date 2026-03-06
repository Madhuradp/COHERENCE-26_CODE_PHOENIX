# Clinical Trial Matcher - Workflow Guide

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│          Clinical Trials Sync (Scrapper)                    │
│  POST /api/trials/sync → Fetches from ClinicalTrials.gov    │
│  Stores in ClinicalTrial model format with embeddings       │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│            Clinical Trials Database                          │
│  Indexed by NCT ID, conditions, eligibility criteria        │
│  Contains embeddings for semantic search                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│          Patient Data Upload (Multi-Role)                   │
│  POST /api/patients/upload (Doctors/Pharma/Researchers)     │
│  POST /api/patients/self-upload (Patients)                  │
│  Auto PII redaction with audit logging                      │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│            Patient Database (PII-Safe)                       │
│  Contains redacted medical records                          │
│  Embeddings for semantic matching                           │
│  Linked to audit logs for compliance                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│         3-Tier Matching Pipeline                            │
│  Tier 1: Database - Age/location/status filters             │
│  Tier 2: Semantic - Biomedical embeddings similarity        │
│  Tier 3: LLM - Detailed clinical analysis                   │
└─────────────────────────────────────────────────────────────┘
```

---

## User Roles & Permissions

### 1. **PATIENT**
**What they can do:**
- Upload their own medical records
- Search for trials they match
- View their own profile and match results

**Endpoints:**
- `POST /api/patients/self-upload` - Upload medical records
- `POST /api/patients/find-my-matches?patient_id=X` - Find matching trials
- `GET /api/trials/search/structured?condition=X&age=Y` - Search trials

**Example Workflow:**
```
1. Register as PATIENT role
2. POST /api/patients/self-upload {"conditions": [{"name": "diabetes"}], ...}
   → Returns patient_id
3. POST /api/patients/find-my-matches?patient_id=<id>
   → Returns top matching trials with clinical reasoning
```

---

### 2. **DOCTOR**
**What they can do:**
- Upload patient data for multiple patients
- Access patient matching results
- Recommend trials to their patients

**Endpoints:**
- `POST /api/patients/upload` - Upload patient data
- `GET /api/patients/` - View all redacted patients (for reference)
- `POST /api/match/run/{patient_id}` - Trigger matching for a patient

**Example Workflow:**
```
1. Login as DOCTOR
2. POST /api/patients/upload {"patient_name": "...", "conditions": [...]}
   → Returns patient_id (name is redacted to [PERSON])
3. View patient in /api/patients/ (redacted)
4. POST /api/match/run/patient_id
   → Runs 3-tier matching, saves results
5. Review match results with clinical insights
```

---

### 3. **RESEARCHER**
**What they can do:**
- Access anonymized patient cohorts
- Analyze matching patterns
- Extract data for research (no PII)

**Endpoints:**
- `GET /api/patients/` - List all redacted patients
- `GET /api/match/results/` - View aggregated matching data
- `POST /api/trials/search/structured` - Advanced trial queries

---

### 4. **PHARMACIST**
**What they can do:**
- Review medication interactions
- Audit medication-related exclusions
- Monitor drug-related trial eligibility

**Endpoints:**
- `POST /api/patients/upload` - Upload patient medication data
- `GET /api/trials/search/structured?excluded_medication=X` - Find trials avoiding specific drugs

---

### 5. **AUDITOR**
**What they can do:**
- View audit logs (who accessed what, when)
- Monitor fairness & compliance statistics
- **CANNOT see patient PII**
- Verify that all systems are working ethically

**Endpoints:**
- `GET /api/patients/audit-logs` - Complete audit trail (no PII)
- `GET /api/patients/fairness-stats` - Compliance metrics

**Example Audit Log Entry:**
```json
{
  "document_id": "507f1f77bcf86cd799439011",
  "document_type": "patient",
  "timestamp": "2026-03-06T10:30:00",
  "user_email": "doctor@hospital.com",
  "event_type": "PII_REDACTED",
  "action": "Patient uploaded - Redacted 3 PII entities (NAME, PHONE, EMAIL)"
}
```

---

## Complete Patient Matching Workflow

### Step 1: Clinical Trial Sync (Admin/Automation)
```bash
# Fetch and store latest trials from ClinicalTrials.gov
POST /api/trials/sync?extract_criteria=true

Response:
{
  "success": true,
  "message": "Synced 50 trials",
  "extraction_stats": {
    "success": 45,
    "failed": 3,
    "skipped": 2
  }
}
```

---

### Step 2a: Doctor Uploads Patient Data
```bash
POST /api/patients/upload
{
  "full_name": "John Doe",           # Will be redacted to [PERSON]
  "email": "john@example.com",       # Will be redacted to [EMAIL]
  "phone": "+1-555-1234",            # Will be redacted to [PHONE]
  "conditions": [
    {"name": "Type 2 Diabetes", "status": "active"},
    {"name": "Hypertension", "status": "active"}
  ],
  "medications": [
    {"name": "Metformin", "dose": "500mg", "status": "active"}
  ],
  "lab_values": [
    {"name": "HbA1c", "value": 7.5, "unit": "%"}
  ],
  "demographics": {
    "age": 52,
    "gender": "M",
    "location": {"coordinates": [-73.97, 40.77]}
  }
}

Response:
{
  "success": true,
  "data": {"id": "507f1f77bcf86cd799439011"},
  "message": "Patient ingested and redacted successfully"
}
```

---

### Step 2b: Patient Self-Uploads Medical Records
```bash
POST /api/patients/self-upload
Headers: Authorization: Bearer <JWT_TOKEN>
{
  "conditions": [
    {"name": "Type 2 Diabetes", "status": "active"}
  ],
  "medications": [
    {"name": "Metformin", "dose": "500mg"}
  ],
  "demographics": {
    "age": 52,
    "gender": "M",
    "location": {"coordinates": [-73.97, 40.77]}
  }
}

Response:
{
  "success": true,
  "data": {"id": "507f1f77bcf86cd799439011"},
  "message": "Your medical records uploaded successfully"
}
```

---

### Step 3: Trial Search (Patient or Doctor)
```bash
# Simple search (text-based)
GET /api/trials/search?condition=diabetes

# Advanced search (structured filtering)
GET /api/trials/search?condition=diabetes&min_age=40&max_age=70&excluded_medication=warfarin

Response:
{
  "success": true,
  "count": 12,
  "data": [
    {
      "nct_id": "NCT04271397",
      "title": "Diabetes Management Trial",
      "phase": "Phase 3",
      "conditions": ["Type 2 Diabetes"],
      "eligibility": {
        "min_age": 40,
        "max_age": 70,
        "gender": "ALL"
      }
    },
    ...
  ]
}
```

---

### Step 4: Run 3-Tier Matching Pipeline
```bash
POST /api/match/run/507f1f77bcf86cd799439011

Response:
{
  "success": true,
  "data": [
    {
      "patient_id": "507f1f77bcf86cd799439011",
      "nct_id": "NCT04271397",
      "status": "ELIGIBLE",
      "confidence": 0.92,
      "semantic_similarity": 0.87,
      "clinical_summary": "Patient meets key criteria including age range, diagnosis, and lab values",
      "reasoning": "HbA1c level (7.5%) indicates optimal trial fit for diabetes management studies",
      "criteria_met": ["Age 40-70", "Type 2 Diabetes diagnosis", "HbA1c > 7%"],
      "clinical_concerns": ["Check kidney function before enrollment"],
      "recommendation": "Highly suitable - Recommend discussing with trial coordinator",
      "distance_km": 12.5,
      "run_date": "2026-03-06T10:45:00"
    }
  ]
}
```

---

### Step 5: Auditor Reviews Compliance
```bash
# View all audit logs
GET /api/patients/audit-logs
Headers: Authorization: Bearer <AUDITOR_JWT>

Response:
{
  "success": true,
  "data": [
    {
      "document_id": "507f1f77bcf86cd799439011",
      "document_type": "patient",
      "timestamp": "2026-03-06T10:30:00",
      "user_email": "doctor@hospital.com",
      "event_type": "PII_REDACTED",
      "action": "Patient uploaded - Redacted 3 entities"
    }
  ]
}
```

```bash
# View fairness statistics
GET /api/patients/fairness-stats
Headers: Authorization: Bearer <AUDITOR_JWT>

Response:
{
  "success": true,
  "data": {
    "total_patients_ingested": 127,
    "total_match_results_generated": 1042,
    "total_pii_entities_redacted": 381,
    "audit_logs_count": 127,
    "compliance_status": "All data properly redacted"
  }
}
```

---

## Data Flow Security

### PII Protection
1. **On Upload**: Automatic detection & redaction (Names → [PERSON], Emails → [EMAIL], etc.)
2. **In Database**: Only redacted data stored
3. **On Access**:
   - Doctors see redacted patient data
   - Auditors see ONLY metadata (no patient records)
   - Patients see their own unredacted data

### Audit Trail
Every action is logged:
- Who accessed what
- When and from where
- What PII was redacted
- Matching results generated

---

## API Reference Summary

| Endpoint | Role | Purpose |
|----------|------|---------|
| `POST /api/trials/sync` | Admin | Sync from ClinicalTrials.gov |
| `GET /api/trials/search` | All | Search trials (simple or advanced) |
| `POST /api/patients/upload` | Doctor/Pharma/Researcher | Upload patient data |
| `POST /api/patients/self-upload` | Patient | Patient uploads own records |
| `GET /api/patients/` | Doctor/Researcher | View redacted patients |
| `POST /api/patients/find-my-matches` | Patient | Find own trial matches |
| `POST /api/match/run/{id}` | Doctor/Researcher | Trigger matching |
| `GET /api/patients/audit-logs` | Auditor | View audit trail |
| `GET /api/patients/fairness-stats` | Auditor | View compliance stats |

### Trial Search Examples

```bash
# Simple search
GET /api/trials/search?condition=diabetes

# Advanced search (age + medication filters)
GET /api/trials/search?condition=diabetes&min_age=40&max_age=70&excluded_medication=warfarin

# Custom limit
GET /api/trials/search?condition=diabetes&limit=100
```

---

## Example: Complete Patient Journey

```
1. PATIENT registers as "PATIENT" role
2. PATIENT POSTs /api/patients/self-upload with medical data
3. PATIENT GETs /api/trials/search?condition=diabetes to see available trials
4. PATIENT POSTs /api/patients/find-my-matches to get personalized matches
5. PATIENT reviews results with clinical recommendations
6. DOCTOR can also see this patient and all their match data
7. AUDITOR can verify compliance without seeing any patient details
```

---

## Security & Compliance

✅ **PII Redaction**: Automatic detection and masking
✅ **Audit Logging**: Complete trail of all actions
✅ **Role-Based Access**: Different permissions by role
✅ **Semantic Matching**: Clinically intelligent trial recommendations
✅ **LLM Analysis**: Expert-level clinical assessment

All data flows are compliant with healthcare privacy standards.
