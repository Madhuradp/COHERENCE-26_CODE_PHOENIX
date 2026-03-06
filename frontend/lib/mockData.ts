// ── Stats ────────────────────────────────────────────────────────────
export const mockStats = {
  totalPatients: 1247,
  totalTrials: 89,
  activeTrials: 34,
  matchesGenerated: 3891,
};

// ── Recent Activity ──────────────────────────────────────────────────
export const mockActivity = [
  {
    id: 1,
    type: "upload",
    message: "Patient dataset uploaded (342 records)",
    time: "2 minutes ago",
    icon: "upload",
  },
  {
    id: 2,
    type: "match",
    message: "Trial T101 matching executed — 47 eligible patients found",
    time: "15 minutes ago",
    icon: "match",
  },
  {
    id: 3,
    type: "trial",
    message: "New trial 'Cardiology Phase III' created",
    time: "1 hour ago",
    icon: "trial",
  },
  {
    id: 4,
    type: "upload",
    message: "Patient dataset updated with 120 new records",
    time: "3 hours ago",
    icon: "upload",
  },
  {
    id: 5,
    type: "match",
    message: "Trial T205 matching executed — 23 eligible patients found",
    time: "Yesterday",
    icon: "match",
  },
];

// ── Disease Distribution ─────────────────────────────────────────────
export const mockDiseaseDistribution = [
  { name: "Diabetes", value: 342, color: "#8B5CF6" },
  { name: "Hypertension", value: 289, color: "#60A5FA" },
  { name: "Asthma", value: 198, color: "#FB923C" },
  { name: "Cardiac", value: 176, color: "#2DD4BF" },
  { name: "Cancer", value: 142, color: "#F87171" },
  { name: "Other", value: 100, color: "#A78BFA" },
];

// ── Age Distribution ─────────────────────────────────────────────────
export const mockAgeDistribution = [
  { range: "18-25", count: 85 },
  { range: "26-35", count: 148 },
  { range: "36-45", count: 213 },
  { range: "46-55", count: 289 },
  { range: "56-65", count: 317 },
  { range: "66-75", count: 145 },
  { range: "76+", count: 50 },
];

// ── Trials by Phase ─────────────────────────────────────────────────
export const mockTrialsByPhase = [
  { phase: "Phase I", count: 12 },
  { phase: "Phase II", count: 28 },
  { phase: "Phase III", count: 34 },
  { phase: "Phase IV", count: 15 },
];

// ── Patients ─────────────────────────────────────────────────────────
export interface Patient {
  patient_id: string;
  age: number;
  gender: string;
  disease: string;
  medications: string;
  HbA1c: number;
  cholesterol: number;
  glucose: number;
  blood_pressure: string;
  location: string;
  matchScore?: number;
}

export const mockPatients: Patient[] = [
  { patient_id: "P001", age: 52, gender: "M", disease: "Diabetes", medications: "Metformin", HbA1c: 8.5, cholesterol: 195, glucose: 140, blood_pressure: "130/85", location: "Mumbai", matchScore: 92 },
  { patient_id: "P002", age: 47, gender: "F", disease: "Hypertension", medications: "Amlodipine", HbA1c: 5.8, cholesterol: 210, glucose: 95, blood_pressure: "145/92", location: "Delhi", matchScore: 85 },
  { patient_id: "P003", age: 61, gender: "M", disease: "Asthma", medications: "Salbutamol", HbA1c: 5.2, cholesterol: 180, glucose: 88, blood_pressure: "120/78", location: "Pune", matchScore: 78 },
  { patient_id: "P004", age: 55, gender: "F", disease: "Diabetes", medications: "Insulin", HbA1c: 9.1, cholesterol: 220, glucose: 165, blood_pressure: "135/88", location: "Bangalore", matchScore: 95 },
  { patient_id: "P005", age: 43, gender: "M", disease: "Cardiac", medications: "Atorvastatin", HbA1c: 5.5, cholesterol: 240, glucose: 92, blood_pressure: "140/90", location: "Mumbai", matchScore: 70 },
  { patient_id: "P006", age: 58, gender: "F", disease: "Hypertension", medications: "Lisinopril", HbA1c: 6.1, cholesterol: 195, glucose: 98, blood_pressure: "150/95", location: "Chennai", matchScore: 88 },
  { patient_id: "P007", age: 49, gender: "M", disease: "Cancer", medications: "Tamoxifen", HbA1c: 5.6, cholesterol: 185, glucose: 90, blood_pressure: "118/76", location: "Hyderabad", matchScore: 62 },
  { patient_id: "P008", age: 66, gender: "F", disease: "Diabetes", medications: "Glipizide", HbA1c: 7.8, cholesterol: 200, glucose: 145, blood_pressure: "128/82", location: "Mumbai", matchScore: 89 },
  { patient_id: "P009", age: 38, gender: "M", disease: "Asthma", medications: "Budesonide", HbA1c: 5.0, cholesterol: 170, glucose: 84, blood_pressure: "115/72", location: "Kolkata", matchScore: 74 },
  { patient_id: "P010", age: 54, gender: "F", disease: "Cardiac", medications: "Bisoprolol", HbA1c: 5.9, cholesterol: 230, glucose: 100, blood_pressure: "142/88", location: "Delhi", matchScore: 81 },
];

