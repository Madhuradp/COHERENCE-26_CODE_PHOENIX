const BASE_URL = 'http://localhost:8000';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    try {
      const err = await res.json();
      message = err.detail || err.message || message;
    } catch {}
    throw new Error(message);
  }

  return res.json();
}

// ── Types ────────────────────────────────────────────────────────────

export interface DoctorProfile {
  medical_degree: string;
  specialization?: string;
  license_number?: string;
  hospital_name: string;
  hospital_city?: string;
  hospital_country?: string;
  years_of_experience?: number;
  phone?: string;
  is_verified?: boolean;
}

export interface PharmaceuticalCompanyProfile {
  company_name: string;
  company_registration_number?: string;
  department: string;
  country: string;
  industry_focus?: string[];
  company_phone?: string;
  website?: string;
  is_verified?: boolean;
}

export interface ClinicalResearcherProfile {
  full_name: string;
  research_fields: string[];
  institution?: string;
  institution_country?: string;
  publications_count?: number;
  h_index?: number;
  orcid?: string;
  is_verified?: boolean;
}

export interface PatientProfile {
  patient_name: string;
  date_of_birth?: string;
  patient_id?: string;
  primary_condition?: string;
  additional_conditions?: string[];
  phone?: string;
}

export interface UserResponse {
  email: string;
  role: string;
  full_name?: string;
  is_active: boolean;
  is_email_verified: boolean;
  created_at: string;
  last_login?: string;
  doctor_profile?: DoctorProfile;
  pharma_profile?: PharmaceuticalCompanyProfile;
  researcher_profile?: ClinicalResearcherProfile;
  patient_profile?: PatientProfile;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: UserResponse;
}

export interface Patient {
  _id: string;
  display_id?: string;
  demographics?: { age?: number; gender?: string; location?: unknown };
  conditions?: Array<{ name: string; icd10?: string }>;
  medications?: Array<{ name: string; dosage?: string; status?: string }>;
  lab_values?: Array<{ name: string; value?: number; unit?: string; date?: string }>;
  clinical_notes_text?: string;
  patient_email?: string;
}

export interface Trial {
  _id: string;
  nct_id: string;
  title: string;
  brief_title?: string;
  phase?: string;
  status: string;
  conditions?: string[];
  keywords?: string[];
  sponsor?: string;
  enrollment?: number;
  eligibility?: {
    min_age?: number;
    max_age?: number;
    gender?: string;
    raw_text?: string;
  };
  locations?: Array<{
    facility: string;
    city: string;
    state?: string;
    country: string;
  }>;
  start_date?: string;
  completion_date?: string;
}

export interface MatchAnalysis {
  summary?: string;
  criteria_met?: string[];
  criteria_failed?: string[];
  warnings?: string[];
}

export interface MatchResult {
  _id?: string;
  patient_id: string;
  nct_id: string;
  run_date?: string;
  status: 'ELIGIBLE' | 'INELIGIBLE' | 'REVIEW_NEEDED';
  confidence_score: number;
  analysis?: MatchAnalysis;
  distance_km?: number;
}

export interface AnalyticsSummary {
  counts: { patients: number; trials: number; matches: number };
  privacy: { entities_protected: number; audit_logs_count: number };
  matching_health: { eligible_count: number; review_needed: number; ineligible_count: number };
}

export interface TrainingStats {
  total_match_results: number;
  training_samples_available: number;
  eligible_samples: number;
  ineligible_samples: number;
  review_needed_samples: number;
  class_balance: { eligible_ratio: number; ineligible_ratio: number };
  ready_to_train: boolean;
}

export interface AuditLog {
  _id: string;
  document_id?: string;
  document_type?: string;
  timestamp?: string;
  user_email?: string;
  event_type?: string;
  action?: string;
  details?: Record<string, unknown>;
  action_by?: string;
}

// ── Auth ─────────────────────────────────────────────────────────────

