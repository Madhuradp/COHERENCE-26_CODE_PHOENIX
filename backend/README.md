# Backend Setup & Running Guide

## Quick Start

### 1. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Run Backend Server

**Simple command (recommended)**:
```bash
cd backend
uvicorn src.main:app --reload
```

This works because `src/__init__.py` makes the src directory a proper Python package.

**Output**:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete
```

The server runs on **port 8000** by default.

---

## Configuration

### Change Port (Optional)
Set the `PORT` environment variable:

**Windows PowerShell**:
```powershell
$env:PORT = "3000"
uvicorn src.main:app --reload
```

**Linux/Mac**:
```bash
PORT=3000 uvicorn src.main:app --reload
```

### Production Deployment
```bash
uvicorn src.main:app --host 0.0.0.0 --port 8000 --workers 4
```

---

## Environment Variables

Required: `.env` file in `backend/` directory
```
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=trial_match
JWT_SECRET=your_jwt_secret_key
PORT=8000
DEBUG=False
```

---

## Frontend Configuration

Frontend connects to backend at: `http://localhost:8000`

This is configured in `frontend/lib/api.ts`:
```typescript
const BASE_URL = 'http://localhost:8000';
```

---

## API Health Check

Once running, test the backend:
```bash
curl http://localhost:8000/docs
```

This opens the interactive Swagger documentation at `http://localhost:8000/docs`

---

## Common Issues

### Backend routes not being hit
- Ensure `src/__init__.py` exists in the backend directory
- Verify the working directory is the `backend` folder
- Check that MongoDB is running

### "Address already in use"
```bash
# Find process on port 8000
lsof -i :8000  # Linux/Mac
Get-NetTCPConnection -LocalPort 8000  # Windows

# Kill the process
kill -9 <PID>  # Linux/Mac
```

### PYTHONPATH errors
- These should not occur now that `src/__init__.py` exists
- Old method: `$env:PYTHONPATH = "src"` is no longer needed

---

## Frontend + Backend Together

**Terminal 1 - Backend**:
```bash
cd backend
uvicorn src.main:app --reload
```

**Terminal 2 - Frontend**:
```bash
cd frontend
npm run dev
```

Frontend will be at: `http://localhost:3000`
Backend will be at: `http://localhost:8000`

---

## Testing Registration Flow

1. Go to `http://localhost:3000/signup`
2. Select a role (Doctor, Pharma, Researcher)
3. Fill in the form with role-specific fields
4. Submit registration
5. Should redirect to login page

---

## Database Indexes

For best performance, create these MongoDB indexes:

```bash
# Connect to MongoDB and run:
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ role: 1 })
db.users.createIndex({ created_at: -1 })
```

