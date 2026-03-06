"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ScrollText, Search, Download } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getAuditLogs, getUserActivity, type AuditLog } from "@/lib/api";

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

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([getAuditLogs(), getUserActivity(100)])
      .then(([auditRes, activityRes]) => {
        const combined = [...(auditRes.data || []), ...(activityRes.data || [])];
        // Deduplicate by _id
        const seen = new Set<string>();
        const unique = combined.filter((l) => {
          if (seen.has(l._id)) return false;
          seen.add(l._id);
          return true;
        });
        setLogs(unique.sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || "")));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = logs.filter((log) => {
    const s = search.toLowerCase();
    return (
      (log.user_email || "").toLowerCase().includes(s) ||
      (log.action || "").toLowerCase().includes(s) ||
      (log.event_type || "").toLowerCase().includes(s) ||
      (log.document_type || "").toLowerCase().includes(s) ||
      (log._id || "").toLowerCase().includes(s)
    );
  });

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-6"
    >
      <motion.div variants={itemVariants} className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <ScrollText size={22} className="text-brand-purple" /> Audit Logs
          </h1>
          <p className="text-sm text-text-muted mt-0.5">Tamper-evident log of all platform actions</p>
        </div>
        <Button variant="secondary" size="md" leftIcon={<Download size={14} />}>
          Export CSV
        </Button>
      </motion.div>

      {error && (
        <motion.div variants={itemVariants} className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
          {error}
        </motion.div>
      )}

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
          </div>
          <p className="text-xs text-text-muted mt-3">{loading ? "Loading..." : `${filtered.length} events`}</p>
        </Card>
      </motion.div>

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
                  [...Array(5)].map((_, i) => (
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
                  filtered.map((log) => (
                    <tr key={log._id} className="border-b border-surface-border last:border-0 hover:bg-surface-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-text-muted">{log._id.slice(0, 12)}...</td>
                      <td className="px-4 py-3 text-xs text-text-muted whitespace-nowrap">{formatTimestamp(log.timestamp)}</td>
                      <td className="px-4 py-3 text-xs text-text-primary">{log.user_email || log.action_by || "—"}</td>
                      <td className="px-4 py-3 text-xs text-text-secondary">{log.event_type || "—"}</td>
                      <td className="px-4 py-3 font-mono text-xs text-text-primary">{log.action || "—"}</td>
                      <td className="px-4 py-3 font-mono text-xs text-brand-purple">
                        {[log.document_type, log.document_id].filter(Boolean).join(" / ") || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
