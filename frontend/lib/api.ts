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

export interface ResearcherProfile {
  full_name: string;
  research_fields: string[];
  institution?: string;
  institution_country?: string;
  publications_count?: number;
  h_index?: number;
  orcid?: string;
  is_verified?: boolean;
}

export interface AuditorProfile {
  full_name: string;
  organization: string;
  audit_focus?: string[];
  certification?: string;
  phone?: string;
  is_verified?: boolean;
}

export type UserRole = 'RESEARCHER' | 'AUDITOR';

export interface UserResponse {
  email: string;
  role: UserRole;
  is_active: boolean;
  is_email_verified: boolean;
  created_at: string;
  last_login?: string;
  researcher_profile?: ResearcherProfile;
  auditor_profile?: AuditorProfile;
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
  patient_id?: string;
  nct_id: string;
  title?: string;
  brief_title?: string;
  phase?: string;
  run_date?: string;
  status: 'ELIGIBLE' | 'INELIGIBLE' | 'REVIEW_NEEDED';
  confidence_score: number;
  analysis?: MatchAnalysis;
  distance_km?: number;
  conditions?: string[];
  // Detailed eligibility breakdown
  overall_eligibility?: 'ELIGIBLE' | 'INELIGIBLE' | 'REVIEW_NEEDED';
  inclusion_criteria?: Array<{
    criterion: string;
    patient_value?: string | number;
    status: 'MET' | 'NOT_MET';
  }>;
  exclusion_criteria?: Array<{
    criterion: string;
    patient_has?: boolean;
    status: 'NOT_EXCLUDED' | 'EXCLUDED';
  }>;
  // Analysis details
  explanation?: string;
  mapping_analysis?: string;
  fit_score?: number;
  semantic_score?: number;
  tier2_score?: number;
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
    'researcher': '/api/auth/register/researcher',
    'RESEARCHER': '/api/auth/register/researcher',
    'auditor': '/api/auth/register/auditor',
    'AUDITOR': '/api/auth/register/auditor',
  };

  const endpoint = roleEndpoints[role];
  if (!endpoint) {
    throw new Error(`Unknown role: ${role}. Must be 'RESEARCHER' or 'AUDITOR'.`);
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
  try {
    const result = await apiFetch<{ success: boolean; data: AuditLog[] }>('/api/patients/audit-logs');
    return {
      ...result,
      count: (result.data || []).slice(0, limit).length,
      data: (result.data || []).slice(0, limit),
    };
  } catch {
    return { success: false, data: [], count: 0 };
  }
}

// ── Patients ─────────────────────────────────────────────────────────

export async function listPatients(params?: {
  location?: string;
  age_min?: number;
  age_max?: number;
  gender?: string;
  condition?: string;
}): Promise<{ success: boolean; data: Patient[] }> {
  const qs = new URLSearchParams();
  if (params?.location) qs.set('location', params.location);
  if (params?.age_min !== undefined) qs.set('age_min', String(params.age_min));
  if (params?.age_max !== undefined) qs.set('age_max', String(params.age_max));
  if (params?.gender) qs.set('gender', params.gender);
  if (params?.condition) qs.set('condition', params.condition);
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return apiFetch(`/api/patients/${query}`);
}

export async function uploadPatient(patientData: Record<string, unknown>): Promise<{ success: boolean; data: { id: string; pii_redacted?: number }; message: string }> {
  return apiFetch('/api/patients/upload', {
    method: 'POST',
    body: JSON.stringify(patientData),
  });
}

export async function deletePatient(patientId: string): Promise<{ success: boolean; data: { deleted_patient_id: string }; message: string }> {
  return apiFetch(`/api/patients/${patientId}`, {
    method: 'DELETE',
  });
}

