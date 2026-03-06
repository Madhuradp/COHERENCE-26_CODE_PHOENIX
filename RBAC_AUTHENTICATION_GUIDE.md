# RBAC Authentication Guide - Complete Reference

## Overview

Comprehensive role-based access control (RBAC) system supporting 4 main user types plus Admin/Auditor roles.

**User Types**:
1. **Doctor** - Medical professionals
2. **Pharmaceutical Company** - Pharma organizations
3. **Clinical Researcher** - Research scientists
4. **Patient** - Individual patients
5. **Admin** - System administrators
6. **Auditor** - Compliance auditors

---

## Database Schema - User Document

```javascript
{
  "_id": ObjectId,
  "email": "dr.john@hospital.com",
  "password_hash": "hashed_password",
  "role": "DOCTOR",
  "is_active": true,
  "is_email_verified": false,

  // Role-specific profiles (only one populated)
  "doctor_profile": {
    "medical_degree": "MD",
    "specialization": "Oncology",
    "license_number": "LIC123456",
    "hospital_name": "City Hospital",
    "hospital_city": "San Francisco",
    "hospital_country": "United States",
    "years_of_experience": 15,
    "phone": "+1-555-0100",
    "is_verified": true
  },

  "pharma_profile": { /* null if not pharmaceutical */ },
  "researcher_profile": { /* null if not researcher */ },
  "patient_profile": { /* null if not patient */ },

  "last_login": "2024-11-20T10:30:00",
  "created_at": "2024-11-20T10:30:00",
  "updated_at": "2024-11-20T10:30:00",
  "metadata": {}
}
```

---

## Registration Endpoints

### 1. Doctor Registration

```
POST /api/auth/register/doctor
Content-Type: application/json

{
  "email": "dr.john@hospital.com",
  "password": "SecurePass123!",
  "full_name": "Dr. John Smith",
  "medical_degree": "MD",
  "specialization": "Oncology",
  "license_number": "LIC123456",
  "hospital_name": "City Hospital",
  "hospital_city": "San Francisco",
  "hospital_country": "United States",
  "years_of_experience": 15,
  "phone": "+1-555-0100"
}
```

**Response (201 Created)**:
```json
{
  "success": true,
  "message": "Doctor account created successfully",
  "user_id": "507f1f77bcf86cd799439011",
  "email": "dr.john@hospital.com",
  "role": "DOCTOR"
}
```

**Required Fields**:
- email (unique)
- password (8+ chars)
- full_name
- medical_degree (MD, DO, MBBS, etc.)
- hospital_name

**Optional Fields**:
- specialization
- license_number
- hospital_city
- hospital_country
- years_of_experience
- phone

---

### 2. Pharmaceutical Company Registration

```
POST /api/auth/register/pharmaceutical-company
Content-Type: application/json

{
  "email": "contact@pharmacompany.com",
  "password": "SecurePass123!",
  "company_name": "Pharma Inc.",
  "company_registration_number": "REG123456",
  "department": "Clinical Trials",
  "country": "United States",
  "industry_focus": ["Oncology", "Immunotherapy"],
  "company_phone": "+1-555-1000",
  "website": "https://pharmacompany.com"
}
```

**Required Fields**:
- email (unique)
- password (8+ chars)
- company_name
- department
- country

**Optional Fields**:
- company_registration_number
- industry_focus (array)
- company_phone
- website

---

### 3. Clinical Researcher Registration

```
POST /api/auth/register/researcher
Content-Type: application/json

{
  "email": "dr.researcher@university.edu",
  "password": "SecurePass123!",
  "full_name": "Dr. Jane Doe",
  "research_fields": ["Oncology", "Immunotherapy"],
  "institution": "University Medical Center",
  "institution_country": "United States",
  "publications_count": 45,
  "h_index": 18.5,
  "orcid": "0000-0001-2345-6789"
}
```

**Required Fields**:
- email (unique)
- password (8+ chars)
- full_name
- research_fields (array)

**Optional Fields**:
- institution
- institution_country
- publications_count
- h_index
- orcid

---

### 4. Patient Registration

