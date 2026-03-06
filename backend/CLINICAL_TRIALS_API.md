# Clinical Trials Data Fetcher

Scripts to fetch and manage clinical trial data from the ClinicalTrials.gov API.

## Overview

This module provides three main components:

1. **src/scripts/fetch_clinical_trials.py** - Core fetcher for the ClinicalTrials.gov API
2. **src/app/db_integration.py** - MongoDB integration for storing trials
3. **src/app/api_routes.py** - FastAPI routes for exposing trials data
4. **src/app/config.py** - Centralized configuration management
5. **src/scripts/sync_trials.py** - Script to sync trials from API to database

## Setup

### 1. Install Dependencies

```bash
pip install requests pymongo python-dotenv
```

(These should already be in requirements.txt)

### 2. Environment Variables

Make sure your `.env` file has:
```
MONGODB_URL=mongodb+srv://user:password@cluster.mongodb.net/?appName=AppName
DATABASE_NAME=trial_match
PORT=5000
JWT_SECRET=your_jwt_secret_key
```

Environment variables are loaded automatically via `src/app/config.py`

## Usage

### Method 1: Sync Script

```bash
cd backend
python -m src.scripts.sync_trials
```

This script will:
- Fetch and store COVID-19 recruiting trials
- Fetch and store cancer trials
- Fetch and store all recruiting trials
- All data is stored in MongoDB

### Method 2: Programmatic Usage

```python
from src.app.db_integration import fetch_and_store_trials

result = fetch_and_store_trials(
    condition="Cancer",
    status="RECRUITING",
    limit=100
)
print(result)
# Output: {"success": True, "inserted": 95, "updated": 5, ...}
```

### Method 3: FastAPI Integration

```python
# In your main.py
from fastapi import FastAPI
from src.app.api_routes import router as trials_router

app = FastAPI()

# Add trials routes
app.include_router(trials_router)

# Now available at:
# GET /api/trials/search?condition=cancer&status=RECRUITING
# GET /api/trials/details/NCT04234699
# GET /api/trials/conditions?condition=COVID-19
# GET /api/trials/status/RECRUITING
```

## API Endpoints

### Search Trials
```
GET /api/trials/search
Query Parameters:
  - condition: str (optional) - Medical condition
  - intervention: str (optional) - Type of intervention
  - status: str (optional) - Trial status
  - country: str (optional) - Country code
  - limit: int (default: 20, max: 100)
  - offset: int (default: 0)
```

Example:
```
GET /api/trials/search?condition=COVID-19&status=RECRUITING&limit=50
```

### Get Trial Details
```
GET /api/trials/details/{nct_id}
```

Example:
```
GET /api/trials/details/NCT04234699
```

### Search by Condition
```
GET /api/trials/conditions?condition=cancer&limit=50
```

### Search by Status
```
GET /api/trials/status/RECRUITING?limit=50
```

## Response Format

### Search Response
```json
{
  "total": 5420,
  "count": 20,
  "trials": [
    {
      "nct_id": "NCT04234699",
      "title": "Study Title",
      "brief_title": "Brief Title",
      "overall_status": "RECRUITING",
      "phase": "PHASE_3",
      "start_date": "2020-01-15",
      "completion_date": "2024-12-31",
      "conditions": ["COVID-19"],
      "keywords": ["vaccination", "pandemic"],
      "interventions": [
        {
          "name": "Vaccine X",
          "type": "BIOLOGICAL",
          "description": "..."
        }
      ],
      "locations": [
        {
          "facility": "Hospital ABC",
          "status": "RECRUITING",
          "city": "New York",
          "state": "NY",
          "zip": "10001",
          "country": "United States"
        }
      ],
      "enrollment": 1000,
      "fetched_at": "2024-01-15T10:30:45.123456"
    }
  ]
}
```

## Valid Trial Statuses

- `RECRUITING` - Actively recruiting participants
- `ACTIVE_NOT_RECRUITING` - Active but not accepting new participants
- `ENROLLING_BY_INVITATION` - By invitation only
- `NOT_YET_RECRUITING` - Starting soon
- `COMPLETED` - Study ended
- `SUSPENDED` - Temporarily paused
- `TERMINATED` - Ended early
- `WITHDRAWN` - No participants enrolled

## Database Queries (MongoDB)

### Find all COVID-19 trials
```python
from src.app.db_integration import TrialsDB

db = TrialsDB()
trials = db.search_trials(condition="COVID-19", limit=100)
```

### Get trial statistics
```python
stats = db.get_statistics()
# Output: {
#   "total_trials": 145,
#   "status_breakdown": {
#     "RECRUITING": 45,
#     "ACTIVE_NOT_RECRUITING": 60,
#     "COMPLETED": 40
#   },
#   "last_fetch": "2024-01-15T10:30:45"
# }
```

## Rate Limiting

The ClinicalTrials.gov API has rate limits. The fetcher includes:
- Configurable delays between requests
- Error handling for rate limit responses
- Automatic retry logic (optional)

To adjust rate limiting:
```python
fetcher = ClinicalTrialsFetcher()
# Customize session for better control
fetcher.session.headers.update({'Accept-Encoding': 'gzip'})
```

## Common Conditions to Search

- COVID-19
- Cancer (various types: breast, lung, colorectal)
- Diabetes
- Heart Disease
- Alzheimer's Disease
- Depression
- Hypertension
- COPD
- Asthma

## Error Handling

All functions include error handling:
```python
result = fetcher.fetch_trials(condition="test")
if "error" in result:
    print(f"API Error: {result['error']}")
else:
    trials = fetcher.parse_trials(result)
```

## Performance Tips

1. **Limit API calls**: Use caching for frequent queries
2. **Batch inserts**: Insert multiple trials at once
3. **Use indexes**: Database indexes are auto-created
4. **Pagination**: Use limit/offset for large result sets

Example batch fetch:
```python
conditions = ["cancer", "diabetes", "heart disease"]
for condition in conditions:
    result = fetch_and_store_trials(condition=condition, limit=50)
    print(f"{condition}: {result}")
```

## Troubleshooting

### Connection Error
```
Error: MongoNetworkError: No suitable servers found
```
- Check MONGODB_URL is correct
- Verify IP whitelist on MongoDB Atlas

### API Timeout
```
Error: ReadTimeout
```
- Check internet connection
- Try reducing limit parameter
- Increase timeout: `response = self.session.get(..., timeout=60)`

### Empty Results
- Some conditions may have no trials
- Try different condition names
- Check status filter is correct

## References

- [ClinicalTrials.gov Data API](https://clinicaltrials.gov/data-api/api)
- [ClinicalTrials.gov Search](https://clinicaltrials.gov/)
- [MongoDB Python Driver](https://pymongo.readthedocs.io/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
