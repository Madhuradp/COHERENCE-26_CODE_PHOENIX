"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Users, FlaskConical, Activity, Zap, ShieldCheck, AlertTriangle, CheckCircle2,
} from "lucide-react";
import { StatCard } from "@/components/ui/Card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { getAnalyticsSummary, type AnalyticsSummary } from "@/lib/api";
import { useAuth } from "@/lib/authContext";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAnalyticsSummary()
      .then((res) => setSummary(res.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const matchingHealthData = summary
    ? [
        { label: "Eligible", count: summary.matching_health.eligible_count, color: "#22C55E" },
        { label: "Review Needed", count: summary.matching_health.review_needed, color: "#F59E0B" },
        { label: "Ineligible", count: summary.matching_health.ineligible_count, color: "#EF4444" },
      ]
    : [];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-6"
    >
      {/* Page header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-text-primary">Dashboard Overview</h1>
        <p className="text-sm text-text-muted mt-0.5">
          Welcome back, {user?.full_name || user?.researcher_profile?.full_name || user?.pharma_profile?.company_name || "Clinician"}. Here&apos;s what&apos;s happening today.
        </p>
      </motion.div>

      {loading && (
        <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-surface-muted animate-pulse" />
          ))}
        </motion.div>
      )}

      {error && (
        <motion.div variants={itemVariants} className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
          Failed to load analytics: {error}
        </motion.div>
      )}

      {summary && (
        <>
          {/* Stat cards */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Patients"
              value={summary.counts.patients}
              icon={<Users size={20} className="text-brand-purple" />}
              iconBg="bg-brand-purple-light"
            />
            <StatCard
              title="Total Trials"
              value={summary.counts.trials}
              icon={<FlaskConical size={20} className="text-blue-500" />}
              iconBg="bg-brand-blue-light"
            />
            <StatCard
              title="Matches Generated"
              value={summary.counts.matches}
              icon={<Zap size={20} className="text-teal-500" />}
              iconBg="bg-brand-teal-light"
            />
            <StatCard
              title="PII Protected"
              value={summary.privacy.entities_protected}
              icon={<ShieldCheck size={20} className="text-green-500" />}
              iconBg="bg-green-50"
              subtitle="Entities redacted"
            />
          </motion.div>

          {/* Bottom row: matching health chart + privacy stats */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Matching Health Chart */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-card p-6">
              <h3 className="text-sm font-semibold text-text-primary mb-1">Matching Health</h3>
              <p className="text-xs text-text-muted mb-4">Breakdown of all match results by eligibility status</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={matchingHealthData} margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", boxShadow: "0 4px 16px rgba(0,0,0,0.06)", fontSize: 12 }}
                    cursor={{ fill: "#F8FAFC" }}
                  />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]} animationDuration={700}>
                    {matchingHealthData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Privacy & Audit Stats */}
            <div className="bg-white rounded-2xl shadow-card p-6 flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-semibold text-text-primary mb-1">Privacy & Compliance</h3>
                <p className="text-xs text-text-muted">Data protection overview</p>
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-green-50">
                  <CheckCircle2 size={18} className="text-green-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-text-primary">{summary.privacy.entities_protected} entities protected</p>
                    <p className="text-xs text-text-muted">PII redacted before storage</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-brand-blue-light">
                  <Activity size={18} className="text-brand-blue flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-text-primary">{summary.privacy.audit_logs_count} audit logs</p>
                    <p className="text-xs text-text-muted">Full access trail maintained</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-brand-orange-light">
                  <AlertTriangle size={18} className="text-orange-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-text-primary">{summary.matching_health.review_needed} under review</p>
                    <p className="text-xs text-text-muted">Matches needing manual review</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
