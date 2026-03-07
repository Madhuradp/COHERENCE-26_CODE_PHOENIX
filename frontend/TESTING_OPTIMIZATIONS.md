# Testing Guide: Optimizations & Fixes

## 🚀 Quick Start Testing

### Prerequisites
```bash
# Terminal 1: Start backend
cd backend
pip install -r requirements.txt  # Ensure psutil is installed
python -m uvicorn src.app.main:app --reload

# Terminal 2: Start frontend
cd frontend
npm run dev
```

---

## ✅ Test 1: Patient Upload Speed Optimization

### What to Test
Verify that bulk patient upload completes in <1-2 seconds (without waiting for embedding generation).

### Test Steps

**Option A: Using cURL**
```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"researcher@test.edu","password":"SecurePassword123"}' \
  | jq -r '.data.access_token')

echo "Token: $TOKEN"

# 2. Time the bulk upload
time curl -X POST http://localhost:8000/api/patients/bulk-upload \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @sample_patients_bulk.json | jq '.'
```

**Expected Output:**
```
{
  "success": true,
  "data": {
    "success_count": 10,
    "failed_count": 0,
    "patient_ids": [...],
    "total_pii_entities": 127
  },
  "message": "Bulk upload complete: 10 succeeded, 0 failed. Embeddings generating in background..."
}

real    0m0.8s
user    0m0.3s
sys     0m0.1s
```

**Success Criteria:**
- ✅ Response time < 2 seconds
- ✅ Message mentions "Embeddings generating in background"
- ✅ All 10 patients uploaded successfully
- ✅ Zero failures

### Option B: Using Frontend UI
1. Go to `http://localhost:3000`
2. Login with researcher credentials
3. Navigate to Dashboard → Patients → Bulk Upload
4. Select `sample_patients_bulk.json`
5. Click Upload
6. Observe: Upload completes and shows success message in <2 seconds
7. Check: Patient list updates immediately with new patients

---

## ✅ Test 2: System Monitoring - Real Data

### What to Test
Verify that system monitoring endpoint returns real system metrics.

### Test Steps

**1. Check Monitoring Endpoint Directly**
```bash
curl http://localhost:8000/api/analytics/monitoring | jq '.'
```

**Expected Output Structure:**
```json
{
  "success": true,
  "data": {
    "uptime": "99.9%",
    "p95Latency": "45ms",
    "errorRate": "0.00%",
    "activeUsers": 0,
    "cpuUsage": 25,           // Real CPU %
    "memoryUsage": 45,        // Real memory %
    "diskUsage": 30,          // Real disk %
    "apiCalls": 42,           // Real count from last hour
    "recentAuditLogs": 42,
    "databaseMetrics": {
      "total_patients": 10,   // Real count
      "total_trials": 50,     // Real count
      "total_matches": 5,     // Real count
      "total_audit_logs": 42  // Real count
    },
    "uptimeTrend": [...],
    "services": [...]
  }
}
```

**Success Criteria:**
- ✅ CPU/Memory/Disk usage are real values (not hardcoded)
- ✅ Database metrics match actual counts in MongoDB
- ✅ apiCalls count is from recent audit logs
- ✅ No mock data in response

**2. Check Frontend System Monitoring Page**
1. Go to `http://localhost:3000/admin` (login as auditor first)
2. Click "Auditor" menu → "System Monitoring"
3. Verify data displays:
   - ✅ Real uptime percentage
   - ✅ Real CPU/Memory/Disk gauges showing current values
   - ✅ Database metrics showing actual patient/trial/match counts
   - ✅ Service health table
   - ✅ Uptime trend chart

**3. Test Auto-Refresh**
1. Stay on System Monitoring page
2. Upload a new patient (opens new terminal/tab)
3. Wait 30 seconds for auto-refresh
4. Verify: Patient count increases in the Database Metrics section

```bash
# In another terminal, add a patient
curl -X POST http://localhost:8000/api/patients/upload \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"demographics":{"age":45,"gender":"Male"},"conditions":[{"name":"Cancer"}],"medications":[]}'
```

---

## ✅ Test 3: Auditor Dashboard Pages

### Dashboard 1: Fairness Analytics (`/admin/fairness`)

**Test Steps:**
1. Go to `http://localhost:3000/admin/fairness`
2. Verify page displays:
   - ✅ Real fairness metrics from API
   - ✅ Gender distribution data
   - ✅ Age coverage statistics
   - ✅ Bias alerts (if any)

**Verify Real Data:**
```bash
curl http://localhost:8000/api/patients/fairness-stats | jq '.'
```

### Dashboard 2: User Management (`/admin/users`)

**Test Steps:**
1. Go to `http://localhost:3000/admin/users`
2. Verify page displays:
   - ✅ User count in stat cards
   - ✅ All users from database listed
   - ✅ Search and filter work
   - ✅ User roles (RESEARCHER, AUDITOR) display correctly

