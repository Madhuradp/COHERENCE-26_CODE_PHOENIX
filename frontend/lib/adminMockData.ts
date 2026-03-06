// Admin Mock Data — patient data anonymized as PAT_XXXX

export const adminStats = [
  { label: "Total Users", value: "1,284", change: "+34", trend: "up" as const, subtitle: "Last 30 days" },
  { label: "Active Trials", value: "47", change: "+5", trend: "up" as const, subtitle: "Across 12 hospitals" },
  { label: "Pending Reviews", value: "18", change: "-3", trend: "down" as const, subtitle: "Ethics approvals" },
  { label: "Compliance Score", value: "97.4%", change: "+0.8%", trend: "up" as const, subtitle: "CDSCO standard" },
];

export const auditLogs = [
  { id: "EVT_9001", timestamp: "2025-01-15 14:32:10", user: "dr.patel@aiims.edu", role: "Doctor", action: "PATIENT_MATCH", resource: "PAT_1042", status: "success" as const, ip: "10.0.1.45" },
  { id: "EVT_9002", timestamp: "2025-01-15 14:28:45", user: "admin@trailmatch.io", role: "Admin", action: "USER_CREATED", resource: "dr.rajan@fortis.in", status: "success" as const, ip: "10.0.0.1" },
  { id: "EVT_9003", timestamp: "2025-01-15 14:20:00", user: "researcher@cipla.com", role: "Researcher", action: "TRIAL_EXPORTED", resource: "TRL_T101", status: "success" as const, ip: "192.168.2.10" },
  { id: "EVT_9004", timestamp: "2025-01-15 14:15:33", user: "auditor@pharma.in", role: "Auditor", action: "AUDIT_LOG_ACCESS", resource: "LOG_BATCH_44", status: "success" as const, ip: "10.0.2.88" },
  { id: "EVT_9005", timestamp: "2025-01-15 14:10:20", user: "unknown@ext.net", role: "—", action: "LOGIN_ATTEMPT", resource: "auth/login", status: "failed" as const, ip: "203.45.11.9" },
  { id: "EVT_9006", timestamp: "2025-01-15 14:05:01", user: "dr.chen@aiims.edu", role: "Doctor", action: "ELIGIBILITY_CHECKED", resource: "PAT_3091", status: "success" as const, ip: "10.0.1.47" },
  { id: "EVT_9007", timestamp: "2025-01-15 13:58:44", user: "pharma@sunpharma.com", role: "Pharma", action: "TRIAL_UPDATED", resource: "TRL_T202", status: "success" as const, ip: "172.16.3.5" },
  { id: "EVT_9008", timestamp: "2025-01-15 13:50:12", user: "admin@trailmatch.io", role: "Admin", action: "USER_ROLE_CHANGED", resource: "dr.kapoor@care.in", status: "warning" as const, ip: "10.0.0.1" },
  { id: "EVT_9009", timestamp: "2025-01-15 13:42:09", user: "researcher@drreddy.com", role: "Researcher", action: "BULK_EXPORT", resource: "RESULTS_BATCH_12", status: "warning" as const, ip: "192.168.5.20" },
  { id: "EVT_9010", timestamp: "2025-01-15 13:35:55", user: "ethics@irb.gov.in", role: "Ethics", action: "TRIAL_APPROVED", resource: "TRL_T310", status: "success" as const, ip: "10.5.0.3" },
];

export const fairnessData = {
  genderDistribution: [
    { name: "Male", value: 48, fill: "#7C3AED" },
    { name: "Female", value: 44, fill: "#60A5FA" },
    { name: "Other", value: 8, fill: "#FB923C" },
  ],
  ageDistribution: [
    { range: "18–30", count: 142, fill: "#7C3AED" },
    { range: "31–45", count: 278, fill: "#8B5CF6" },
    { range: "46–60", count: 341, fill: "#60A5FA" },
    { range: "61–75", count: 213, fill: "#FB923C" },
    { range: "75+", count: 88, fill: "#F87171" },
  ],
  regionDistribution: [
    { region: "North India", enrolled: 312, eligible: 380 },
    { region: "South India", enrolled: 287, eligible: 310 },
    { region: "West India", enrolled: 241, eligible: 290 },
    { region: "East India", enrolled: 163, eligible: 220 },
    { region: "Central India", enrolled: 95, eligible: 148 },
  ],
  biasAlerts: [
    { id: 1, trial: "TRL_T101", metric: "Age Bias", severity: "high" as const, description: "76% of enrolled patients in 31–45 bracket; underrepresentation of 61+ age group." },
    { id: 2, trial: "TRL_T202", metric: "Regional Bias", severity: "medium" as const, description: "East India enrollment is 26% below eligible pool ratio." },
    { id: 3, trial: "TRL_T310", metric: "Gender Parity", severity: "low" as const, description: "Female enrollment at 41%, slightly below 44% eligible ratio." },
  ],
};

