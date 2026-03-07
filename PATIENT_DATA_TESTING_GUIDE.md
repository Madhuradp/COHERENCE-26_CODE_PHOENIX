# Patient Test Data Guide - COHERENCE-26

## Overview
This guide explains how to use the `PATIENT_TEST_DATA.csv` file to test the clinical trial matching system with realistic patient data.

## File Location
- **CSV File**: `PATIENT_TEST_DATA.csv`
- **Format**: CSV (Comma-Separated Values)
- **Records**: 15 realistic cancer patient profiles
- **Size**: ~4.5 KB

## CSV Column Mapping

| CSV Column | Backend Field | Type | Example |
|-----------|---------------|------|---------|
| Patient_Name | (Redacted - PII) | string | "John Smith" |
| Age | demographics.age | integer | 58 |
| Gender | demographics.gender | string | "Male" / "Female" |
| Primary_Condition | conditions[0].name | string | "Non-Small Cell Lung Cancer" |
| Additional_Conditions | conditions[1+].name | string | "Type 2 Diabetes" |
| Current_Medications | medications[].name | string | "Carboplatin, Pemetrexed" |
| Lab_Values | lab_values[] | object | "Creatinine: 1.2, Hemoglobin: 11.5" |
| Clinical_Notes | clinical_notes_text | string | "58 year old male with stage IIIB..." |

## PII Detection & Redaction

**The system automatically detects and redacts:**
- ✅ Patient names (e.g., "John Smith", "Mary Johnson")
- ✅ Names in clinical notes (e.g., "husband Mark Johnson", "Dr. Lisa Wong")
- ✅ Phone numbers (e.g., "617-555-0123")
- ✅ Email addresses (e.g., "james.anderson@email.com")
- ✅ SSNs (e.g., "SSN pending")
- ✅ Dates/dates of birth (e.g., "born 1957", "January 2024")
- ✅ Hospital IDs / Medical record numbers (e.g., "#HC-71-2024")
- ✅ Insurance information (e.g., "Medicare A+B")

**Clinical data is PRESERVED** (never redacted):
- ✅ Conditions & diagnoses
- ✅ Medications
- ✅ Lab values
- ✅ Age
- ✅ Gender
- ✅ ECOG performance status
- ✅ Cancer staging information

## Usage Workflows

### Option 1: Manual Testing (Single Patient)

**1. Login to the system**
```bash
# Get JWT token
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "researcher@test.edu",
    "password": "SecurePassword123"
  }'
```

**2. Upload a single patient (JSON format)**
```bash
curl -X POST http://localhost:8000/api/patients/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "demographics": {
      "age": 58,
      "gender": "Male"
    },
    "conditions": [
      {"name": "Non-Small Cell Lung Cancer"},
      {"name": "Type 2 Diabetes"}
    ],
    "medications": [
      {"name": "Carboplatin"},
      {"name": "Pemetrexed"},
      {"name": "Metformin"}
    ],
    "lab_values": [
      {"name": "Creatinine", "value": "1.2"},
      {"name": "Hemoglobin", "value": "11.5"},
      {"name": "WBC", "value": "4.2"}
    ],
    "clinical_notes_text": "58 year old male with stage IIIB NSCLC, adenocarcinoma histology..."
  }'
```

**3. View uploaded patient**
```bash
curl -X GET http://localhost:8000/api/patients/ \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**4. Run matching for patient**
```bash
curl -X POST http://localhost:8000/api/match/run/{patient_id} \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**5. Check PII redaction**
```bash
curl -X GET http://localhost:8000/api/patients/pii-check/{patient_id} \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### Option 2: Bulk Upload (Multiple Patients)

**1. Prepare JSON array from CSV**

Convert the CSV to JSON array format:

```json
[
  {
    "demographics": {
      "age": 58,
      "gender": "Male"
    },
    "conditions": [
      {"name": "Non-Small Cell Lung Cancer"},
      {"name": "Type 2 Diabetes"}
    ],
    "medications": [
      {"name": "Carboplatin"},
      {"name": "Pemetrexed"},
      {"name": "Metformin"}
    ],
    "lab_values": [
      {"name": "Creatinine", "value": "1.2"},
      {"name": "Hemoglobin", "value": "11.5"},
      {"name": "WBC", "value": "4.2"}
    ],
    "clinical_notes_text": "58 year old male with stage IIIB NSCLC..."
  },
  {
    "demographics": {
      "age": 72,
      "gender": "Female"
    },
    ...
  }
]
```

**2. Upload bulk patients**
```bash
curl -X POST http://localhost:8000/api/patients/bulk-upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '@patient_bulk_data.json'
```

**3. Check upload results**
```
Response:
{
  "success": true,
  "data": {
    "success_count": 15,
    "failed_count": 0,
    "patient_ids": ["65a1b2c3d4e5f6g7h8i9j0k1", ...],
    "total_pii_entities": 127
  }
}
```

---

### Option 3: Web UI Testing

**1. Navigate to frontend**
- Go to: `http://localhost:3000`

**2. Login as Researcher**
- Email: `researcher@test.edu`
- Password: `SecurePassword123`

