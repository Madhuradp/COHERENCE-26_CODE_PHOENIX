# Geographic Filtering Guide - Patients & Clinical Trials

## 🗺️ Overview

Geographic filtering enables users to search and filter both **patients** and **clinical trials** by location. The system enforces Maharashtra-only trials while allowing flexible patient location filtering.

---

## 📍 Clinical Trials - Geographic Filtering

### Feature
- **Default Location:** Maharashtra, India (enforced)
- **Queryable:** State, city, country
- **Sync Behavior:** All synced trials are Maharashtra-only

### API Endpoint
```bash
GET /api/trials/search?condition=cancer&location=Maharashtra&limit=50
```

### Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `condition` | string | - | Medical condition to search |
| `location` | string | Maharashtra | Geographic filter (state/city) |
| `min_age` | int | - | Minimum patient age requirement |
| `max_age` | int | - | Maximum patient age requirement |
| `phase` | string | - | Trial phase (PHASE1, PHASE2, PHASE3, PHASE4) |
| `limit` | int | 50 | Max results (10-500) |

### Frontend Usage
```typescript
import { searchTrials } from '@/lib/api';

// Search cancer trials in Maharashtra
const result = await searchTrials({
  condition: 'cancer',
  location: 'Maharashtra',
  min_age: 40,
  max_age: 70,
  limit: 50
});

console.log(`Found ${result.count} trials`);
```

---

## 👥 Patients - Geographic Filtering

### Feature
- **Default Location:** No enforced location (flexible)
- **Queryable:** State, city, country (from demographics)
- **Data Capture:** During patient ingest, stored in demographics.location

### API Endpoint
```bash
GET /api/patients?location=Maharashtra&age_min=30&age_max=70&gender=Male&condition=cancer
```

### Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `location` | string | - | Geographic filter (state/city/country) |
| `age_min` | int | - | Minimum patient age |
| `age_max` | int | - | Maximum patient age |
| `gender` | string | - | Filter by gender ("Male", "Female") |
| `condition` | string | - | Medical condition filter |

### Frontend Usage
```typescript
import { listPatients } from '@/lib/api';

// Get Maharashtra patients with diabetes, aged 40-70
const result = await listPatients({
  location: 'Maharashtra',
  age_min: 40,
  age_max: 70,
  condition: 'diabetes'
});

console.log(`Found ${result.data.length} patients`);
```

---

## 🔍 Search Examples

### Example 1: Find All Maharashtra Patients with Cancer
```bash
curl "http://localhost:8000/api/patients?location=Maharashtra&condition=cancer"
```

### Example 2: Find Phase 2 Cancer Trials in Mumbai
```bash
curl "http://localhost:8000/api/trials/search?condition=cancer&phase=PHASE2&location=Mumbai"
```

### Example 3: Filter Patients by Age Range and Gender
```bash
curl "http://localhost:8000/api/patients?location=Maharashtra&age_min=40&age_max=65&gender=Male"
```

### Example 4: Combine Trial Filters
```bash
curl "http://localhost:8000/api/trials/search?condition=diabetes&min_age=50&max_age=70&location=Maharashtra&limit=30"
```

---

## 📊 API Response Structure

### Trials Response
```json
{
  "success": true,
  "count": 15,
  "data": [
    {
      "nct_id": "NCT04234699",
      "title": "Trial Title",
      "locations": [
        {
          "city": "Mumbai",
          "state": "Maharashtra",
          "country": "India"
        }
      ]
    }
  ]
}
```

### Patients Response
```json
{
  "success": true,
  "data": [
    {
      "_id": "patient_id",
      "age": 45,
      "gender": "Male",
      "demographics": {
        "location": {
          "city": "Mumbai",
          "state": "Maharashtra",
          "country": "India"
        }
      }
    }
  ]
}
```

---

## ✅ Implementation Summary

**Backend Changes:**
- ✅ `/api/patients` - Added location, age, gender, condition filters
- ✅ `/api/trials/search` - Added location parameter (default Maharashtra)
- ✅ Geographic query validation on both entities

**Frontend Changes:**
- ✅ `listPatients(params)` - Support geographic & medical filters
- ✅ `searchTrials(params)` - Support location & phase filters
- ✅ Type-safe parameters with optional filters

**Supported Maharashtra Cities:**
Mumbai, Pune, Nagpur, Nashik, Aurangabad, Kolhapur, Solapur, Amravati, Nanded, Thane, Navi Mumbai, Satara, Sangli, Latur, Jalgaon, Akola

---

## 📞 Troubleshooting

### No Results from Location Filter?
- Verify exact state/city spelling
- Check patient/trial records have location data
- Ensure location names match supported list

### Trials Still Outside Maharashtra?
- Re-run sync: `POST /api/trials/sync`
- Check sync response shows "synced_from: Maharashtra, India"
- Verify location filter is applied in search

---

✅ **Geographic filtering implemented for both patients and clinical trials**
