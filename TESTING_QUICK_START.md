# Quick Start: Test Patient Data Upload & Matching

## 📋 Files Included
- **PATIENT_TEST_DATA.csv** - 15 realistic cancer patient profiles (CSV format)
- **sample_patients_bulk.json** - Ready-to-use JSON for bulk upload (10 patients)
- **PATIENT_DATA_TESTING_GUIDE.md** - Comprehensive testing documentation
- **TESTING_QUICK_START.md** - This file (quick reference)

---

## 🚀 30-Second Setup

### 1. Start the Backend
```bash
cd backend
python -m uvicorn src.app.main:app --reload
```

### 2. Start the Frontend
```bash
cd frontend
npm run dev
```

### 3. Access System
- Backend API: `http://localhost:8000`
- Frontend UI: `http://localhost:3000`
- API Docs: `http://localhost:8000/docs` (Swagger)

---

## 🔐 Login Credentials

### Researcher Account (Can upload patients & run matching)
```
Email: researcher@test.edu
Password: SecurePassword123
```

### Auditor Account (Can view audit logs & compliance)
```
Email: auditor@compliance.org
Password: AuditPassword123
```

---

## 💨 Quick Test: Bulk Upload 10 Patients

### Via cURL
```bash
# 1. Get token
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"researcher@test.edu","password":"SecurePassword123"}' \
  | jq -r '.data.access_token')

echo "Token: $TOKEN"

# 2. Upload patients
curl -X POST http://localhost:8000/api/patients/bulk-upload \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @sample_patients_bulk.json | jq '.'
```

### Via Postman
1. **POST** → `http://localhost:8000/api/auth/login`
   - Headers: `Content-Type: application/json`
   - Body: `{"email":"researcher@test.edu","password":"SecurePassword123"}`
   - **Copy `access_token` from response**

2. **POST** → `http://localhost:8000/api/patients/bulk-upload`
   - Headers:
     - `Authorization: Bearer <TOKEN_FROM_STEP_1>`
     - `Content-Type: application/json`
   - Body: Select file → `sample_patients_bulk.json`

### Via Web UI
1. Go to `http://localhost:3000`
2. Login with researcher credentials
3. Menu → Dashboard → Patients → Bulk Upload
4. Select `sample_patients_bulk.json`
5. Click Upload
6. Wait for success message (~5-10 seconds)

---

## ✅ Verify Upload Success

### Check Uploaded Patients
```bash
curl -X GET http://localhost:8000/api/patients/ \
  -H "Authorization: Bearer $TOKEN" | jq '.data | length'

# Should return: 10 (number of patients)
```

### Check Response Format
```json
{
  "success": true,
  "data": {
    "success_count": 10,
    "failed_count": 0,
    "patient_ids": [
      "65a1b2c3d4e5f6g7h8i9j0k1",
      "65a1b2c3d4e5f6g7h8i9j0k2",
      ...
    ],
    "total_pii_entities": 127
  }
}
```

---

## 🏥 Run Trial Matching on First Patient

```bash
# 1. Get first patient ID from upload response
PATIENT_ID="65a1b2c3d4e5f6g7h8i9j0k1"

# 2. Run matching
curl -X POST http://localhost:8000/api/match/run/$PATIENT_ID \
  -H "Authorization: Bearer $TOKEN" | jq '.data'

# Expected output (after ~5-10 seconds):
# {
#   "patient_id": "...",
#   "phase_1_trials_considered": 50,
#   "phase_1_trials_passed_semantic": 5,
#   "phase_2_trials_eligible": 2,
#   "matches": [
#     {
#       "trial_id": "NCT04123456",
#       "title": "A Phase III Study of...",
#       "semantic_similarity": 0.78,
#       "clinical_fit_status": "ELIGIBLE",
#       "clinical_fit_confidence": 0.85,
#       "clinical_summary": "Patient meets...",
#       ...
#     }
#   ]
# }
```

---

## 🔍 Check PII Redaction

### View Single Patient (Verify PII Redacted)
```bash
curl -X GET http://localhost:8000/api/patients/ \
  -H "Authorization: Bearer $TOKEN" | jq '.data[0]'

# Should see:
# ✅ age, gender, conditions, medications, lab_values (ALL VISIBLE)
# ❌ No patient name, no contact info, no doctor names (REDACTED)
```

### Check PII Audit Logs
```bash
curl -X GET http://localhost:8000/api/patients/audit-logs \
  -H "Authorization: Bearer $TOKEN" | jq '.data' | head -20

# Should show entries with:
# "event_type": "PII_REDACTED"
# "total_entities": 12-15 (per patient)
```

### Get Compliance Report
```bash
curl -X GET http://localhost:8000/api/patients/fairness-stats \
  -H "Authorization: Bearer $TOKEN" | jq '.data'

# Output:
# {
#   "total_patients_ingested": 10,
#   "total_pii_entities_redacted": 127,
#   "compliance_status": "All data properly redacted"
# }
```

---

## 📊 Test Scenarios

### Scenario 1: PII Redaction ✅
**What to check:**
- [ ] Patient names not visible in patient list
- [ ] Phone numbers not in clinical notes
- [ ] Email addresses not in data
- [ ] Doctor names not visible
- [ ] Audit logs show PII detection

