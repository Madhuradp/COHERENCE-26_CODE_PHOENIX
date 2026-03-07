# Auditor as Superuser - Complete System Visibility

## Role Overview
**AUDITOR** is a **SUPERUSER** role with full visibility across the entire clinical trial matching system.

## Access Levels

### ✓ Full Visibility
- **All Patients**: Can view complete patient list (demographics, conditions, medications, labs)
- **All Clinical Trials**: Can view all trials from database
- **All Users**: Can monitor user accounts and roles
- **All Audit Logs**: Complete tamper-proof audit trail
- **All Match Results**: Historical and real-time matching data
- **System Compliance**: Full compliance and fairness metrics

### ✓ Real-Time Monitoring
- **Live Audit Events**: Latest 5 actions on the system
- **Bias Alerts**: Active fairness issues
- **PII Protection Stats**: Entities redacted per action
- **User Activity**: Who accessed what and when
- **System Health**: Database, API, and service status

### ✓ Compliance Oversight
- PII redaction verification
- Audit trail completeness
- RBAC enforcement
- Data encryption status
- CDSCO compliance tracking

## Data Auditor Can Access

| Resource | Access | Details |
|----------|--------|---------|
| Patients | Full | Name, age, gender, conditions, meds, labs (PII redacted) |
| Trials | Full | All trials, phases, locations, eligibility |
| Users | Full | Email, role, organization, created_at |
| Audit Logs | Full | All events, timestamps, IP addresses, actions |
| Matches | Full | All match results with confidence scores |
| Analytics | Full | Real-time metrics and fairness stats |
| PII Events | Full | Redaction timestamps and entity counts |

## Backend Authorization

### Endpoints Auditors Can Access

```
GET  /api/patients/                 → List all patients
GET  /api/patients/{id}             → Get specific patient
GET  /api/patients/audit-logs       → Access audit trail
GET  /api/patients/fairness-stats   → View fairness metrics

GET  /api/trials/search             → Search trials
GET  /api/trials/{id}               → Get trial details
GET  /api/trials/search-live        → Live trial search

GET  /api/match/results/{patient_id} → View match results

GET  /admin/*                        → Full admin dashboard access
```

## Frontend Dashboard Structure

### Main Dashboard (`/admin`)
- **Real-Time Metrics**: Patients, Trials, PII Protected, Compliance Score
- **Latest Audit Events**: 5 most recent system actions (color-coded)
- **Bias & Fairness Status**: Gender/age distribution, active alerts
- **Compliance Summary**: System status across 3 categories

### Sub-Dashboards
- **Audit Logs** (`/admin/audit-logs`) - Complete audit trail with filtering
- **Fairness Analytics** (`/admin/fairness`) - Bias detection and metrics
- **Monitoring** (`/admin/monitoring`) - System health metrics
- **User Management** (`/admin/users`) - User oversight
- **Trial Management** (`/admin/trials`) - Trial administration

## Security & Privacy

### What Auditors CAN See
- ✓ Patient IDs and medical data (conditions, meds, labs)
- ✓ Anonymized user actions (who logged in, what they accessed)
- ✓ All audit events (no restrictions)
- ✓ System configuration and compliance status

### What Auditors CANNOT See
- ✗ Patient names, emails, phone numbers (PII redacted)
- ✗ Doctor/clinician personal information (redacted)
- ✗ Passwords or authentication tokens
- ✗ Unencrypted sensitive data

## Real-Time Data Sources

All auditor dashboard data comes from live database:
- `getAuditLogs()` → `/api/patients/audit-logs`
- `getUserActivity()` → `/api/patients/audit-logs` (sorted)
- `getFairnessStats()` → `/api/patients/fairness-stats`
- `listPatients()` → `/api/patients/`
- `getAnalyticsSummary()` → `/api/analytics/summary`

**No mock data** - Everything is real-time from the database.

## Authorization Enforcement

### Backend Role Check
```python
if current_user.get("role") != UserRole.AUDITOR.value:
    raise HTTPException(status_code=403, detail="Only auditors can access this")
```

### Endpoints Protected
- `/api/patients/audit-logs` - AUDITOR ONLY
- `/api/patients/fairness-stats` - AUDITOR ONLY
- `/api/patients/` - RESEARCHER & AUDITOR

## Compliance Tracking

Auditors verify:
- ✓ **PII Protection**: Automated redaction on all patient data
- ✓ **Audit Logging**: All actions tracked with timestamps
- ✓ **Role-Based Access**: RBAC properly enforced
- ✓ **Data Encryption**: AES-256 for stored data
- ✓ **JWT Authentication**: Secure token-based auth
- ✓ **CDSCO Compliance**: System meets regulatory standards
- ✓ **Audit Trail Completeness**: No gaps in event logging

## Superuser Responsibilities

As a superuser, auditors:
1. **Monitor System Health** - Track all user activity
2. **Verify Compliance** - Ensure PII protection and audit trails
3. **Detect Biases** - Review fairness metrics and alerts
4. **Investigate Issues** - Access full audit logs for forensics
5. **Generate Reports** - Export compliance and fairness data
6. **Track Metrics** - Monitor success rates and performance

## Use Cases

### Use Case 1: Investigate a Data Breach
1. Go to Audit Logs
2. Search by date/user/action
3. See full event trail with IP addresses
4. Verify PII protection was active

### Use Case 2: Check Gender Bias in Trial Matching
1. Go to Fairness Analytics
2. View gender distribution across all matches
3. See enrollment vs eligible ratio
4. Identify underrepresented groups

### Use Case 3: Audit User Activity
1. Check Audit Events on main dashboard
2. See latest user actions
3. Review who accessed which patients/trials
4. Export full audit report for compliance

### Use Case 4: Monitor System Compliance
1. Dashboard shows compliance score
2. View real-time PII protection metrics
3. Check encryption and RBAC status
4. Verify CDSCO compliance standards

## Integration Points

- **No Backend Changes Needed**: Auditors already have superuser access
- **Frontend Shows Real-Time Data**: All from live API endpoints
- **Authorization Enforced**: Backend validates AUDITOR role
- **PII Already Redacted**: Automatic on storage, auditors see clean data
- **Audit Trail Complete**: Every action logged and queryable

