# TrialMatch

TrialMatch is an intelligent system that analyzes anonymized patient health records and automatically matches them with suitable clinical trials.

The platform parses clinical trial eligibility criteria, evaluates patient eligibility using rule-based logic and machine learning, ranks trials by suitability, and provides transparent explanations for each recommendation.

The goal is to accelerate clinical research recruitment while ensuring patient privacy and explainable AI-driven decisions.

---

# Tech Stack

| Layer | Technology | Purpose |
|------|------|------|
| Backend | FastAPI + Python | High-performance backend API |
| NLP Pipeline | spaCy + SciSpacy | Extract medical entities from clinical trial eligibility criteria |
| Vector Database | ChromaDB | Store embeddings for similarity search |
| Embeddings | sentence-transformers (all-MiniLM-L6-v2) | Convert medical text into vector embeddings |
| Clinical Trial Data | ClinicalTrials.gov API | Access real-world clinical trial datasets |
| Frontend | React + TailwindCSS | Interactive user dashboard |
| Anonymization | Microsoft Presidio | Remove PII from patient records |
| Rule Engine | Custom Python Logic | Transparent rule-based eligibility evaluation |
| Machine Learning | Scikit-learn | Predict trial eligibility probability |
| Patient Dataset | Synthea / MIMIC-IV | Patient health record datasets |

---

# System Workflow

TrialMatch follows a multi-stage pipeline to match patients with the most suitable clinical trials.

---

# 1. Patient Data Input

The system receives patient health records.

Example:

| Patient_ID | Age | Disease | HbA1c | Medication | Location |
|------|------|------|------|------|------|
| P101 | 52 | Diabetes | 8.5 | Metformin | Mumbai |

### Data Sources

- Hospital Electronic Health Records (EHR)
- Synthetic datasets generated using **Synthea**
- Clinical datasets such as **MIMIC-IV**

These attributes are used to evaluate trial eligibility.

---

# 2. Data Cleaning & Anonymization

Sensitive patient information is removed to protect privacy.

### Removed Fields

- Name
- Phone number
- Address
- Government IDs (SSN / Aadhaar)

### Example Transformation

**Before anonymization**

| Name | Age | Disease |
|------|------|------|
| Rahul | 52 | Diabetes |

**After anonymization**

| Patient_ID | Age | Disease |
|------|------|------|
| P101 | 52 | Diabetes |

This process is implemented using **Microsoft Presidio**.

---

# 3. Clinical Trial Dataset Input

The system loads clinical trial metadata and eligibility criteria.

Example:

| Trial_ID | Condition | Inclusion Criteria | Exclusion Criteria | Location |
|------|------|------|------|------|
| T101 | Diabetes | Age 40–65, HbA1c >7 | Kidney disease | Mumbai |

### Data Source

Clinical trial information is retrieved from the **ClinicalTrials.gov API**.

---

# 4. Eligibility Criteria Parsing (NLP)

Clinical trial eligibility criteria are written in natural language.

Example:

> “Patients aged 40–65 with Type 2 Diabetes and HbA1c above 7%”

The NLP pipeline converts this text into structured rules.

### Example Structured Output

Age >= 40
Age <= 65
Disease = Diabetes
HbA1c > 7


### Tools Used

- spaCy
- SciSpacy

This enables automated rule evaluation.

---

# 5. Rule-Based Eligibility Engine

The system evaluates patient data against the extracted eligibility rules.

### Example Trial Rules

Age >= 40
Disease = Diabetes
HbA1c > 7

### Patient Data

| Age | Disease | HbA1c |
|------|------|------|
| 52 | Diabetes | 8.5 |

### Evaluation

- Age check → PASS  
- Disease check → PASS  
- HbA1c check → PASS  

Result:

**Patient is eligible for this trial.**

Rule-based filtering removes clearly ineligible patients.

---

# 6. Machine Learning Matching Model

After rule-based filtering, a machine learning model estimates the probability of trial eligibility.

### Example Features

- Age
- Disease
- Lab results
- Comorbidities
- Medication history

Example output:

Eligibility Probability = 0.87


### Models Used

- Random Forest
- Logistic Regression
- Gradient Boosting

Machine learning helps capture complex relationships between patient attributes and trial criteria.

---

# 7. Trial Ranking Engine

A patient may match multiple clinical trials.

Example results:

| Trial | Probability |
|------|------|
| Trial A | 0.92 |
| Trial B | 0.83 |
| Trial C | 0.70 |

### Final Ranking

1. Trial A – 92%  
2. Trial B – 83%  
3. Trial C – 70%

---

# 8. Geographic Filtering

The system filters trials based on patient location.

Example:

Patient location: **Mumbai**

| Trial | Location |
|------|------|
| Trial A | Mumbai |
| Trial B | Delhi |

Recommended trial:

**Trial A**

This ensures patients can access nearby research centers.

---

# 9. Explainable AI (XAI)

The system provides explanations for why a patient matches or does not match a trial.

### Example Explanation

Eligible because:

- Age 52 within required range
- Diabetes diagnosis confirmed
- HbA1c above threshold

Rejected trials include reasons such as:

- History of kidney disease

### Tools

- SHAP
- LIME
- Rule-based explanation logic

Explainability ensures transparency in healthcare AI systems.

---

# 10. Confidence Score

Each recommendation includes a confidence score derived from the machine learning model.

| Trial | Confidence |
|------|------|
| Trial A | 92% |
| Trial B | 81% |

---

# 11. Final Dashboard Output

Doctors or researchers view recommendations in an interactive dashboard.

### Patient Information

| Field | Value |
|------|------|
| Patient ID | P101 |
| Age | 52 |
| Disease | Diabetes |
| Location | Mumbai |

### Recommended Trials

| Trial | Confidence | Location |
|------|------|------|
| Diabetes Drug Trial | 92% | Mumbai |
| Therapy Study | 83% | Pune |

### Explanation

Matched because:

- Age within required range
- Diabetes diagnosis confirmed
- HbA1c above threshold

---

# Complete Pipeline

Patient Health Records
↓
Data Cleaning & Anonymization
↓
Clinical Trial Dataset
↓
Eligibility Criteria Parsing (NLP)
↓
Rule-Based Matching
↓
Machine Learning Prediction
↓
Trial Ranking
↓
Explanation + Confidence Score
↓
Recommended Clinical Trials
