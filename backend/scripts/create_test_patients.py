"""
Script to create realistic test patient records for trial matching demo
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from app.core.database import Database
from app.services.semantic_search import SemanticSearchService
from datetime import datetime

TEST_PATIENTS = [
    {
        "display_id": "PAT-001",
        "demographics": {
            "age": 58,
            "gender": "Male",
            "location": {"city": "San Francisco", "state": "CA", "country": "USA"}
        },
        "conditions": [
            {"name": "Stage III Non-Small Cell Lung Cancer", "icd10": "C34.90"},
            {"name": "Type 2 Diabetes Mellitus", "icd10": "E11.9"}
        ],
        "medications": [
            {"name": "Carboplatin", "dosage": "450 mg IV", "status": "active"},
            {"name": "Pemetrexed", "dosage": "500 mg/m2", "status": "active"},
            {"name": "Metformin", "dosage": "1000 mg daily", "status": "active"}
        ],
        "lab_values": [
            {"name": "EGFR", "value": 45, "unit": "mL/min/1.73m2", "date": "2024-03-01"},
            {"name": "HbA1c", "value": 7.2, "unit": "%", "date": "2024-03-01"},
            {"name": "WBC", "value": 6.8, "unit": "K/uL", "date": "2024-03-01"},
        ],
        "clinical_notes_text": "58-year-old male with stage 3 NSCLC, currently on platinum-based chemotherapy. Well-controlled diabetes. Eligible for immunotherapy trials.",
        "patient_email": "patient1@example.com"
    },
    {
        "display_id": "PAT-002",
        "demographics": {
            "age": 72,
            "gender": "Female",
            "location": {"city": "New York", "state": "NY", "country": "USA"}
        },
        "conditions": [
            {"name": "Metastatic Breast Cancer", "icd10": "C50.90"},
            {"name": "Hypertension", "icd10": "I10"}
        ],
        "medications": [
            {"name": "Letrozole", "dosage": "2.5 mg daily", "status": "active"},
            {"name": "Lisinopril", "dosage": "10 mg daily", "status": "active"},
            {"name": "Alendronate", "dosage": "70 mg weekly", "status": "active"}
        ],
        "lab_values": [
            {"name": "EGFR", "value": 52, "unit": "mL/min/1.73m2", "date": "2024-03-02"},
            {"name": "Hemoglobin", "value": 11.5, "unit": "g/dL", "date": "2024-03-02"},
            {"name": "Platelets", "value": 185, "unit": "K/uL", "date": "2024-03-02"},
        ],
        "clinical_notes_text": "72-year-old postmenopausal female with HR+ metastatic breast cancer. Stable on hormonal therapy. Interested in clinical trials.",
        "patient_email": "patient2@example.com"
    },
    {
        "display_id": "PAT-003",
        "demographics": {
            "age": 45,
            "gender": "Male",
            "location": {"city": "Boston", "state": "MA", "country": "USA"}
        },
        "conditions": [
            {"name": "Melanoma Stage IIIC", "icd10": "C43.9"},
            {"name": "Hyperlipidemia", "icd10": "E78.0"}
        ],
        "medications": [
            {"name": "Nivolumab", "dosage": "480 mg IV q4w", "status": "active"},
            {"name": "Atorvastatin", "dosage": "40 mg daily", "status": "active"}
        ],
        "lab_values": [
            {"name": "LDH", "value": 380, "unit": "U/L", "date": "2024-03-01"},
            {"name": "Creatinine", "value": 0.9, "unit": "mg/dL", "date": "2024-03-01"},
            {"name": "ALT", "value": 32, "unit": "U/L", "date": "2024-03-01"},
        ],
        "clinical_notes_text": "45-year-old male with stage IIIC cutaneous melanoma on immunotherapy. No evidence of metastasis. Excellent performance status.",
        "patient_email": "patient3@example.com"
    },
    {
        "display_id": "PAT-004",
        "demographics": {
            "age": 62,
            "gender": "Female",
            "location": {"city": "Los Angeles", "state": "CA", "country": "USA"}
        },
        "conditions": [
            {"name": "Pancreatic Cancer Stage IV", "icd10": "C25.9"},
            {"name": "Chronic Pancreatitis", "icd10": "K86.1"}
        ],
        "medications": [
            {"name": "Gemcitabine", "dosage": "1000 mg/m2 IV", "status": "active"},
            {"name": "Pancreatic Enzyme", "dosage": "25000 units with meals", "status": "active"}
        ],
        "lab_values": [
            {"name": "CA 19-9", "value": 580, "unit": "U/mL", "date": "2024-02-28"},
            {"name": "EGFR", "value": 68, "unit": "mL/min/1.73m2", "date": "2024-02-28"},
            {"name": "Bilirubin", "value": 1.2, "unit": "mg/dL", "date": "2024-02-28"},
        ],
        "clinical_notes_text": "62-year-old female with metastatic pancreatic cancer. Currently on first-line gemcitabine. Seeking precision medicine trials.",
        "patient_email": "patient4@example.com"
    },
    {
        "display_id": "PAT-005",
        "demographics": {
            "age": 55,
            "gender": "Male",
            "location": {"city": "Chicago", "state": "IL", "country": "USA"}
        },
        "conditions": [
            {"name": "Prostate Cancer", "icd10": "C61"},
            {"name": "Benign Prostatic Hyperplasia", "icd10": "N40.0"}
        ],
        "medications": [
            {"name": "Abiraterone", "dosage": "1000 mg daily", "status": "active"},
            {"name": "Prednisone", "dosage": "5 mg daily", "status": "active"},
            {"name": "Tamsulosin", "dosage": "0.4 mg daily", "status": "active"}
        ],
        "lab_values": [
            {"name": "PSA", "value": 12.5, "unit": "ng/mL", "date": "2024-03-01"},
            {"name": "Testosterone", "value": 8, "unit": "ng/dL", "date": "2024-03-01"},
            {"name": "EGFR", "value": 78, "unit": "mL/min/1.73m2", "date": "2024-03-01"},
        ],
        "clinical_notes_text": "55-year-old male with hormone-sensitive prostate cancer on androgen deprivation therapy. Open to hormone-resistant trials if disease progresses.",
        "patient_email": "patient5@example.com"
    }
]

def create_test_patients():
    """Create test patient records"""
    db = Database()
    semantic = SemanticSearchService()

    print(f"Creating {len(TEST_PATIENTS)} test patients...")

    created_ids = []
    for idx, patient_data in enumerate(TEST_PATIENTS, 1):
        try:
            # Generate embedding
            patient_data["embedding"] = semantic.generate_patient_embedding(patient_data).tolist()
            patient_data["created_at"] = datetime.utcnow()

            # Insert to database
            result = db.patients.insert_one(patient_data)
            patient_id = str(result.inserted_id)
            created_ids.append(patient_id)

            print(f"[OK] Created {patient_data['display_id']}: {patient_id}")
        except Exception as e:
            print(f"[ERROR] Failed to create patient {idx}: {str(e)}")

    print(f"\n[SUCCESS] Created {len(created_ids)} test patients")
    print(f"\nPatient IDs created:")
    for pid in created_ids:
        print(f"  - {pid}")

    return created_ids

if __name__ == "__main__":
    create_test_patients()