export async function bulkDeletePatients(patientIds: string[]): Promise<{ success: boolean; data: { deleted_count: number; requested_count: number }; message: string }> {
  return apiFetch('/api/patients/bulk-delete', {
    method: 'POST',
    body: JSON.stringify(patientIds),
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
  location?: string;
  phase?: string;
  limit?: number;
}): Promise<{ success: boolean; count: number; data: Trial[] }> {
  const qs = new URLSearchParams();
  if (params?.condition) qs.set('condition', params.condition);
  if (params?.min_age !== undefined) qs.set('min_age', String(params.min_age));
  if (params?.max_age !== undefined) qs.set('max_age', String(params.max_age));
  if (params?.location) qs.set('location', params.location);
  if (params?.phase) qs.set('phase', params.phase);
  if (params?.limit !== undefined) qs.set('limit', String(params.limit));
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return apiFetch(`/api/trials/search${query}`);
}

export async function syncTrials(params?: {
  condition?: string;
  phase?: string;
  limit?: number;
  extract_criteria?: boolean;
}): Promise<{ success: boolean; message: string; synced_from?: string; count?: number; condition_filter?: string; phase_filter?: string; extraction_stats?: unknown }> {
  const qs = new URLSearchParams();
  if (params?.condition) qs.set('condition', params.condition);
  if (params?.phase) qs.set('phase', params.phase);
  if (params?.limit !== undefined) qs.set('limit', String(params.limit));
  qs.set('extract_criteria', String(params?.extract_criteria ?? true));
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return apiFetch(`/api/trials/sync${query}`, { method: 'POST' });
}

export async function searchTrialsLive(params?: {
  condition?: string;
  location?: string;
  phase?: string;
  limit?: number;
}): Promise<{ success: boolean; count: number; source: string; data: Trial[] }> {
  const qs = new URLSearchParams();
  if (params?.condition) qs.set('condition', params.condition);
  // Default location to Maharashtra if not provided
  const location = params?.location || "Maharashtra, India";
  qs.set('location', location);
  if (params?.phase) qs.set('phase', params.phase);
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

// ── Testing ──────────────────────────────────────────────────────

export interface TestValidationResult {
  patient_id: string;
  trial_id: string;
  eligibility: 'ELIGIBLE' | 'INELIGIBLE' | 'REVIEW_NEEDED';
  fit_score: number;
}

export interface BulkValidationResponse {
  success: boolean;
  total_validations: number;
  validations: TestValidationResult[];
  summary: {
    eligible: number;
    ineligible: number;
    review_needed: number;
    average_fit_score: number;
  };
}

export interface AvailableTestData {
  available_trials: number;
  available_patients: number;
  state_filter: string;
  can_run_tests: boolean;
  data_summary: {
    trials: {
      total: number;
      sample?: { nct_id: string; title: string; phase: string };
    };
    patients: {
      total: number;
      sample?: { age: number; gender: string; conditions: string[] };
    };
  };
}

export interface TestRun {
  _id?: string;
  timestamp?: string;
  total_combinations: number;
  total_eligible: number;
  total_ineligible: number;
  total_review_needed: number;
  average_fit_score: number;
  state_filter?: string;
}

export async function runDynamicTests(params?: {
  state?: string;
  limit_trials?: number;
  limit_patients?: number;
}): Promise<{ success: boolean; saved_test_id?: string; [key: string]: unknown }> {
  const qs = new URLSearchParams();
  if (params?.state) qs.set('state', params.state);
  if (params?.limit_trials !== undefined) qs.set('limit_trials', String(params.limit_trials));
  if (params?.limit_patients !== undefined) qs.set('limit_patients', String(params.limit_patients));
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return apiFetch(`/api/test/run-dynamic-tests${query}`, { method: 'POST' });
}

export async function runPatientTests(patientId: string, params?: {
  state?: string;
  limit_trials?: number;
}): Promise<{ success: boolean; [key: string]: unknown }> {
  const qs = new URLSearchParams();
  if (params?.state) qs.set('state', params.state);
  if (params?.limit_trials !== undefined) qs.set('limit_trials', String(params.limit_trials));
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return apiFetch(`/api/test/run-patient-tests/${patientId}${query}`, { method: 'POST' });
}

export async function getAvailableTestData(state = 'Maharashtra'): Promise<AvailableTestData> {
  return apiFetch(`/api/test/available-data?state=${state}`);
}

export async function getTestHistory(limit = 10): Promise<{ success: boolean; total_test_runs: number; test_runs: TestRun[] }> {
  return apiFetch(`/api/test/test-history?limit=${limit}`);
}

export async function bulkValidateMatching(params?: {
  state?: string;
  limit?: number;
}): Promise<BulkValidationResponse> {
  const qs = new URLSearchParams();
  if (params?.state) qs.set('state', params.state);
  if (params?.limit !== undefined) qs.set('limit', String(params.limit));
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return apiFetch(`/api/test/bulk-validate${query}`, { method: 'POST' });
}

// ── Sync History & Recently Synced Trials ────────────────────────────────

export interface SyncHistory {
  _id: string;
  timestamp: string;
  condition_filter?: string;
  phase_filter?: string;
  trials_synced: number;
  new_trials: number;
  new_trial_ids?: string[];
  synced_from: string;
}

export interface RecentlysyncedTrial extends Trial {
  synced_ago_hours?: number;
  sync_timestamp?: string;
}

export async function getSyncHistory(limit = 20): Promise<{
  success: boolean;
  data: SyncHistory[];
}> {
  return apiFetch(`/api/trials/sync-history?limit=${limit}`);
}

export async function getRecentlySyncedTrials(params?: {
  hours?: number;
  limit?: number;
}): Promise<{
  success: boolean;
  data: RecentlysyncedTrial[];
  count: number;
  synced_in_last_hours: number;
  message: string;
}> {
  const qs = new URLSearchParams();
  if (params?.hours !== undefined) qs.set('hours', String(params.hours));
  if (params?.limit !== undefined) qs.set('limit', String(params.limit));
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return apiFetch(`/api/trials/recently-synced${query}`);
}

export async function exportRecentlySyncedTrialsCSV(params?: {
  hours?: number;
  limit?: number;
}): Promise<void> {
  // Fetch recently synced trials
  const response = await getRecentlySyncedTrials(params);
  const trials = response.data || [];

  if (trials.length === 0) {
    alert('No recently synced trials to export');
    return;
  }

  // Prepare CSV headers
  const headers = [
    'NCT ID',
    'Title',
    'Phase',
    'Status',
    'Conditions',
    'Sponsor',
    'Enrollment',
    'Synced Hours Ago',
    'Location',
  ];

  // Prepare CSV rows
  const rows = trials.map((trial) => [
    trial.nct_id || '',
    trial.title || '',
    trial.phase || '',
    trial.status || '',
    (trial.conditions || []).join('; '),
    trial.sponsor || '',
    trial.enrollment || '',
    trial.synced_ago_hours || '',
    trial.locations ? trial.locations.map((l: any) => `${l.city}, ${l.state}`).join('; ') : '',
  ]);

  // Create CSV content
  const csvContent = [
    headers.map((h) => `"${h}"`).join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `recently-synced-trials-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