**Command:**
```bash
curl -X GET http://localhost:8000/api/patients/ \
  -H "Authorization: Bearer $TOKEN" | jq '.data[0] | keys'
```

**Expected:** Should NOT include: name, email, phone, doctor_name, contact_info

---

### Scenario 2: Semantic Search Matching ✅
**What to check:**
- [ ] Matches found for NSCLC patient (John Smith)
- [ ] Colorectal trials found for CRC patient
- [ ] Semantic similarity scores between 0.3-0.95
- [ ] LLM confidence scores non-zero

**Command:**
```bash
# Run matching and check scores
curl -X POST http://localhost:8000/api/match/run/$PATIENT_ID \
  -H "Authorization: Bearer $TOKEN" | jq '.data.matches[] | {trial_id, semantic_similarity, clinical_fit_confidence}'
```

**Expected:**
```json
{
  "trial_id": "NCT04123456",
  "semantic_similarity": 0.75,
  "clinical_fit_confidence": 0.88
}
```

---

### Scenario 3: Bulk Load Performance ✅
**What to check:**
- [ ] 10 patients uploaded in <10 seconds
- [ ] All PII redacted (~10-15 entities per patient)
- [ ] All embeddings generated
- [ ] Zero failures

**Command:**
```bash
# Time the upload
time curl -X POST http://localhost:8000/api/patients/bulk-upload \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @sample_patients_bulk.json | jq '.data'
```

**Expected:**
```
success_count: 10
failed_count: 0
total_pii_entities: 120-140
Real time: 4-8 seconds
```

---

## 🐛 Common Issues & Fixes

### ❌ "Invalid access token"
**Solution:** Re-run login command and copy new token
```bash
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"researcher@test.edu","password":"SecurePassword123"}' \
  | jq -r '.data.access_token')
```

### ❌ "Patient data validation failed"
**Check:**
- Age is integer (not string)
- Gender is "Male" or "Female"
- conditions array has "name" field
- medications array has "name" field

### ❌ "Semantic search timeout"
**Solution:** Wait longer, first run loads ML model (~30-60s on first load)

### ❌ "No matching trials"
**Check:**
- Trial database is populated
- Patient age within trial range
- Conditions relevant to available trials

---

## 📈 Expected Performance

| Operation | Time |
|-----------|------|
| Login | <500ms |
| Upload 1 patient | 200-400ms |
| Upload 10 patients (bulk) | 4-8s |
| PII redaction per patient | 50-150ms |
| Embedding generation | 100-200ms |
| Semantic search (Phase 1) | 500-800ms |
| LLM analysis (Phase 2) | 3-5s |
| **Total matching time** | **3.5-5.8s** |

---

## 🎯 Success Criteria Checklist

After testing, you should be able to check:

- [ ] ✅ 10 patients uploaded successfully
- [ ] ✅ All patients visible in list
- [ ] ✅ Patient names/emails redacted from display
- [ ] ✅ Medical data (conditions, meds, labs) visible
- [ ] ✅ Audit logs show ~127 PII entities redacted
- [ ] ✅ Run matching on at least 2 different patients
- [ ] ✅ Get semantic similarity scores (0.3-0.95 range)
- [ ] ✅ Get clinical fit confidence scores
- [ ] ✅ At least 1-2 matches per patient found
- [ ] ✅ Compliance report shows proper redaction

---

## 🔗 Useful Links

| Resource | URL |
|----------|-----|
| **API Docs (Swagger)** | http://localhost:8000/docs |
| **Frontend** | http://localhost:3000 |
| **Backend Health** | http://localhost:8000/health |
| **Full Testing Guide** | PATIENT_DATA_TESTING_GUIDE.md |
| **Architecture Docs** | ARCHITECTURE.md |
| **CSV Data** | PATIENT_TEST_DATA.csv |
| **JSON Data** | sample_patients_bulk.json |

---

## 💡 Pro Tips

### Tip 1: Check Model Loading Status
```bash
# Look for this in backend logs
curl http://localhost:8000/health | jq '.semantic_search_ready'
# Should return: true
```

### Tip 2: Export Matching Results
```bash
curl -X GET http://localhost:8000/api/match/results/$PATIENT_ID \
  -H "Authorization: Bearer $TOKEN" | jq '.' > match_results.json
```

### Tip 3: Test with Postman
- Import collection from: http://localhost:8000/openapi.json
- Variables: `{{base_url}}` = http://localhost:8000
- Variables: `{{token}}` = (paste token from login)

### Tip 4: Monitor Logs
```bash
# Backend logs with timestamps
tail -f backend/logs/*.log

# Frontend build warnings
cd frontend && npm run dev 2>&1 | grep -i warn
```

---

## 📞 Troubleshooting Quick Links

For detailed help, see **PATIENT_DATA_TESTING_GUIDE.md**:
- Section: "Troubleshooting"
- Section: "Test Scenarios"
- Section: "Conversion Scripts"

---

## ✨ Next Steps

1. **Run one of the upload commands above** (takes 5-10 min)
2. **Verify PII redaction** (takes 2-3 min)
3. **Run matching on a patient** (takes 5-10 min)
4. **Check results** (takes 2-3 min)
5. **Read full guide** for advanced scenarios

**Total time: ~20-30 minutes for complete testing**