export async function authLogin(email: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function authRegister(
  role: string,
  data: Record<string, unknown>
): Promise<{ success: boolean; message: string; user_id: string; email: string; role: string }> {
  const roleEndpoints: Record<string, string> = {
    'doctor': '/api/auth/register/doctor',
    'DOCTOR': '/api/auth/register/doctor',
    'pharma': '/api/auth/register/pharmaceutical-company',
    'PHARMACEUTICAL_COMPANY': '/api/auth/register/pharmaceutical-company',
    'PHARMACIST': '/api/auth/register/pharmaceutical-company',
    'researcher': '/api/auth/register/researcher',
    'CLINICAL_RESEARCHER': '/api/auth/register/researcher',
    'RESEARCHER': '/api/auth/register/researcher',
    'patient': '/api/auth/register/patient',
    'PATIENT': '/api/auth/register/patient',
  };

  const endpoint = roleEndpoints[role];
  if (!endpoint) {
    throw new Error(`Unknown role: ${role}`);
  }

  return apiFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function authMe(): Promise<UserResponse> {
  return apiFetch<UserResponse>('/api/auth/me');
}

export async function listClinicians(): Promise<{ success: boolean; data: UserResponse[]; count: number }> {
  return apiFetch('/api/auth/clinicians/list');
}

export async function getUserActivity(limit = 100): Promise<{ success: boolean; data: AuditLog[]; count: number }> {
  return apiFetch(`/api/auth/audit/activity?limit=${limit}`);
}

// ── Patients ─────────────────────────────────────────────────────────

export async function listPatients(): Promise<{ success: boolean; data: Patient[] }> {
  return apiFetch('/api/patients/');
}

export async function uploadPatient(patientData: Record<string, unknown>): Promise<{ success: boolean; data: { id: string; pii_redacted?: number }; message: string }> {
  return apiFetch('/api/patients/upload', {
    method: 'POST',
    body: JSON.stringify(patientData),
  });
}

export async function findMyMatches(patientId: string): Promise<{ success: boolean; data: MatchResult[]; message: string }> {
  return apiFetch(`/api/patients/find-my-matches?patient_id=${patientId}`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function getAuditLogs(): Promise<{ success: boolean; data: AuditLog[]; message: string }> {
  return apiFetch('/api/patients/audit-logs');
}

export async function getFairnessStats(): Promise<{ success: boolean; data: Record<string, unknown>; message: string }> {
  return apiFetch('/api/patients/fairness-stats');
}

// ── Trials ───────────────────────────────────────────────────────────

export async function searchTrials(params?: {
  condition?: string;
  min_age?: number;
  max_age?: number;
  limit?: number;
}): Promise<{ success: boolean; count: number; data: Trial[] }> {
  const qs = new URLSearchParams();
  if (params?.condition) qs.set('condition', params.condition);
  if (params?.min_age !== undefined) qs.set('min_age', String(params.min_age));
  if (params?.max_age !== undefined) qs.set('max_age', String(params.max_age));
  if (params?.limit !== undefined) qs.set('limit', String(params.limit));
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return apiFetch(`/api/trials/search${query}`);
}

export async function syncTrials(extractCriteria = true): Promise<{ success: boolean; message: string; extraction_stats?: unknown }> {
  return apiFetch(`/api/trials/sync?extract_criteria=${extractCriteria}`, { method: 'POST' });
}

export async function searchTrialsLive(params?: {
  condition?: string;
  location?: string;
  limit?: number;
}): Promise<{ success: boolean; count: number; source: string; data: Trial[] }> {
  const qs = new URLSearchParams();
  if (params?.condition) qs.set('condition', params.condition);
  if (params?.location) qs.set('location', params.location);
  if (params?.limit !== undefined) qs.set('limit', String(params.limit));
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return apiFetch(`/api/trials/search-live${query}`);
}

// ── Matching ─────────────────────────────────────────────────────────

export async function runMatch(patientId: string): Promise<{ patient: string; matches: MatchResult[] }> {
  return apiFetch(`/api/match/run/${patientId}`, { method: 'POST' });
}

export async function getMatchResults(patientId: string): Promise<{ success: boolean; data: MatchResult[] }> {
  return apiFetch(`/api/match/results/${patientId}`);
}

// ── Analytics ────────────────────────────────────────────────────────

export async function getAnalyticsSummary(): Promise<{ success: boolean; data: AnalyticsSummary }> {
  return apiFetch('/api/analytics/summary');
}

export async function getTrainingStats(): Promise<{ success: boolean; data: TrainingStats }> {
  return apiFetch('/api/analytics/training-stats');
}

export async function trainModel(modelType: 'random_forest' | 'gradient_boosting' = 'random_forest'): Promise<{
  success: boolean;
  model_type: string;
  message: string;
  metrics: Record<string, unknown>;
  error?: string;
}> {
  return apiFetch('/api/analytics/train', {
    method: 'POST',
    body: JSON.stringify({ model_type: modelType, test_size: 0.2, save_model: true }),
  });
}

export async function getMLModelInfo(): Promise<{ success: boolean; data: Record<string, unknown> }> {
  return apiFetch('/api/analytics/ml-model-info');
}
