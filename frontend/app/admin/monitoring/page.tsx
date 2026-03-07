"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import {
  Activity, CheckCircle, AlertTriangle, XCircle, Zap, RefreshCw,
  Database, Users, GitMerge, ShieldCheck, Clock,
} from "lucide-react";
import { Card, StatCard } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from "recharts";

const BASE_URL = "http://localhost:8000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

// Ping an endpoint and return { ok, latencyMs }
async function ping(path: string): Promise<{ ok: boolean; latencyMs: number; statusCode?: number }> {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const start = performance.now();
  try {
    const res = await fetch(`${BASE_URL}${path}`, { headers });
    const latencyMs = Math.round(performance.now() - start);
    return { ok: res.ok, latencyMs, statusCode: res.status };
  } catch {
    const latencyMs = Math.round(performance.now() - start);
    return { ok: false, latencyMs };
  }
}

const ENDPOINTS = [
  { name: "Auth Service", path: "/api/auth/me", description: "JWT validation" },
  { name: "Patient API", path: "/api/patients/", description: "Patient records" },
  { name: "Trials API", path: "/api/trials/search", description: "Trial search" },
  { name: "Analytics", path: "/api/analytics/summary", description: "Summary stats" },
  { name: "Audit Logs", path: "/api/patients/audit-logs", description: "Audit trail" },
  { name: "Fairness Stats", path: "/api/patients/fairness-stats", description: "Bias metrics" },
  { name: "User List", path: "/api/auth/clinicians/list", description: "User registry" },
  { name: "ML Model Info", path: "/api/analytics/ml-model-info", description: "Model status" },
];

interface ServiceStatus {
  name: string;
  description: string;
  ok: boolean;
  latencyMs: number;
  statusCode?: number;
  status: "healthy" | "slow" | "down";
}

interface DbCounts {
  patients: number;
  trials: number;
  matches: number;
  audit_logs: number;
  pii_protected: number;
  users: number;
}

