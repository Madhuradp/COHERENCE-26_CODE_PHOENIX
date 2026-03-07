"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ScrollText, Search, Download, Filter } from "lucide-react";
import { Card, StatCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Table";
import { getAuditLogs, getUserActivity, type AuditLog } from "@/lib/api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from "recharts";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

function formatTimestamp(ts?: string) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

function getEventLabel(log: AuditLog): string {
  return log.action || log.event_type || (log.details?.action as string) || "EVENT";
}

function getUserLabel(log: AuditLog): string {
  return (
    log.user_email ||
    log.action_by ||
    (log.details?.user_email as string) ||
    (log.details?.user as string) ||
    "System"
  );
}

function getActionBadgeColor(label: string) {
  if (label.includes("PII") || label.includes("REDACT")) return "red";
  if (label.includes("DELETE") || label.includes("FAIL")) return "red";
  if (label.includes("UPLOAD") || label.includes("CREAT") || label.includes("SUCCESS")) return "green";
  if (label.includes("LOGIN") || label.includes("AUTH")) return "blue";
  if (label.includes("MATCH") || label.includes("TRIAL")) return "purple";
  return "gray";
}

function downloadCSV(logs: AuditLog[]) {
  const rows = [
    ["Event ID", "Timestamp", "User", "Event Type", "Action", "Resource"],
    ...logs.map((l) => [
      l._id,
      l.timestamp || "",
      getUserLabel(l),
      l.event_type || "",
      l.action || "",
      [l.document_type, l.document_id].filter(Boolean).join(" / "),
    ]),
  ];
  const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
  link.click();
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("All");

  useEffect(() => {
    Promise.all([getAuditLogs(), getUserActivity(200)])
      .then(([auditRes, activityRes]) => {
        const combined = [...(auditRes.data || []), ...(activityRes.data || [])];
        const seen = new Set<string>();
        const unique = combined.filter((l) => {
          const key = l._id || `${l.timestamp}-${l.action}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setLogs(unique.sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || "")));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Unique event types for filter
  const allEventTypes = useMemo(() => {
    const types = Array.from(new Set(logs.map((l) => l.event_type || l.action || "").filter(Boolean)));
    return ["All", ...types];
  }, [logs]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return logs.filter((log) => {
      const matchSearch =
        getUserLabel(log).toLowerCase().includes(s) ||
        (log.action || "").toLowerCase().includes(s) ||
        (log.event_type || "").toLowerCase().includes(s) ||
        (log.document_type || "").toLowerCase().includes(s) ||
        (log._id || "").toLowerCase().includes(s);
      const matchEvent =
        eventFilter === "All" ||
        log.event_type === eventFilter ||
        log.action === eventFilter;
      return matchSearch && matchEvent;
    });
  }, [logs, search, eventFilter]);

  // Event type distribution chart data
  const eventTypeChart = useMemo(() => {
    const counts: Record<string, number> = {};
    logs.forEach((l) => {
      const key = l.event_type || l.action || "OTHER";
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name: name.length > 16 ? name.slice(0, 14) + "…" : name, count }));
  }, [logs]);

  // Timeline chart: group events by hour (last 24 events bucketed)
  const timelineChart = useMemo(() => {
    if (logs.length === 0) return [];
    const now = new Date();
    const buckets: Record<string, number> = {};
    for (let h = 23; h >= 0; h--) {
      const d = new Date(now);
      d.setHours(now.getHours() - h, 0, 0, 0);
      const label = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      buckets[label] = 0;
    }
    logs.forEach((l) => {
      if (!l.timestamp) return;
      const d = new Date(l.timestamp);
      const diffH = Math.floor((now.getTime() - d.getTime()) / 3600000);
      if (diffH < 0 || diffH >= 24) return;
      const bucket = new Date(d);
      bucket.setMinutes(0, 0, 0);
      const label = bucket.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      if (label in buckets) buckets[label]++;
    });
    return Object.entries(buckets).map(([hour, events]) => ({ hour, events }));
  }, [logs]);

  const piiCount = logs.filter(
    (l) => (l.event_type || "").includes("PII") || (l.action || "").includes("PII") || (l.action || "").includes("REDACT")
  ).length;
  const failCount = logs.filter(
    (l) => (l.event_type || "").includes("FAIL") || (l.action || "").includes("FAIL")
  ).length;

  return (
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
            <ScrollText size={22} className="text-brand-purple" /> Audit Logs
          </h1>
          <p className="text-sm text-text-muted mt-0.5">Tamper-evident log of all platform actions</p>
        </div>
        <Button
          variant="secondary"
          size="md"
          leftIcon={<Download size={14} />}
          onClick={() => downloadCSV(filtered)}
        >
          Export CSV
        </Button>
      </motion.div>

      {error && (
        <motion.div variants={itemVariants} className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
          {error}
        </motion.div>
      )}

      {/* Stat cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Events"
          value={loading ? "—" : String(logs.length)}
          icon={<ScrollText size={18} className="text-brand-purple" />}
          iconBg="bg-brand-purple-light"
          subtitle="All time"
        />
        <StatCard
          title="Filtered Events"
          value={loading ? "—" : String(filtered.length)}
          icon={<Filter size={18} className="text-blue-500" />}
          iconBg="bg-blue-50"
          subtitle="Current view"
        />
        <StatCard
          title="PII Events"
          value={loading ? "—" : String(piiCount)}
          icon={<ScrollText size={18} className="text-emerald-500" />}
          iconBg="bg-emerald-50"
          subtitle="Redaction actions"
        />
        <StatCard
          title="Failed Actions"
          value={loading ? "—" : String(failCount)}
          icon={<ScrollText size={18} className="text-red-500" />}
          iconBg="bg-red-50"
          subtitle="Requires review"
        />
      </motion.div>

      {/* Charts */}
      {!loading && logs.length > 0 && (
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Event type distribution */}
          <Card>
            <h2 className="font-semibold text-text-primary mb-4">Event Type Distribution</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={eventTypeChart} margin={{ top: 4, right: 4, left: -20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" stroke="#CBD5E1" interval={0} />
                <YAxis tick={{ fontSize: 10 }} stroke="#CBD5E1" allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12 }}
                  formatter={(v: number) => [v, "Events"]}
                />
                <Bar dataKey="count" fill="#7C3AED" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Activity timeline */}
          <Card>
            <h2 className="font-semibold text-text-primary mb-4">Activity — Last 24 Hours</h2>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={timelineChart} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="auditGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="hour" tick={{ fontSize: 9 }} stroke="#CBD5E1" interval={3} />
                <YAxis tick={{ fontSize: 10 }} stroke="#CBD5E1" allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12 }}
                  formatter={(v: number) => [v, "Events"]}
                />
                <Area type="monotone" dataKey="events" stroke="#7C3AED" strokeWidth={2} fill="url(#auditGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>
      )}

      {/* Filters */}
      <motion.div variants={itemVariants}>
        <Card>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Search by user, action, event type..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-9"
              />
            </div>
            <select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              className="input-field w-full sm:w-52"
            >
              {allEventTypes.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <p className="text-xs text-text-muted mt-3">
            {loading ? "Loading..." : `${filtered.length} of ${logs.length} events`}
          </p>
        </Card>
      </motion.div>

      {/* Logs table */}
      <motion.div variants={itemVariants}>
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border bg-surface-muted/40">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted">Event ID</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted">Timestamp</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted">User</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted">Event Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted">Action</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted">Resource</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={6} className="px-4 py-3">
                        <div className="h-5 rounded-lg bg-surface-muted animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-text-muted">
                      No events match your filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((log, idx) => {
                    const eventLabel = getEventLabel(log);
                    const userLabel = getUserLabel(log);
                    return (
                      <tr
                        key={log._id || idx}
                        className="border-b border-surface-border last:border-0 hover:bg-surface-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono text-xs text-text-muted">
                          {log._id ? log._id.slice(0, 12) + "…" : `EVT_${idx + 1}`}
                        </td>
                        <td className="px-4 py-3 text-xs text-text-muted whitespace-nowrap">
                          {formatTimestamp(log.timestamp)}
                        </td>
                        <td className="px-4 py-3 text-xs text-text-primary font-medium">
                          {userLabel}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <Badge variant={getActionBadgeColor(log.event_type || "") as any}>
                            {log.event_type || "—"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <Badge variant={getActionBadgeColor(eventLabel) as any}>
                            {eventLabel}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-brand-purple">
                          {[log.document_type, log.document_id].filter(Boolean).join(" / ") || "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