**3. Upload Patient (Single)**
- Menu: Dashboard → Patients → Upload
- Paste JSON patient data
- Submit

**4. Bulk Upload**
- Menu: Dashboard → Patients → Bulk Upload
- Upload CSV or JSON file
- Monitor progress

**5. View Patients**
- Menu: Dashboard → Patients → List
- Verify conditions, medications, lab values visible
- Verify names/contact info redacted

**6. Run Matching**
- Select patient from list
- Click "Find Trials"
- Monitor semantic search + LLM analysis

**7. View Results**
- Check matching results
- Verify semantic similarity scores
- Check clinical fit assessment

---

## Test Scenarios

### Scenario 1: Basic Matching Test
**Patient**: John Smith (NSCLC + Diabetes)
**Expected**:
- ✅ PII redacted (name, phone, email removed)
- ✅ Medical data preserved (conditions, meds, labs shown)
- ✅ Semantic search finds relevant lung cancer trials
- ✅ LLM analyzes eligibility based on staging + comorbidities

**Command**:
```bash
# Upload
curl -X POST http://localhost:8000/api/patients/upload \
  -H "Authorization: Bearer TOKEN" \
  -d @john_smith.json

# Match
curl -X POST http://localhost:8000/api/match/run/{patient_id} \
  -H "Authorization: Bearer TOKEN"
```

---

### Scenario 2: PII Redaction Test
**Patient**: Any patient (contains names, emails, phone numbers)
**Expected**:
- ✅ Detected PII entities logged
- ✅ Patient data stored REDACTED
- ✅ Audit logs show redaction events
- ✅ Audit trail identifies who/when redacted

**Command**:
```bash
# Check PII before upload
curl -X POST http://localhost:8000/api/pii/check-text \
  -H "Authorization: Bearer TOKEN" \
  -d '{"text": "58 year old male with husband Mark Johnson..."}'

# View redaction logs
curl -X GET http://localhost:8000/api/patients/audit-logs \
  -H "Authorization: Bearer TOKEN"
```

---

### Scenario 3: Bulk Processing Test
**Patients**: All 15 records
**Expected**:
- ✅ 15/15 successfully ingested
- ✅ Total PII entities detected ~120-150
- ✅ All embeddings generated
- ✅ All records searchable

**Command**:
```bash
curl -X POST http://localhost:8000/api/patients/bulk-upload \
  -H "Authorization: Bearer TOKEN" \
  -d '@bulk_patients.json' | jq '.data'

# Output should show:
# "success_count": 15
# "failed_count": 0
# "total_pii_entities": ~130
```

---

### Scenario 4: Fairness & Compliance Test
**Check**: Demographics distribution + PII protection
**Expected**:
- ✅ Age range: 45-72 (realistic)
- ✅ Gender distribution: Mixed
- ✅ Condition variety: 11 different cancers
- ✅ All patients have PII redaction audit logs

**Command**:
```bash
# Get fairness stats
curl -X GET http://localhost:8000/api/patients/fairness-stats \
  -H "Authorization: Bearer TOKEN"

# Output shows:
# "total_patients_ingested": 15
# "total_pii_entities_redacted": 130
# "compliance_status": "All data properly redacted"
```

---

## Data Sample Details

### Patient 1: John Smith (NSCLC)
- **Age**: 58, **Gender**: Male
- **Primary Condition**: Non-Small Cell Lung Cancer
- **Comorbidity**: Type 2 Diabetes
- **Meds**: Carboplatin, Pemetrexed, Metformin
- **Labs**: Creatinine 1.2, Hgb 11.5, WBC 4.2
- **PII in Notes**: Name "John Smith", wife name
- **Expected Matches**: NSCLC trials, advanced stage focus

### Patient 2: Mary Johnson (Colorectal)
- **Age**: 72, **Gender**: Female
- **Primary Condition**: Colorectal Cancer (Stage III)
- **Comorbidity**: Hypertension
- **Meds**: 5-FU, Oxaliplatin, Lisinopril
- **Labs**: Albumin 3.8, CEA 2.1, Creatinine 0.9
- **PII in Notes**: Doctor name "Robert Chen", location "Boston MA"
- **Expected Matches**: Colorectal cancer adjuvant/maintenance trials

### Patient 15: Susan Garcia (HER2+ Breast)
- **Age**: 58, **Female**
- **Primary Condition**: Breast Cancer (HER2+, Metastatic)
- **Comorbidity**: Depression
- **Meds**: Trastuzumab, Pertuzumab, Docetaxel, Fluoxetine
- **Labs**: HER2 3+, ER Negative, Hgb 12.0, ALT 25
- **PII in Notes**: Doctor names, hospital, app sharing reference
- **Expected Matches**: HER2+ metastatic breast cancer trials, anti-HER2 focused

---

## Conversion Scripts