interface LatencyPoint {
  time: string;
  avgMs: number;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

function StatusDot({ status }: { status: "healthy" | "slow" | "down" }) {
  const colors = {
    healthy: { text: "text-emerald-600", dot: "bg-emerald-400" },
    slow: { text: "text-orange-500", dot: "bg-orange-400" },
    down: { text: "text-red-500", dot: "bg-red-400" },
  };
  const c = colors[status];
  const label = status === "healthy" ? "Healthy" : status === "slow" ? "Slow" : "Down";
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${c.text}`}>
      <span className={`w-2 h-2 rounded-full animate-pulse ${c.dot}`} />
      {label}
    </span>
  );
}

export default function SystemMonitoringPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [dbCounts, setDbCounts] = useState<DbCounts>({
    patients: 0, trials: 0, matches: 0, audit_logs: 0, pii_protected: 0, users: 0,
  });
  const [latencyHistory, setLatencyHistory] = useState<LatencyPoint[]>([]);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAll = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);

    // Ping all endpoints in parallel and measure real latency
    const results = await Promise.all(
      ENDPOINTS.map(async (ep) => {
        const { ok, latencyMs, statusCode } = await ping(ep.path);
        const status: "healthy" | "slow" | "down" = !ok
          ? "down"
          : latencyMs > 800
          ? "slow"
          : "healthy";
        return {
          name: ep.name,
          description: ep.description,
          ok,
          latencyMs,
          statusCode,
          status,
        } satisfies ServiceStatus;
      })
    );
    setServices(results);

    // Fetch real analytics for DB counts
    try {
      const token = getToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const [analyticsRes, auditRes, usersRes] = await Promise.allSettled([
        fetch(`${BASE_URL}/api/analytics/summary`, { headers }).then((r) => r.json()),
        fetch(`${BASE_URL}/api/patients/audit-logs`, { headers }).then((r) => r.json()),
        fetch(`${BASE_URL}/api/auth/clinicians/list`, { headers }).then((r) => r.json()),
      ]);

      const analytics = analyticsRes.status === "fulfilled" ? analyticsRes.value?.data : null;
      const audit = auditRes.status === "fulfilled" ? auditRes.value?.data || [] : [];
      const users = usersRes.status === "fulfilled" ? usersRes.value?.data || [] : [];

      setDbCounts({
        patients: analytics?.counts?.patients ?? 0,
        trials: analytics?.counts?.trials ?? 0,
        matches: analytics?.counts?.matches ?? 0,
        audit_logs: analytics?.privacy?.audit_logs_count ?? audit.length,
        pii_protected: analytics?.privacy?.entities_protected ?? 0,
        users: users.length,
      });
    } catch {
      // counts stay at previous values
    }

    // Record avg latency for the history chart
    const healthy = results.filter((r) => r.ok);
    const avgMs = healthy.length
      ? Math.round(healthy.reduce((s, r) => s + r.latencyMs, 0) / healthy.length)
      : 0;
    const now = new Date();
    const timeLabel = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setLatencyHistory((prev) => [...prev.slice(-19), { time: timeLabel, avgMs }]);

    setLastUpdated(now);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchAll();
    intervalRef.current = setInterval(() => fetchAll(true), 30000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchAll]);

  const healthyCount = services.filter((s) => s.status === "healthy").length;
  const slowCount = services.filter((s) => s.status === "slow").length;
  const downCount = services.filter((s) => s.status === "down").length;
  const avgLatency = services.filter((s) => s.ok).length
    ? Math.round(services.filter((s) => s.ok).reduce((sum, s) => sum + s.latencyMs, 0) / services.filter((s) => s.ok).length)
    : 0;
  const overallStatus: "healthy" | "slow" | "down" =
    downCount > services.length / 2 ? "down" : slowCount > 0 || downCount > 0 ? "slow" : "healthy";

  const statusColors = {
    healthy: "bg-emerald-50 border-emerald-200 text-emerald-700",
    slow: "bg-orange-50 border-orange-200 text-orange-700",
    down: "bg-red-50 border-red-200 text-red-700",
  };

  // Latency bar chart for current services
  const latencyChartData = services
    .sort((a, b) => b.latencyMs - a.latencyMs)
    .map((s) => ({ name: s.name.replace(" API", "").replace(" Service", ""), ms: s.latencyMs, ok: s.ok }));

  return (
    <>
      <ProgressBar isLoading={loading} label="Pinging backend services..." />
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-6"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
              <Activity size={22} className="text-brand-purple" /> System Monitoring
            </h1>
            <p className="text-sm text-text-muted mt-0.5">
              Live endpoint health and real database metrics — localhost:8000
            </p>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <p className="text-xs text-text-muted flex items-center gap-1">
                <Clock size={12} /> {lastUpdated.toLocaleTimeString()}
              </p>
            )}
            <button
              onClick={() => fetchAll(true)}
              disabled={refreshing || loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-muted hover:bg-surface-border transition-colors text-xs font-medium text-text-secondary disabled:opacity-50"
            >
              <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </motion.div>

        {/* Overall status banner */}
        {!loading && (
          <motion.div variants={itemVariants}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${statusColors[overallStatus]}`}
          >
            {overallStatus === "healthy" && <CheckCircle size={16} />}
            {overallStatus === "slow" && <AlertTriangle size={16} />}
            {overallStatus === "down" && <XCircle size={16} />}
            {overallStatus === "healthy"
              ? `All ${healthyCount} services are healthy`
              : overallStatus === "slow"
              ? `${slowCount} service(s) slow, ${downCount} down — ${healthyCount} healthy`
              : `${downCount} service(s) down — backend may be offline`}
          </motion.div>
        )}

        {/* Stat cards */}
        {!loading && (
          <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Services Up"
              value={`${healthyCount}/${services.length}`}
              icon={<CheckCircle size={18} className="text-emerald-500" />}
              iconBg="bg-emerald-100"
              subtitle={`${downCount} down, ${slowCount} slow`}
            />
            <StatCard
              title="Avg Latency"
              value={avgLatency ? `${avgLatency}ms` : "—"}
              icon={<Zap size={18} className="text-blue-500" />}
              iconBg="bg-blue-100"
              subtitle="Across live endpoints"
            />
            <StatCard
              title="Audit Entries"
              value={String(dbCounts.audit_logs)}
              icon={<ShieldCheck size={18} className="text-brand-purple" />}
              iconBg="bg-brand-purple-light"
              subtitle="Tamper-evident logs"
            />
            <StatCard
              title="PII Protected"
              value={String(dbCounts.pii_protected)}
              icon={<ShieldCheck size={18} className="text-emerald-500" />}
              iconBg="bg-emerald-50"
              subtitle="Entities redacted"
            />
          </motion.div>
        )}

        {/* Database counts (real) */}
        {!loading && (
          <motion.div variants={itemVariants}>
            <Card>
              <h2 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
                <Database size={16} className="text-brand-purple" /> Database — Live Counts
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { label: "Patients", value: dbCounts.patients, icon: <Users size={15} className="text-blue-500" /> },
                  { label: "Trials", value: dbCounts.trials, icon: <GitMerge size={15} className="text-brand-purple" /> },
                  { label: "Matches", value: dbCounts.matches, icon: <Activity size={15} className="text-emerald-500" /> },
                  { label: "Audit Logs", value: dbCounts.audit_logs, icon: <ShieldCheck size={15} className="text-orange-500" /> },
                  { label: "PII Redacted", value: dbCounts.pii_protected, icon: <ShieldCheck size={15} className="text-red-400" /> },
                  { label: "Users", value: dbCounts.users, icon: <Users size={15} className="text-purple-500" /> },
                ].map((m) => (
                  <div key={m.label} className="p-3 rounded-xl bg-surface-muted text-center">
                    <div className="flex justify-center mb-1">{m.icon}</div>
                    <p className="text-xl font-bold text-text-primary">{m.value.toLocaleString()}</p>
                    <p className="text-xs text-text-muted mt-0.5">{m.label}</p>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Charts row */}
        {!loading && services.length > 0 && (
          <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Per-endpoint latency bar chart */}
            <Card>
              <h2 className="font-semibold text-text-primary mb-1">Endpoint Response Times</h2>
              <p className="text-xs text-text-muted mb-4">Measured this refresh — actual ms from browser</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={latencyChartData} layout="vertical" margin={{ top: 4, right: 40, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} stroke="#CBD5E1" unit="ms" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} stroke="#CBD5E1" width={80} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12 }}
                    formatter={(v: number, _name, props) => [
                      `${v}ms`,
                      props.payload.ok ? "Latency" : "Failed",
                    ]}
                  />
                  <Bar
                    dataKey="ms"
                    radius={[0, 4, 4, 0]}
                    fill="#7C3AED"
                    label={{ position: "right", fontSize: 10, fill: "#94A3B8", formatter: (v: number) => `${v}ms` }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Avg latency over time (each refresh) */}
            <Card>
              <h2 className="font-semibold text-text-primary mb-1">Avg Latency Over Time</h2>
              <p className="text-xs text-text-muted mb-4">Rolling window — updates every 30 s</p>
              {latencyHistory.length < 2 ? (
                <div className="h-52 flex items-center justify-center text-xs text-text-muted">
                  Collecting data — refreshes build the chart
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={latencyHistory} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="time" tick={{ fontSize: 9 }} stroke="#CBD5E1" />
                    <YAxis tick={{ fontSize: 10 }} stroke="#CBD5E1" unit="ms" />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12 }}
                      formatter={(v: number) => [`${v}ms`, "Avg latency"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="avgMs"
                      stroke="#7C3AED"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#7C3AED" }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Card>
          </motion.div>
        )}

        {/* Service health table */}
        {!loading && (
          <motion.div variants={itemVariants}>
            <Card className="p-0 overflow-hidden">
              <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between">
                <h2 className="font-semibold text-text-primary">Endpoint Health</h2>
                <div className="flex items-center gap-3 text-xs text-text-muted">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Healthy (&lt;800ms)</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400" /> Slow (&gt;800ms)</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> Down</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-border bg-surface-muted/40">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted">Endpoint</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted">Route</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted">Status</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted">Latency</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted">HTTP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ENDPOINTS.map((ep, i) => {
                      const svc = services[i];
                      if (!svc) return null;
                      return (
                        <tr
                          key={ep.name}
                          className="border-b border-surface-border last:border-0 hover:bg-surface-muted/30 transition-colors"
                        >
                          <td className="px-5 py-3.5">
                            <p className="text-sm font-medium text-text-primary">{ep.name}</p>
                            <p className="text-xs text-text-muted">{ep.description}</p>
                          </td>
                          <td className="px-5 py-3.5 font-mono text-xs text-text-muted">{ep.path}</td>
                          <td className="px-5 py-3.5">
                            <StatusDot status={svc.status} />
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`font-mono text-xs font-semibold ${
                              !svc.ok ? "text-red-500" :
                              svc.latencyMs > 800 ? "text-orange-500" :
                              svc.latencyMs > 300 ? "text-amber-600" : "text-emerald-600"
                            }`}>
                              {svc.ok ? `${svc.latencyMs}ms` : "—"}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`font-mono text-xs ${
                              svc.statusCode && svc.statusCode < 400 ? "text-emerald-600" :
                              svc.statusCode ? "text-red-500" : "text-text-muted"
                            }`}>
                              {svc.statusCode ?? "—"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </>
  );
}