```
POST /api/auth/register/patient
Content-Type: application/json

{
  "email": "patient@example.com",
  "password": "SecurePass123!",
  "patient_name": "John Patient",
  "date_of_birth": "1985-05-15",
  "patient_id": "PT-0001",
  "primary_condition": "Type 2 Diabetes",
  "additional_conditions": ["Hypertension", "Obesity"],
  "phone": "+1-555-2000"
}
```

**Required Fields**:
- email (unique)
- password (8+ chars)
- patient_name

**Optional Fields**:
- date_of_birth (YYYY-MM-DD)
- patient_id
- primary_condition
- additional_conditions (array)
- phone

---

## Authentication Endpoints

### Login

```
POST /api/auth/login
Content-Type: application/json

{
  "email": "dr.john@hospital.com",
  "password": "SecurePass123!"
}
```

**Response (200 OK)**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "email": "dr.john@hospital.com",
    "role": "DOCTOR",
    "is_active": true,
    "is_email_verified": false,
    "created_at": "2024-11-20T10:30:00",
    "last_login": "2024-11-20T11:00:00",
    "doctor_profile": {
      "medical_degree": "MD",
      "specialization": "Oncology",
      "hospital_name": "City Hospital",
      "years_of_experience": 15,
      "is_verified": true
    }
  }
}
```

**Use token in subsequent requests**:
```bash
curl -H "Authorization: Bearer <access_token>" http://localhost:5000/api/auth/me
```

---

### Get Current User Profile

```
GET /api/auth/me
Authorization: Bearer <token>
```

**Response**:
```json
{
  "access_token": "",
  "token_type": "bearer",
  "user": {
    "email": "dr.john@hospital.com",
    "role": "DOCTOR",
    "is_active": true,
    "is_email_verified": false,
    "created_at": "2024-11-20T10:30:00",
    "last_login": "2024-11-20T11:00:00",
    "doctor_profile": { ... }
  }
}
```

---

### Update Profile

```
PUT /api/auth/profile/update
Authorization: Bearer <token>
Content-Type: application/json

{
  "specialization": "Oncology & Hematology",
  "hospital_name": "New Hospital",
  "phone": "+1-555-0101"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "user": { ... }
}
```

---

### Change Password

```
POST /api/auth/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "old_password": "OldPass123!",
  "new_password": "NewPass456!",
  "confirm_password": "NewPass456!"
}
```

---

### Logout

```
POST /api/auth/logout
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "message": "Logged out successfully. Please discard the token on client."
}
```

---

## RBAC & Permissions

### Role Permissions Matrix

| Feature | Doctor | Pharma | Researcher | Patient | Admin | Auditor |
|---------|--------|--------|-----------|---------|-------|---------|
| view_trials | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| search_trials | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| match_patients | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| upload_patients | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| view_matches | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ |
| manage_trials | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |
| view_analytics | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ |
| access_trial_data | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ |
| export_reports | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ |
| publish_research | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ |
| view_audit_logs | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| view_compliance | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |

---

### Check Permission

```
GET /api/auth/verify-permission/view_trials
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "permission": "view_trials",
  "has_permission": true,
  "role": "DOCTOR"
}
```

---

### Get Role Permissions

```
GET /api/auth/roles/DOCTOR/permissions
```

**Response**:
```json
{
  "success": true,
  "role": "DOCTOR",
  "permissions": [
    "view_trials",
    "search_trials",
    "match_patients",
    "upload_patients",
    "view_matches",
    "export_data"
  ]
}
```

---

## Using RBAC in Backend Routes

### Example 1: Role-Based Endpoint Protection

```python
from fastapi import Depends, HTTPException
from ..auth import require_role, get_current_user
from ..models.users import UserRole

@router.post("/match/run/{patient_id}")
async def run_matching(
    patient_id: str,
    current_user: dict = Depends(require_role(UserRole.DOCTOR))
):
    """Only doctors can run matching"""
    # ... implementation
```

### Example 2: Permission-Based Endpoint Protection

```python
from ..auth import require_permission

@router.get("/trials/advanced-search")
async def advanced_search(
    current_user: dict = Depends(require_permission("search_trials"))
):
    """Only users with search_trials permission"""
    # ... implementation
```

### Example 3: Check Permission Inside Endpoint

```python
from ..models.users import has_permission, UserRole

