"""
Script to populate MongoDB with sample data in the correct schema format
"""

import sys
from pathlib import Path
from datetime import datetime, timedelta
import random
import bcrypt

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config import Config
from pymongo import MongoClient, GEOSPHERE
from pymongo.errors import PyMongoError


def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def create_indexes(db):
    """Create database indexes"""
    print("Creating database indexes...")

    try:
        # Patients collection
        db.patients.create_index("display_id", unique=True)
        db.patients.create_index([("demographics.location", GEOSPHERE)])
        db.patients.create_index("conditions.name")

        # Trials collection
        db.clinical_trials.create_index("nct_id", unique=True)
        db.clinical_trials.create_index([("locations.geo", GEOSPHERE)])
        db.clinical_trials.create_index("conditions")
        db.clinical_trials.create_index("status")

        # Match results
        db.match_results.create_index("patient_id")
        db.match_results.create_index("nct_id")
        db.match_results.create_index([("patient_id", 1), ("nct_id", 1)], unique=True)

        # Users collection
        db.users.create_index("email", unique=True)

        # Audit logs
        db.audit_logs.create_index("timestamp")
        db.audit_logs.create_index("event_type")
        db.audit_logs.create_index("patient_id")

        print("✓ All indexes created successfully")
    except Exception as e:
        print(f"Error creating indexes: {e}")


