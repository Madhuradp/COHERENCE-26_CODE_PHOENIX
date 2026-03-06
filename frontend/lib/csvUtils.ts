/**
 * CSV Export Utilities
 */

export interface TrialMatchResult {
  nct_id: string;
  status: string;
  confidence_score: number;
  explanation: string;
  distance_km?: number;
  tier2_score?: number;
  criteria_met?: string[];
  criteria_failed?: string[];
  unclear_checks?: string[];
}

export interface PatientInfo {
  display_id: string;
  age?: number;
  gender?: string;
  primary_condition?: string;
  medications_count?: number;
  lab_values_count?: number;
}

/**
 * Export trial matching results as CSV
 */
export function exportMatchResultsAsCSV(
  patientInfo: PatientInfo,
  matches: TrialMatchResult[],
  filename?: string
): void {
  // Prepare CSV headers
  const headers = [
    "Patient ID",
    "Patient Age",
    "Patient Gender",
    "Primary Condition",
    "Trial NCT ID",
    "Trial Status",
    "Match Confidence",
    "Similarity Score",
    "Distance (km)",
    "Explanation",
    "Criteria Met",
    "Criteria Failed",
  ];

  // Prepare CSV rows
  const rows = matches.map((match) => [
    patientInfo.display_id || "N/A",
    patientInfo.age ? String(patientInfo.age) : "N/A",
    patientInfo.gender || "N/A",
    patientInfo.primary_condition || "N/A",
    match.nct_id,
    match.status,
    (match.confidence_score * 100).toFixed(1) + "%",
    match.tier2_score ? match.tier2_score.toFixed(2) : "N/A",
    match.distance_km ? match.distance_km.toFixed(2) : "N/A",
    `"${(match.explanation || "").replace(/"/g, '""')}"`, // Escape quotes
    (match.criteria_met || []).join("; "),
    (match.criteria_failed || []).join("; "),
  ]);

  // Combine headers and rows
  const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");

  // Create blob and download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    filename || `trial-matches-${patientInfo.display_id || "export"}-${new Date().toISOString().split("T")[0]}.csv`
  );
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export clinical trials as CSV
 */
export function exportTrialsAsCSV(
  trials: Array<{
    nct_id?: string;
    title?: string;
    brief_title?: string;
    status?: string;
    phase?: string;
    sponsor?: string;
    enrollment?: number;
    conditions?: string[];
    keywords?: string[];
    locations?: Array<{ city?: string; state?: string; country?: string }>;
    start_date?: string;
    completion_date?: string;
  }>,
  filename?: string
): void {
  const headers = [
    "NCT ID",
    "Title",
    "Status",
    "Phase",
    "Sponsor",
    "Enrollment",
    "Conditions",
    "Keywords",
    "Locations",
    "Start Date",
    "Completion Date"
  ];

  const rows = trials.map((trial) => [
    trial.nct_id || "N/A",
    trial.title || trial.brief_title || "N/A",
    trial.status || "N/A",
    trial.phase || "N/A",
    trial.sponsor || "N/A",
    trial.enrollment ? String(trial.enrollment) : "N/A",
    (trial.conditions || []).join("; "),
    (trial.keywords || []).join("; "),
    ((trial.locations || []).map((l) => `${l.city || ""}, ${l.state || ""}, ${l.country || ""}`).filter(l => l.trim()).join("; ")) || "N/A",
    trial.start_date || "N/A",
    trial.completion_date || "N/A"
  ]);

  const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename || `clinical-trials-${new Date().toISOString().split("T")[0]}.csv`);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export patient data as CSV
 */
export function exportPatientsAsCSV(
  patients: Array<{
    display_id: string;
    age?: number;
    gender?: string;
    primary_condition?: string;
    medications_count?: number;
    lab_values_count?: number;
  }>,
  filename?: string
): void {
  const headers = [
    "Patient ID",
    "Age",
    "Gender",
    "Primary Condition",
    "Medications Count",
    "Lab Values Count",
  ];

  const rows = patients.map((patient) => [
    patient.display_id || "N/A",
    patient.age ? String(patient.age) : "N/A",
    patient.gender || "N/A",
    patient.primary_condition || "N/A",
    patient.medications_count ? String(patient.medications_count) : "0",
    patient.lab_values_count ? String(patient.lab_values_count) : "0",
  ]);

  const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename || `patients-export-${new Date().toISOString().split("T")[0]}.csv`);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