**Verify Real Data:**
```bash
curl http://localhost:8000/api/users | jq '.data | length'
```

### Dashboard 3: System Monitoring (`/admin/monitoring`)

**Already tested in Test 2 above**

---

## ✅ Test 4: Researcher Dashboard

### Dashboard: Main Research Dashboard (`/dashboard`)

**Test Steps:**
1. Go to `http://localhost:3000/dashboard`
2. Verify real-time metrics display:
   - ✅ Total Patients card shows actual patient count
   - ✅ Clinical Trials card shows actual trial count
   - ✅ Matches Generated shows sum of all matches
   - ✅ Data Protected shows actual PII entity count

3. Verify charts:
   - ✅ Matching Health Bar Chart shows eligible/ineligible/review breakdown
   - ✅ Match Status Ratio Pie Chart displays proportions
   - ✅ Success Rate metric updates with real data

4. Test data refresh:
   - Upload a new patient or run matching
   - Verify dashboard updates within 30 seconds

---

## ✅ Test 5: Background Embedding Generation

### What to Test
Verify that embeddings are generated asynchronously in the background.

### Test Steps

**1. Upload Patients**
```bash
curl -X POST http://localhost:8000/api/patients/bulk-upload \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @sample_patients_bulk.json
```

**2. Immediately Check Patient Embedding**
```bash
# Get first patient ID from upload response
PATIENT_ID="<first_id_from_response>"

# Check embedding immediately (should be null)
curl http://localhost:8000/api/patients/ \
  -H "Authorization: Bearer $TOKEN" | jq ".data[0].embedding"
# Output: null
```

**3. Wait 10 seconds and Check Again**
```bash
sleep 10

curl http://localhost:8000/api/patients/ \
  -H "Authorization: Bearer $TOKEN" | jq ".data[0].embedding"
# Output: [0.123, -0.456, ...] (should be populated array)
```

**Success Criteria:**
- ✅ Embedding is null immediately after upload
- ✅ Embedding populated after ~5-10 seconds
- ✅ Upload response returned immediately (not waiting for embeddings)

---

## 🔍 Debugging & Monitoring

### Check Backend Logs

**Terminal running backend:**
```bash
# Look for upload completion
grep -i "bulk_upload\|background" /path/to/logs

# Monitor embedding generation
grep -i "embedding\|semantic" /path/to/logs
```

### Check Database

**Verify patients in MongoDB:**
```bash
# Connect to MongoDB and check
db.patients.count()                    # Total patients
db.patients.findOne({embedding: null}) # Check for null embeddings (should be empty after 10s)
```

### Check API Response Times

**Monitor with curl timing:**
```bash
curl -w "\nTime: %{time_total}s\n" \
  -X POST http://localhost:8000/api/patients/bulk-upload \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @sample_patients_bulk.json
```

---

## 📊 Expected Performance Metrics

| Operation | Expected Time | Success Criteria |
|-----------|---------------|----|
| Bulk upload 10 patients | <2s | Response in <2 seconds |
| Monitoring endpoint | <500ms | Real data, not mock |
| Single patient embedding | ~100-200ms | Generated in background |
| Dashboard load | ~2-3s | Real data displayed |
| Dashboard refresh | ~30s | Auto-refresh interval |

---

## ✨ Known Behaviors

### Upload Response Message
```
"Bulk upload complete: 10 succeeded, 0 failed. Embeddings generating in background..."
```
This message is expected and indicates embeddings are being processed asynchronously.

### Monitoring Page Initial Load
Page may show slight delays on first load while fetching system metrics. Subsequent refreshes are faster.

### Background Embedding Processing
- Patient embeddings set to `null` during bulk upload
- Embeddings filled in background over next 5-10 seconds
- Matching still works with null embeddings (uses condition matching)
- Embeddings improve matching accuracy once generated

---

## 🐛 Troubleshooting

### Issue: Upload takes 4-8 seconds
**Solution:** Ensure backend is running with latest code. Check that BackgroundTasks is being used correctly.

### Issue: Monitoring page shows mock data
**Solution:** Verify `/api/analytics/monitoring` endpoint is accessible and returning real data.

### Issue: Embeddings never populate
**Solution:**
- Check backend logs for errors
- Verify semantic_search.py is working
- Ensure sentence-transformers package installed

### Issue: Dashboard shows "Not Found" errors
**Solution:**
- Verify API endpoints are returning correct data
- Check user authentication token is valid
- Review API error messages in browser console

---

## 📞 Support

For detailed testing information, see:
- `OPTIMIZATION_SUMMARY.md` - Complete change documentation
- `TESTING_QUICK_START.md` - Original testing guide
- `ARCHITECTURE.md` - System architecture