export const systemMetrics = {
  uptime: "99.97%",
  p95Latency: "182ms",
  errorRate: "0.12%",
  activeUsers: 84,
  cpuUsage: 38,
  memoryUsage: 62,
  diskUsage: 51,
  apiCalls: 14820,
  services: [
    { name: "API Gateway", status: "healthy" as const, latency: "42ms", uptime: "99.99%" },
    { name: "Matching Engine", status: "healthy" as const, latency: "310ms", uptime: "99.95%" },
    { name: "Auth Service", status: "healthy" as const, latency: "28ms", uptime: "100%" },
    { name: "Database (Primary)", status: "healthy" as const, latency: "12ms", uptime: "100%" },
    { name: "Database (Replica)", status: "degraded" as const, latency: "88ms", uptime: "97.4%" },
    { name: "Notification Service", status: "healthy" as const, latency: "55ms", uptime: "99.80%" },
    { name: "Storage (S3)", status: "healthy" as const, latency: "95ms", uptime: "99.99%" },
    { name: "Analytics Pipeline", status: "healthy" as const, latency: "240ms", uptime: "99.88%" },
  ],
  uptimeTrend: [
    { hour: "00:00", uptime: 100 },
    { hour: "02:00", uptime: 100 },
    { hour: "04:00", uptime: 99.9 },
    { hour: "06:00", uptime: 100 },
    { hour: "08:00", uptime: 99.8 },
    { hour: "10:00", uptime: 100 },
    { hour: "12:00", uptime: 100 },
    { hour: "14:00", uptime: 99.97 },
    { hour: "16:00", uptime: 100 },
    { hour: "18:00", uptime: 99.9 },
    { hour: "20:00", uptime: 100 },
    { hour: "22:00", uptime: 100 },
  ],
};

export const adminUsers = [
  { id: "USR_001", name: "Dr. Sarah Chen", email: "sarah@aiims.edu", role: "Doctor", status: "active" as const, hospital: "AIIMS Delhi", joined: "2024-03-12", lastLogin: "2 hrs ago" },
  { id: "USR_002", name: "Dr. Rahul Patel", email: "rahul@fortis.in", role: "Doctor", status: "active" as const, hospital: "Fortis Mumbai", joined: "2024-04-01", lastLogin: "Today" },
  { id: "USR_003", name: "Meera Iyer", email: "meera@cipla.com", role: "Researcher", status: "active" as const, hospital: "Cipla Research", joined: "2024-05-15", lastLogin: "Yesterday" },
  { id: "USR_004", name: "Arjun Kapoor", email: "arjun@sunpharma.com", role: "Pharma", status: "suspended" as const, hospital: "Sun Pharma", joined: "2024-06-20", lastLogin: "8 days ago" },
  { id: "USR_005", name: "Dr. Ananya Reddy", email: "ananya@apollo.com", role: "Doctor", status: "active" as const, hospital: "Apollo Hyderabad", joined: "2024-07-08", lastLogin: "3 hrs ago" },
  { id: "USR_006", name: "Vikram Sharma", email: "vikram@drreddy.com", role: "Researcher", status: "pending" as const, hospital: "Dr. Reddy's", joined: "2025-01-10", lastLogin: "Never" },
  { id: "USR_007", name: "Priya Nair", email: "priya@irb.gov.in", role: "Ethics", status: "active" as const, hospital: "IRB National", joined: "2024-02-28", lastLogin: "1 day ago" },
  { id: "USR_008", name: "Sanjay Gupta", email: "sanjay@apollo.com", role: "Doctor", status: "active" as const, hospital: "Apollo Delhi", joined: "2024-08-14", lastLogin: "4 hrs ago" },
];

export const adminTrials = [
  { id: "TRL_T101", title: "Diabetes Drug Phase III", sponsor: "Sun Pharma", phase: "Phase III", status: "active" as const, enrolled: 142, target: 200, sites: 8, ethics: "approved" as const, startDate: "2024-06-01" },
  { id: "TRL_T202", title: "CAR-T Cell Therapy for B-ALL", sponsor: "Cipla Oncology", phase: "Phase II", status: "active" as const, enrolled: 28, target: 60, sites: 3, ethics: "approved" as const, startDate: "2024-09-15" },
  { id: "TRL_T310", title: "Hypertension – ARB Combo Study", sponsor: "Dr. Reddy's", phase: "Phase II", status: "pending" as const, enrolled: 0, target: 150, sites: 6, ethics: "pending" as const, startDate: "2025-02-01" },
  { id: "TRL_T405", title: "COPD Long-Acting Bronchodilator", sponsor: "Lupin Pharma", phase: "Phase III", status: "active" as const, enrolled: 87, target: 180, sites: 5, ethics: "approved" as const, startDate: "2024-07-20" },
  { id: "TRL_T501", title: "mRNA Vaccine – Tuberculosis", sponsor: "Serum Institute", phase: "Phase I", status: "paused" as const, enrolled: 12, target: 40, sites: 2, ethics: "approved" as const, startDate: "2024-11-01" },
  { id: "TRL_T612", title: "Alzheimer's Biomarker Study", sponsor: "Biocon", phase: "Observational", status: "active" as const, enrolled: 203, target: 300, sites: 10, ethics: "approved" as const, startDate: "2024-04-10" },
];

export const adminActivityFeed = [
  { id: 1, action: "Trial TRL_T310 submitted for ethics review", time: "5 min ago", type: "trial" as const },
  { id: 2, action: "User USR_006 registration pending approval", time: "18 min ago", type: "user" as const },
  { id: 3, action: "Failed login attempt from 203.45.11.9", time: "35 min ago", type: "security" as const },
  { id: 4, action: "Bulk export flagged — researcher@drreddy.com", time: "1h ago", type: "security" as const },
  { id: 5, action: "Database replica latency spike detected", time: "2h ago", type: "system" as const },
  { id: 6, action: "Trial TRL_T612 reached 67% enrollment target", time: "3h ago", type: "trial" as const },
];