// ── Clinical Trials ───────────────────────────────────────────────────
export interface ClinicalTrial {
  id: string;
  title: string;
  condition: string;
  phase: string;
  location: string;
  sponsor: string;
  status: "RECRUITING" | "ACTIVE" | "COMPLETED" | "NOT_YET_RECRUITING";
  startDate: string;
  completionDate: string;
  inclusionCriteria: string[];
  exclusionCriteria: string[];
  eligiblePatients?: number;
}

export const mockTrials: ClinicalTrial[] = [
  {
    id: "T101",
    title: "Diabetes Drug Trial — GLP-1 Phase III",
    condition: "Diabetes",
    phase: "Phase III",
    location: "Mumbai",
    sponsor: "Cipla Ltd",
    status: "RECRUITING",
    startDate: "2024-01-15",
    completionDate: "2025-12-31",
    inclusionCriteria: ["Age 40–65", "HbA1c > 7.0", "Type 2 Diabetes diagnosis", "BMI 25–40"],
    exclusionCriteria: ["Kidney disease (eGFR < 30)", "Pregnancy", "Severe hepatic impairment"],
    eligiblePatients: 47,
  },
  {
    id: "T205",
    title: "Hypertension Management Study",
    condition: "Hypertension",
    phase: "Phase II",
    location: "Delhi",
    sponsor: "Sun Pharma",
    status: "RECRUITING",
    startDate: "2024-03-01",
    completionDate: "2025-06-30",
    inclusionCriteria: ["Age 35–70", "Systolic BP > 140 mmHg", "On at least one antihypertensive"],
    exclusionCriteria: ["Secondary hypertension", "Recent MI (< 6 months)", "Renal artery stenosis"],
    eligiblePatients: 23,
  },
  {
    id: "T312",
    title: "Asthma Biologic Therapy Study",
    condition: "Asthma",
    phase: "Phase II",
    location: "Pune",
    sponsor: "Biocon",
    status: "ACTIVE",
    startDate: "2023-09-01",
    completionDate: "2025-03-31",
    inclusionCriteria: ["Age 18–60", "Moderate-to-severe asthma", "FEV1 < 70%"],
    exclusionCriteria: ["COPD diagnosis", "Active smoking (> 10 pack years)", "Recent hospitalization"],
    eligiblePatients: 18,
  },
  {
    id: "T418",
    title: "Cardiac Arrhythmia Prevention Trial",
    condition: "Cardiac",
    phase: "Phase III",
    location: "Bangalore",
    sponsor: "Dr Reddy's",
    status: "RECRUITING",
    startDate: "2024-06-01",
    completionDate: "2026-05-31",
    inclusionCriteria: ["Age 45–75", "Prior AF episode", "CHA2DS2-VASc ≥ 2"],
    exclusionCriteria: ["Active anticoagulation therapy", "Severe valve disease", "Recent stroke (< 3 months)"],
    eligiblePatients: 31,
  },
  {
    id: "T523",
    title: "Breast Cancer Immunotherapy Phase I",
    condition: "Cancer",
    phase: "Phase I",
    location: "Chennai",
    sponsor: "Serum Institute",
    status: "NOT_YET_RECRUITING",
    startDate: "2025-01-01",
    completionDate: "2026-12-31",
    inclusionCriteria: ["Age 30–65", "HER2+ breast cancer", "ECOG performance status 0–1"],
    exclusionCriteria: ["Prior immunotherapy", "Autoimmune disease", "Active brain metastases"],
    eligiblePatients: 0,
  },
];

// ── Match Results ─────────────────────────────────────────────────────
export const mockMatchResults = {
  eligiblePatients: 47,
  averageMatchScore: 84,
  trialsWithMatches: 4,
};

// ── Enrollment Trends ─────────────────────────────────────────────────
export const mockEnrollmentTrends = [
  { month: "Jan", enrolled: 38, screened: 112 },
  { month: "Feb", enrolled: 52, screened: 145 },
  { month: "Mar", enrolled: 61, screened: 178 },
  { month: "Apr", enrolled: 44, screened: 130 },
  { month: "May", enrolled: 73, screened: 195 },
  { month: "Jun", enrolled: 89, screened: 220 },
  { month: "Jul", enrolled: 95, screened: 241 },
];

// ── Eligible Patients per Trial ───────────────────────────────────────
export const mockEligiblePerTrial = [
  { trial: "T101 Diabetes", eligible: 47, total: 342 },
  { trial: "T205 Hypertension", eligible: 23, total: 289 },
  { trial: "T312 Asthma", eligible: 18, total: 198 },
  { trial: "T418 Cardiac", eligible: 31, total: 176 },
  { trial: "T523 Cancer", eligible: 0, total: 142 },
];

// ── Patient Location ──────────────────────────────────────────────────
export const mockLocationData = [
  { city: "Mumbai", count: 312 },
  { city: "Delhi", count: 278 },
  { city: "Bangalore", count: 198 },
  { city: "Pune", count: 167 },
  { city: "Chennai", count: 145 },
  { city: "Hyderabad", count: 147 },
];

// ── Analytics Insights ─────────────────────────────────────────────────
export const mockInsights = {
  mostActiveCondition: "Hypertension",
  topCity: "Mumbai",
  avgEnrollmentTime: "14 days",
  matchAccuracy: "91%",
};