def populate_users(db):
    """Create sample users"""
    print("\nPopulating users...")

    db.users.delete_many({})

    users = [
        {
            "email": "dr.senku@cityhospital.com",
            "password_hash": hash_password("SecurePass123!"),
            "full_name": "Dr. Senku Stone",
            "role": "CLINICIAN",
            "organization": "City Hospital",
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "email": "dr.emma@ucsf.edu",
            "password_hash": hash_password("SecurePass123!"),
            "full_name": "Dr. Emma Watson",
            "role": "RESEARCHER",
            "organization": "UCSF Medical Center",
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "email": "admin@trials.com",
            "password_hash": hash_password("SecurePass123!"),
            "full_name": "Administrator",
            "role": "ADMIN",
            "organization": "Trial Match Inc",
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "email": "auditor@trials.com",
            "password_hash": hash_password("SecurePass123!"),
            "full_name": "Compliance Auditor",
            "role": "AUDITOR",
            "organization": "Trial Match Inc",
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    ]

    result = db.users.insert_many(users)
    print(f"✓ Created {len(result.inserted_ids)} users")
    return result.inserted_ids


def populate_patients(db, user_ids):
    """Create sample patients"""
    print("\nPopulating patients...")

    db.patients.delete_many({})

    conditions_db = [
        {"name": "Type 2 Diabetes", "icd10": "E11.9"},
        {"name": "Hypertension", "icd10": "I10"},
        {"name": "Cancer", "icd10": "C80"},
        {"name": "Heart Disease", "icd10": "I25.9"},
        {"name": "COPD", "icd10": "J44.9"},
    ]

    medications_db = [
        {"name": "Metformin", "dosage": "500mg"},
        {"name": "Lisinopril", "dosage": "10mg"},
        {"name": "Aspirin", "dosage": "81mg"},
        {"name": "Atorvastatin", "dosage": "20mg"},
        {"name": "Albuterol", "dosage": "90mcg"},
    ]

    cities = [
        {"city": "San Francisco", "coords": [-122.41, 37.77]},
        {"city": "New York", "coords": [-74.00, 40.71]},
        {"city": "Los Angeles", "coords": [-118.24, 34.05]},
        {"city": "Boston", "coords": [-71.06, 42.36]},
        {"city": "Chicago", "coords": [-87.62, 41.88]},
    ]

    patients = []
    for i in range(1, 11):  # 10 patients
        patient_conds = random.sample(conditions_db, k=random.randint(1, 2))
        patient_meds = random.sample(medications_db, k=random.randint(1, 3))

        city = random.choice(cities)

        patient = {
            "display_id": f"PT-{i:04d}",
            "demographics": {
                "age": random.randint(25, 80),
                "gender": random.choice(["male", "female", "other"]),
                "location": {
                    "type": "Point",
                    "coordinates": city["coords"]
                }
            },
            "conditions": [
                {
                    "name": c["name"],
                    "icd10": c["icd10"],
                    "onset": datetime.utcnow() - timedelta(days=random.randint(30, 1000))
                }
                for c in patient_conds
            ],
            "medications": [
                {
                    "name": m["name"],
                    "dosage": m["dosage"],
                    "status": random.choice(["active", "inactive", "discontinued"])
                }
                for m in patient_meds
            ],
            "lab_values": [
                {
                    "name": "HbA1c",
                    "value": round(random.uniform(6.0, 10.0), 1),
                    "unit": "%",
                    "date": datetime.utcnow() - timedelta(days=random.randint(1, 60))
                },
                {
                    "name": "Blood Pressure",
                    "value": random.randint(110, 160),
                    "unit": "mmHg",
                    "date": datetime.utcnow() - timedelta(days=random.randint(1, 30))
                },
                {
                    "name": "Glucose",
                    "value": round(random.uniform(80, 250), 1),
                    "unit": "mg/dL",
                    "date": datetime.utcnow() - timedelta(days=random.randint(1, 30))
                }
            ],
            "clinical_notes_text": f"Patient presents with {patient_conds[0]['name']}. Currently on multiple medications.",
            "embedding": [round(random.uniform(-1, 1), 3) for _ in range(50)],
            "created_at": datetime.utcnow() - timedelta(days=random.randint(1, 365)),
            "updated_at": datetime.utcnow()
        }
        patients.append(patient)

    result = db.patients.insert_many(patients)
    print(f"✓ Created {len(result.inserted_ids)} patients")
    return result.inserted_ids


def populate_trials(db):
    """Create sample clinical trials"""
    print("\nPopulating clinical trials...")

    db.clinical_trials.delete_many({})

    trial_data = [
        {
            "nct_id": "NCT04582292",
            "title": "HARMONY OUTCOMES Extension Study for Alogliptin",
            "brief_title": "HARMONY Trial Extension",
            "phase": "Phase 3",
            "status": "RECRUITING",
            "conditions": ["Type 2 Diabetes Mellitus"],
        },
        {
            "nct_id": "NCT04603599",
            "title": "A Study of Dapagliflozin (Farxiga) in Participants With Heart Failure",
            "brief_title": "DELIVER Trial",
            "phase": "Phase 3",
            "status": "RECRUITING",
            "conditions": ["Heart Failure", "Diabetes"],
        },
        {
            "nct_id": "NCT04233996",
            "title": "Trial of Inactivated COVID-19 Vaccine",
            "brief_title": "COVID-19 Vaccine Trial",
            "phase": "Phase 3",
            "status": "COMPLETED",
            "conditions": ["COVID-19"],
        },
        {
            "nct_id": "NCT02994108",
            "title": "SUSTAIN 6 Trial: Semaglutide vs Insulin Glargine in Type 2 Diabetes",
            "brief_title": "SUSTAIN 6 Study",
            "phase": "Phase 3",
            "status": "COMPLETED",
            "conditions": ["Type 2 Diabetes Mellitus"],
        },
        {
            "nct_id": "NCT04382989",
            "title": "A Study of Remdesivir in Hospitalized Participants With Moderate COVID-19",
            "brief_title": "SIMPLE-Moderate",
            "phase": "Phase 3",
            "status": "COMPLETED",
            "conditions": ["COVID-19"],
        },
    ]

    locations_data = [
        {"city": "San Francisco", "state": "CA", "coords": [-122.45, 37.76]},
        {"city": "New York", "state": "NY", "coords": [-73.97, 40.78]},
        {"city": "Los Angeles", "state": "CA", "coords": [-118.24, 34.05]},
        {"city": "Boston", "state": "MA", "coords": [-71.06, 42.36]},
        {"city": "Chicago", "state": "IL", "coords": [-87.62, 41.88]},
    ]

    trials = []
    for trial in trial_data:
        locs = random.sample(locations_data, k=random.randint(1, 3))

        trial_doc = {
            "nct_id": trial["nct_id"],
            "title": trial["title"],
            "brief_title": trial["brief_title"],
            "phase": trial["phase"],
            "status": trial["status"],
            "eligibility": {
                "min_age": 18,
                "max_age": random.choice([65, 75, 85, None]),
                "gender": random.choice(["ALL", "MALE", "FEMALE"]),
                "raw_text": f"Inclusion: Age 18+, {trial['conditions'][0]}. Exclusion: Pregnancy"
            },
            "locations": [
                {
                    "facility": f"{loc['city']} Medical Center",
                    "city": loc["city"],
                    "state": loc["state"],
                    "country": "United States",
                    "geo": {
                        "type": "Point",
                        "coordinates": loc["coords"]
                    }
                }
                for loc in locs
            ],
            "start_date": datetime.utcnow() - timedelta(days=random.randint(30, 600)),
            "completion_date": datetime.utcnow() + timedelta(days=random.randint(30, 600)),
            "conditions": trial["conditions"],
            "keywords": trial["conditions"] + ["treatment"],
            "interventions": [
                {
                    "name": f"Drug for {trial['conditions'][0]}",
                    "type": "Drug",
                    "description": f"Treatment for {trial['conditions'][0]}"
                }
            ],
            "enrollment": random.randint(100, 5000),
            "sponsor": random.choice(["Eli Lilly", "Novo Nordisk", "Pfizer", "AstraZeneca", "NIH"]),
            "embedding": [round(random.uniform(-1, 1), 3) for _ in range(50)],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        trials.append(trial_doc)

    result = db.clinical_trials.insert_many(trials)
    print(f"✓ Created {len(result.inserted_ids)} clinical trials")
    return result.inserted_ids


def populate_match_results(db, patient_ids, trial_ids):
    """Create sample match results"""
    print("\nPopulating match results...")

    db.match_results.delete_many({})

    match_results = []
    for patient_id in patient_ids[:5]:
        for trial_id in random.sample(trial_ids, k=random.randint(1, 3)):
            trial = db.clinical_trials.find_one({"_id": trial_id})
            patient = db.patients.find_one({"_id": patient_id})

            if not trial or not patient:
                continue

            status = random.choice(["ELIGIBLE", "INELIGIBLE", "REVIEW_NEEDED"])
            confidence = random.uniform(0.5, 0.99) if status == "ELIGIBLE" else random.uniform(0.2, 0.7)

            match = {
                "patient_id": str(patient_id),
                "nct_id": trial["nct_id"],
                "run_date": datetime.utcnow(),
                "status": status,
                "confidence_score": round(confidence, 2),
                "analysis": {
                    "summary": f"Patient age {patient['demographics']['age']} for {trial['conditions'][0]}",
                    "criteria_met": [
                        f"Age ({patient['demographics']['age']} within criteria)",
                        f"Condition ({trial['conditions'][0]})"
                    ],
                    "criteria_failed": [] if status == "ELIGIBLE" else ["Additional review"],
                    "warnings": ["Verify medications"] if status != "INELIGIBLE" else []
                },
                "distance_km": round(random.uniform(1, 100), 1),
                "created_at": datetime.utcnow()
            }
            match_results.append(match)

    if match_results:
        result = db.match_results.insert_many(match_results)
        print(f"✓ Created {len(result.inserted_ids)} match results")
    else:
        print("✓ No match results created")


def populate_audit_logs(db, patient_ids, user_ids):
    """Create sample audit logs"""
    print("\nPopulating audit logs...")

    db.audit_logs.delete_many({})

    audit_logs = []
    for i in range(20):
        log = {
            "timestamp": datetime.utcnow() - timedelta(days=random.randint(0, 30)),
            "event_type": random.choice(["MATCH_GENERATED", "PII_REDACTED", "BIAS_CHECK", "DATA_ACCESSED"]),
            "patient_id": str(random.choice(patient_ids)) if random.random() > 0.3 else None,
            "user_id": str(random.choice(user_ids)),
            "details": {
                "action": "Database operation",
                "bias_check_passed": random.choice([True, False]),
                "confidence_score": round(random.uniform(0.5, 0.99), 2)
            },
            "action_by": "System",
            "created_at": datetime.utcnow()
        }
        audit_logs.append(log)

    result = db.audit_logs.insert_many(audit_logs)
    print(f"✓ Created {len(result.inserted_ids)} audit logs")


def main():
    """Main populate function"""
    print("=" * 60)
    print("Database Population Script")
    print("=" * 60)

    try:
        client = MongoClient(Config.MONGODB_URL, serverSelectionTimeoutMS=5000)
        db = client[Config.DATABASE_NAME]

        client.admin.command('ping')
        print(f"\n✓ Connected to MongoDB: {Config.DATABASE_NAME}")

        create_indexes(db)

        user_ids = populate_users(db)
        patient_ids = populate_patients(db, user_ids)
        trial_ids = populate_trials(db)
        populate_match_results(db, patient_ids, trial_ids)
        populate_audit_logs(db, patient_ids, user_ids)

        print("\n" + "=" * 60)
        print("Database Statistics")
        print("=" * 60)
        print(f"Users: {db.users.count_documents({})}")
        print(f"Patients: {db.patients.count_documents({})}")
        print(f"Clinical Trials: {db.clinical_trials.count_documents({})}")
        print(f"Match Results: {db.match_results.count_documents({})}")
        print(f"Audit Logs: {db.audit_logs.count_documents({})}")

        client.close()
        print("\n✓ Database population complete!")
        print("=" * 60)

    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