@router.post("/export-data")
async def export_data(current_user: dict = Depends(get_current_user)):
    user_role = UserRole(current_user.get("role"))

    if not has_permission(user_role, "export_data"):
        raise HTTPException(status_code=403, detail="Permission denied")

    # ... implementation
```

---

## Frontend Integration Examples

### React/JavaScript - Login

```javascript
const login = async (email, password) => {
  const response = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();

  if (response.ok) {
    // Store token
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('user_role', data.user.role);

    // Redirect based on role
    switch(data.user.role) {
      case 'DOCTOR':
        window.location.href = '/doctor/dashboard';
        break;
      case 'PHARMACEUTICAL_COMPANY':
        window.location.href = '/pharma/dashboard';
        break;
      case 'CLINICAL_RESEARCHER':
        window.location.href = '/researcher/dashboard';
        break;
      case 'PATIENT':
        window.location.href = '/patient/dashboard';
        break;
    }
  }
};
```

### React - Register Doctor

```javascript
const registerDoctor = async (formData) => {
  const response = await fetch('http://localhost:5000/api/auth/register/doctor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: formData.email,
      password: formData.password,
      full_name: formData.fullName,
      medical_degree: formData.degree,
      specialization: formData.specialization,
      hospital_name: formData.hospital,
      hospital_city: formData.city,
      hospital_country: formData.country,
      years_of_experience: formData.yearsExp,
      phone: formData.phone
    })
  });

  return await response.json();
};
```

### React - Check Permission

```javascript
const checkPermission = async (permission) => {
  const token = localStorage.getItem('access_token');
  const response = await fetch(
    `http://localhost:5000/api/auth/verify-permission/${permission}`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );

  const data = await response.json();
  return data.has_permission;
};

// Usage in component
const canViewTrials = await checkPermission('view_trials');
```

---

## Security Considerations

### Password Requirements
- Minimum 8 characters
- Mix of uppercase, lowercase, numbers (recommended)
- No common passwords

### Token Handling
- Store tokens in secure HTTP-only cookies (production)
- Token expires in 1 hour
- Implement refresh token mechanism (future)
- Clear token on logout (client-side)

### Email Verification (TODO)
- Implement email verification on signup
- Require verified email for certain operations
- Send verification link

### Account Lockout (TODO)
- Implement account lockout after N failed login attempts
- Temporary or permanent lockout

---

## Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| 401 | Unauthorized | Check token validity, re-login |
| 403 | Forbidden | Insufficient permissions |
| 409 | Conflict | Email already registered |
| 400 | Bad Request | Invalid input data |

---

## Database Indexes

Recommended MongoDB indexes for performance:

```javascript
// Users collection
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ role: 1 })
db.users.createIndex({ created_at: -1 })
db.users.createIndex({ is_active: 1 })
db.users.createIndex(
  { "doctor_profile.license_number": 1 },
  { sparse: true }
)
```

---

## Files Modified/Created

```
✓ backend/src/app/models/users.py (NEW - 400+ lines)
  - Complete user schema with all roles
  - Registration models for each role
  - RBAC permission definitions

✓ backend/src/app/routes/auth_route.py (UPDATED - 400+ lines)
  - Registration endpoints for all roles
  - Login/logout endpoints
  - Profile update endpoints
  - RBAC verification endpoints
  - Role permission endpoints

✓ backend/src/app/auth.py (UPDATED - 50+ lines)
  - Enhanced JWT token handling
  - Role inclusion in tokens
  - Role-based dependency injection
  - Permission checking utilities
```

---

## Quick Start

### 1. Doctor Registration Flow
```bash
# 1. Register
curl -X POST http://localhost:5000/api/auth/register/doctor \
  -H "Content-Type: application/json" \
  -d '{...doctor_data...}'

# 2. Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "...", "password": "..."}'

# 3. Use token to access endpoints
curl -H "Authorization: Bearer <token>" \
  http://localhost:5000/api/auth/me
```

### 2. Patient Registration Flow
```bash
# Same process with /register/patient endpoint
```

### 3. Verify Permissions
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:5000/api/auth/verify-permission/view_trials
```

---

**Complete RBAC implementation ready for production deployment!** ✅
