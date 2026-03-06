// ── Patient Health Profile ────────────────────────────────────────
export interface PatientHealthProfile {
  age: number;
  gender: string;
  location: string;
  disease: string;
  medications: string;
  smokingStatus: "non-smoker" | "former-smoker" | "smoker";
  bmi: number;
  HbA1c: number;
  cholesterol: number;
  glucose: number;
  blood_pressure: string;
  profileComplete: boolean;
}

export const mockPatientProfile: PatientHealthProfile = {
  age: 52,
  gender: "Male",
  location: "Mumbai",
  disease: "Type 2 Diabetes",
  medications: "Metformin 500mg",
  smokingStatus: "non-smoker",
  bmi: 27.4,
  HbA1c: 8.5,
  cholesterol: 195,
  glucose: 140,
  blood_pressure: "130/85",
  profileComplete: true,
};

// ── Patient Dashboard Stats ───────────────────────────────────────
export const mockPatientStats = {
  profileComplete: true,
  matchesFound: 3,
  applicationsSent: 1,
};

// ── Matched Trials (for patient view) ────────────────────────────
export interface PatientTrialMatch {
  id: string;
  title: string;
  condition: string;
  phase: string;
  location: string;
  sponsor: string;
  matchScore: number;
  status: "RECRUITING" | "ACTIVE" | "COMPLETED";
  startDate: string;
  completionDate: string;
  inclusionCriteria: string[];
  exclusionCriteria: string[];
  eligibilityReasons: string[];
}

export const mockPatientMatches: PatientTrialMatch[] = [
  {
    id: "T101",
    title: "Diabetes Drug Study — GLP-1 Phase III",
    condition: "Diabetes",
    phase: "Phase III",
    location: "Mumbai",
    sponsor: "Cipla Ltd",
    matchScore: 91,
    status: "RECRUITING",
    startDate: "2024-01-15",
    completionDate: "2025-12-31",
    inclusionCriteria: [
      "Age 40–65",
      "HbA1c > 7.0",
      "Type 2 Diabetes diagnosis",
      "BMI 25–40",
    ],
    exclusionCriteria: [
      "Kidney disease (eGFR < 30)",
      "Pregnancy",
      "Severe hepatic impairment",
    ],
    eligibilityReasons: [
      "Age 52 is within the required range (40–65)",
      "HbA1c 8.5 exceeds the threshold of 7.0",
      "Type 2 Diabetes diagnosis confirmed",
      "Location Mumbai matches trial site",
    ],
  },
  {
    id: "T205",
    title: "Heart Therapy Trial — Cardiac Phase II",
    condition: "Heart Disease",
    phase: "Phase II",
    location: "Pune",
    sponsor: "Sun Pharma",
    matchScore: 78,
    status: "RECRUITING",
    startDate: "2024-03-01",
    completionDate: "2025-06-30",
    inclusionCriteria: [
      "Age 35–70",
      "Diagnosed with cardiac condition",
      "Cholesterol > 180",
    ],
    exclusionCriteria: [
      "Recent MI (< 6 months)",
      "Severe renal failure",
    ],
    eligibilityReasons: [
      "Age 52 is within the required range (35–70)",
      "Cholesterol 195 exceeds threshold",
      "No recent cardiac events on record",
    ],
  },
  {
    id: "T312",
    title: "Asthma Treatment Study",
    condition: "Asthma",
    phase: "Phase II",
    location: "Delhi",
    sponsor: "Biocon",
    matchScore: 74,
    status: "ACTIVE",
    startDate: "2023-09-01",
    completionDate: "2025-03-31",
    inclusionCriteria: [
      "Age 18–60",
      "Moderate-to-severe respiratory condition",
    ],
    exclusionCriteria: ["Active smoking", "Recent hospitalization"],
    eligibilityReasons: [
      "Age 52 is within the required range",
      "Non-smoking status meets exclusion criteria",
      "No recent hospitalization on record",
    ],
  },
];

// ── Patient Applications ──────────────────────────────────────────
export type ApplicationStatus = "Under Review" | "Accepted" | "Rejected";

export interface PatientApplication {
  id: string;
  trialId: string;
  trialTitle: string;
  condition: string;
  location: string;
  status: ApplicationStatus;
  appliedDate: string;
  lastUpdated: string;
}

export const mockPatientApplications: PatientApplication[] = [
  {
    id: "APP001",
    trialId: "T101",
    trialTitle: "Diabetes Drug Study — GLP-1 Phase III",
    condition: "Diabetes",
    location: "Mumbai",
    status: "Under Review",
    appliedDate: "2024-03-05",
    lastUpdated: "2024-03-06",
  },
];

// ── Match History ─────────────────────────────────────────────────
export interface MatchHistoryEntry {
  id: string;
  date: string;
  trialId: string;
  trialTitle: string;
  condition: string;
  matchScore: number;
  action: "Applied" | "Viewed" | "Skipped";
}

export const mockMatchHistory: MatchHistoryEntry[] = [
  {
    id: "H001",
    date: "2024-03-05",
    trialId: "T101",
    trialTitle: "Diabetes Drug Study — GLP-1 Phase III",
    condition: "Diabetes",
    matchScore: 91,
    action: "Applied",
  },
  {
    id: "H002",
    date: "2024-03-05",
    trialId: "T205",
    trialTitle: "Heart Therapy Trial — Cardiac Phase II",
    condition: "Heart Disease",
    matchScore: 78,
    action: "Viewed",
  },
  {
    id: "H003",
    date: "2024-03-05",
    trialId: "T312",
    trialTitle: "Asthma Treatment Study",
    condition: "Asthma",
    matchScore: 74,
    action: "Skipped",
  },
  {
    id: "H004",
    date: "2024-02-18",
    trialId: "T418",
    trialTitle: "Cardiac Arrhythmia Prevention Trial",
    condition: "Cardiac",
    matchScore: 65,
    action: "Viewed",
  },
  {
    id: "H005",
    date: "2024-02-18",
    trialId: "T523",
    trialTitle: "Metabolic Syndrome Study",
    condition: "Diabetes",
    matchScore: 82,
    action: "Applied",
  },
];
