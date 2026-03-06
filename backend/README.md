# Trial Match Intelligence System - Backend

FastAPI-based backend for intelligent clinical trial matching with semantic search and LLM analysis.

## Quick Start

### 1. Prerequisites

- Python 3.11+
- Virtual environment activated
- MongoDB Atlas connection

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment

Edit `.env` file with your settings:

```env
MONGODB_URL=mongodb+srv://user:password@cluster.mongodb.net/?appName=Database
DATABASE_NAME=trial_match
PORT=8000
JWT_SECRET=your_jwt_secret_key
OPENAI_API_KEY=your_openai_api_key_here
```

### 4. Run the Backend

#### Option A: Direct Python (Recommended)

```bash
cd backend
$env:PYTHONPATH = "src"
python src/main.py
```

#### Option B: Uvicorn with Hot Reload (Development)

```bash
cd backend
$env:PYTHONPATH = "src"
uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
```

#### Option C: Uvicorn Production

```bash
cd backend
$env:PYTHONPATH = "src"
uvicorn src.main:app --host 0.0.0.0 --port 8000
```

### 5. Verify Server is Running

```bash
curl http://localhost:8000/
```

Expected response:
```json
{
  "status": "Intelligent Matcher Online",
  "version": "2.0"
}
```

## API Documentation

Once running, access interactive API docs:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Architecture

### 3-Tier Matching Pipeline

1. **Tier 1 (Database)**: Fast geo + age filtering
2. **Tier 2 (Semantic)**: Biomedical embeddings ranking
3. **Tier 3 (LLM)**: Detailed clinical analysis (GPT-4)

### Core Services

```
src/app/
├── main.py                 # App factory & ASGI entry point
├── routes/                 # API endpoint routers
│   ├── auth_route.py      # Authentication endpoints
│   ├── patients_route.py   # Patient management
│   ├── matching_route.py   # Trial matching pipeline
│   ├── trials_route.py     # Trial search & filtering
│   └── analytics_route.py  # Analytics & reporting
├── services/               # Business logic
│   ├── match_engine.py     # Orchestrates 3-tier pipeline
│   ├── semantic_search.py  # Biomedical embeddings
│   ├── llm_service.py      # GPT-4 analysis
│   ├── geo_service.py      # Geographic filtering
│   ├── privacy_manager.py  # PII redaction
│   └── auth_service.py     # JWT authentication
├── core/
│   ├── database.py         # MongoDB connection
│   └── config.py           # Configuration management
└── models/                 # Pydantic data models
```

## Key Features

### Patient Matching

```bash
curl -X POST http://localhost:8000/api/match/run/{patient_id}
```

Runs full 3-tier matching pipeline for a patient.

### PII Protection

Automatic PII detection & redaction using Microsoft Presidio:
- Names, emails, phone numbers
- SSNs, medical licenses
- Dates and identifiers

### Semantic Search

Uses biomedical sentence-transformers for intelligent trial ranking:
- Domain-optimized embeddings
- Clinical synonym understanding
- 1-hour embedding cache

### JWT Authentication

Protected endpoints require Bearer token:

```bash
curl -H "Authorization: Bearer {token}" http://localhost:8000/api/match/patients
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGODB_URL` | Yes | - | MongoDB Atlas connection string |
| `DATABASE_NAME` | No | trial_match | Database name |
| `PORT` | No | 8000 | Server port |
| `JWT_SECRET` | No | your_jwt_secret_key | JWT signing key |
| `OPENAI_API_KEY` | Yes* | - | OpenAI API key (*required for LLM features) |

## Dependencies

Key packages:
- **FastAPI**: Web framework
- **Uvicorn**: ASGI server
- **PyMongo**: MongoDB driver
- **OpenAI**: GPT-4 integration
- **sentence-transformers**: Semantic embeddings
- **Presidio**: PII detection/redaction
- **PyJWT**: Authentication

See `requirements.txt` for full list.

## Troubleshooting

### "ModuleNotFoundError: No module named 'app'"

Set PYTHONPATH before running:
```bash
$env:PYTHONPATH = "src"
python src/main.py
```

### "OPENAI_API_KEY environment variable is not set"

Add your API key to `.env`:
```env
OPENAI_API_KEY=sk-your-key-here
```

The server will start without the key but fail when LLM features are used.

### MongoDB Connection Error

Verify MongoDB Atlas connection string in `.env`:
```env
MONGODB_URL=mongodb+srv://user:password@cluster.mongodb.net/?appName=Database
```

## Development

### Run Tests

```bash
pytest tests/
```

### Code Quality

```bash
black src/
flake8 src/
mypy src/
```

## Production Deployment

For production, use a production ASGI server:

```bash
gunicorn -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000 src.main:app
```

Or with Docker:

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY src/ src/
ENV PYTHONPATH=src
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## License

Proprietary - COHERENCE-26 Project