### Python: CSV → JSON
```python
import csv
import json

with open('PATIENT_TEST_DATA.csv') as f:
    reader = csv.DictReader(f)
    patients = []

    for row in reader:
        # Parse medications
        meds = [{"name": m.strip()} for m in row['Current_Medications'].split(',')]

        # Parse conditions
        conditions = [{"name": row['Primary_Condition']}]
        if row.get('Additional_Conditions'):
            additional = [{"name": c.strip()}
                         for c in row['Additional_Conditions'].split(',')]
            conditions.extend(additional)

        # Parse lab values
        lab_values = []
        if row.get('Lab_Values'):
            for lab in row['Lab_Values'].split(','):
                parts = lab.strip().split(':')
                if len(parts) == 2:
                    lab_values.append({
                        "name": parts[0].strip(),
                        "value": parts[1].strip()
                    })

        patient = {
            "demographics": {
                "age": int(row['Age']),
                "gender": row['Gender']
            },
            "conditions": conditions,
            "medications": meds,
            "lab_values": lab_values,
            "clinical_notes_text": row['Clinical_Notes']
        }
        patients.append(patient)

# Save
with open('bulk_patients.json', 'w') as f:
    json.dump(patients, f, indent=2)
```

### JavaScript/Node.js: CSV → JSON
```javascript
const fs = require('fs');
const csv = require('csv-parse/sync');

const content = fs.readFileSync('PATIENT_TEST_DATA.csv', 'utf-8');
const records = csv.parse(content, { columns: true });

const patients = records.map(row => ({
  demographics: {
    age: parseInt(row.Age),
    gender: row.Gender
  },
  conditions: [
    { name: row.Primary_Condition },
    ...row.Additional_Conditions
      .split(',')
      .map(c => ({ name: c.trim() }))
  ],
  medications: row.Current_Medications
    .split(',')
    .map(m => ({ name: m.trim() })),
  lab_values: row.Lab_Values
    .split(',')
    .map(lab => {
      const [name, value] = lab.split(':');
      return { name: name.trim(), value: value.trim() };
    }),
  clinical_notes_text: row.Clinical_Notes
}));

fs.writeFileSync('bulk_patients.json', JSON.stringify(patients, null, 2));
```

---

## Expected System Behavior

### ✅ What Should Happen

1. **Upload Phase**
   - CSV/JSON parsed correctly
   - Age, gender extracted → demographics
   - Conditions parsed to array of objects
   - Medications split and formatted
   - Lab values split to name/value pairs

2. **PII Redaction Phase**
   - Patient names redacted (e.g., "[PERSON]")
   - Doctor names redacted
   - Phone numbers redacted
   - Email addresses redacted
   - Hospital/location references redacted
   - Clinical notes text stored REDACTED
   - Audit log created documenting redaction

3. **Embedding Generation Phase**
   - Patient embedding generated from:
     - Condition names
     - Medication names
     - Lab value names/values
     - Age
     - Redacted clinical notes (if present)

4. **Database Storage**
   - Patient stored with REDACTED data
   - Embedding stored for fast semantic search
   - Display ID generated (e.g., "PAT-A1B2")

5. **Matching Phase**
   - Semantic search ranks trials by similarity
   - LLM analyzes eligibility
   - Results stored with confidence scores

---

## Troubleshooting

### Issue: "Invalid patient data" on upload

**Check**:
- ✅ Age is integer (not string)
- ✅ Gender is "Male" or "Female"
- ✅ conditions array has objects with "name" field
- ✅ medications array has objects with "name" field
- ✅ lab_values has name and value fields

### Issue: "PII redaction failing"

**Check**:
- ✅ Presidio service running
- ✅ Clinical notes not malformed
- ✅ No unusual character encoding

### Issue: "Embedding generation timeout"

**Check**:
- ✅ Model downloaded (first run slower)
- ✅ VRAM available (>2GB recommended)
- ✅ Not too many parallel uploads

### Issue: "Matching returns no results"

**Check**:
- ✅ Trials database populated
- ✅ Patient conditions match trial criteria
- ✅ Age within trial eligibility range
- ✅ Semantic similarity threshold not too high

---

## Performance Metrics

### Single Patient Upload
- **CSV Parse**: <10ms
- **PII Redaction**: 50-150ms
- **Embedding**: 100-200ms
- **DB Insert**: <50ms
- **Total**: ~200-400ms

### Bulk Upload (15 patients)
- **Parse**: ~20ms
- **Redaction**: ~1.5s
- **Embeddings**: ~2.5s
- **DB Insert**: ~100ms
- **Total**: ~4.2s

### Matching Single Patient
- **Phase 1 (Semantic)**: ~500-800ms
- **Phase 2 (LLM)**: ~3-5s
- **Total**: ~3.5-5.8s

---

## Next Steps

1. ✅ Download `PATIENT_TEST_DATA.csv`
2. ✅ Choose workflow (manual/bulk/UI)
3. ✅ Convert CSV to JSON (if needed)
4. ✅ Login to system with researcher credentials
5. ✅ Upload patient(s)
6. ✅ Verify PII redaction in audit logs
7. ✅ Run matching
8. ✅ Check results and semantic scores

---

## Support

For issues or questions:
- Check audit logs for detailed error messages
- Review PII redaction logs for entity detection
- Check system logs for embedding/matching errors
- Verify trial database is populated with test data

