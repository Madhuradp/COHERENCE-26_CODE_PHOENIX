# Clinical Trials Integration - Setup Guide

## Project Structure

```
backend/
├── .env                           # Configuration (loaded by config.py)
├── requirements.txt               # Dependencies
├── CLINICAL_TRIALS_API.md         # API documentation
├── src/
│   ├── main.py                    # Main FastAPI app
│   ├── app/
│   │   ├── __init__.py
│   │   ├── config.py              # Environment config (loads .env)
│   │   ├── api_routes.py          # FastAPI clinical trials routes
│   │   ├── db_integration.py      # MongoDB integration & sync functions
│   │   └── models/
│   │       ├── clinical_trial.py
│   │       ├── patients.py
│   │       └── users.py
│   └── scripts/
│       ├── __init__.py
│       ├── fetch_clinical_trials.py  # Core fetcher class
│       └── sync_trials.py            # Sync script for CLI use
```

## Quick Start

### 1. Environment Setup

Your `.env` file should already contain:
```
MONGODB_URL=mongodb+srv://itsanjali2410_db_user:trial_match@cluster0.eqqvjin.mongodb.net/?appName=Cluster0
DATABASE_NAME=trial_match
PORT=5000
JWT_SECRET=your_jwt_secret_key
```

The config is automatically loaded via `src/app/config.py`

### 2. Install Dependencies

```bash
cd backend
pip install -r requirements.txt  # or use venv
```

### 3. Run the Sync Script

Sync clinical trials from API to MongoDB:

```bash
cd backend
python -m src.scripts.sync_trials
```

This will:
- Fetch 200 trials from the ClinicalTrials.gov API
- Filter by common conditions (COVID-19, cancer, diabetes, heart)
- Store everything in MongoDB
- Display statistics

Expected output:
```
Total trials in database: 48
Status breakdown:
  RECRUITING: 26
  COMPLETED: 11
  TERMINATED: 3
  ...
```

### 4. Use in FastAPI

Include the routes in your main app:

```python
# src/main.py
from fastapi import FastAPI
from src.app.api_routes import router as trials_router

app = FastAPI()
app.include_router(trials_router)
```

### 5. Available Endpoints

Once integrated and data is synced, you'll have:

```
GET /api/trials/search
  ?condition=cancer
  &status=RECRUITING
  &limit=50

GET /api/trials/details/{nct_id}

GET /api/trials/conditions
  ?condition=COVID-19
  &limit=50

GET /api/trials/status/{status}
  ?limit=50
```

## Key Files

| File | Purpose |
|------|---------|
| `src/app/config.py` | Loads `.env` and centralizes configuration |
| `src/scripts/fetch_clinical_trials.py` | Core API fetcher class (no examples) |
| `src/scripts/sync_trials.py` | CLI script to sync trials to DB |
| `src/app/db_integration.py` | MongoDB operations & sync logic |
| `src/app/api_routes.py` | FastAPI endpoints for trials |

## Usage Examples

### Option 1: Use sync script (CLI)
```bash
python -m src.scripts.sync_trials
```

### Option 2: Import and use in Python
```python
from src.app.db_integration import fetch_and_store_trials

result = fetch_and_store_trials(
    condition="Cancer",
    status="RECRUITING",
    limit=100
)
print(result)
```

### Option 3: Query the database directly
```python
from src.app.db_integration import TrialsDB

db = TrialsDB()
trials = db.search_trials(condition="COVID-19", limit=20)
stats = db.get_statistics()
db.close()
```

## Configuration Management

All configuration is centralized in `src/app/config.py`:

- Reads from `.env` file automatically
- Validates required variables on import
- Can override with environment variables
- Used by all modules (scripts, routes, db)

## Notes

- The `.env` file is loaded **once** via `config.py`, not in each script
- All imports use relative paths from the `src` directory
- Sync script runs independently without needing FastAPI
- Database queries don't require API sync (data persists in MongoDB)
