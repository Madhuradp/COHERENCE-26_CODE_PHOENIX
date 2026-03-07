"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Users, FlaskConical, Activity, Zap, ShieldCheck, AlertTriangle, CheckCircle2, TrendingUp,
} from "lucide-react";
import { Card, StatCard } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie,
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
        { label: "Eligible", count: summary.matching_health?.eligible_count || 0, color: "#22C55E" },
        { label: "Review Needed", count: summary.matching_health?.review_needed || 0, color: "#F59E0B" },
        { label: "Ineligible", count: summary.matching_health?.ineligible_count || 0, color: "#EF4444" },
      ]
    : [];

  const matchingHealthPieData = summary
    ? matchingHealthData.filter(d => d.count > 0)
    : [];

  const totalMatches = summary
    ? (summary.matching_health?.eligible_count || 0) + (summary.matching_health?.review_needed || 0) + (summary.matching_health?.ineligible_count || 0)
    : 0;

  const successRate = totalMatches > 0
    ? Math.round(((summary?.matching_health?.eligible_count || 0) / totalMatches) * 100)
    : 0;

  return (
    <>
      <ProgressBar isLoading={loading} label="Loading dashboard analytics..." />
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-6"
      >
        {/* Page header */}
        <motion.div variants={itemVariants}>
          <h1 className="text-2xl font-bold text-text-primary">Research Dashboard</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Welcome, {user?.researcher_profile?.full_name || "Researcher"}. Real-time system metrics and matching analytics.
          </p>
        </motion.div>

        {error && (
          <motion.div variants={itemVariants} className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
            ⚠️ {error}
          </motion.div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-surface-muted animate-pulse" />
            ))}
          </motion.div>
        )}

        {/* Real-time Stats Cards */}
        {summary && (
          <>
            <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total Patients"
                value={summary.counts?.patients || 0}
                icon={<Users size={20} className="text-brand-purple" />}
                iconBg="bg-brand-purple-light"
                subtitle="Ingested"
              />
              <StatCard
                title="Clinical Trials"
                value={summary.counts?.trials || 0}
                icon={<FlaskConical size={20} className="text-blue-500" />}
                iconBg="bg-blue-50"
                subtitle="Maharashtra"
              />
              <StatCard
                title="Matches Generated"
                value={totalMatches}
                icon={<Zap size={20} className="text-emerald-500" />}
                iconBg="bg-emerald-50"
                subtitle={`${successRate}% eligible`}
              />
              <StatCard
                title="Data Protected"
                value={`${summary.privacy?.entities_protected || 0}`}
                icon={<ShieldCheck size={20} className="text-green-500" />}
                iconBg="bg-green-50"
                subtitle="PII entities"
              />
            </motion.div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Matching Health Bar Chart */}
              <motion.div variants={itemVariants} className="lg:col-span-2">
                <Card>
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                      <TrendingUp size={16} className="text-brand-purple" />
                      Matching Health Distribution
                    </h3>
                    <p className="text-xs text-text-muted mt-0.5">
                      {totalMatches} total matches across all patients
                    </p>
                  </div>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={matchingHealthData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 12,
                          border: "1px solid #E2E8F0",
                          boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
                          fontSize: 12,
                        }}
                        cursor={{ fill: "#F8FAFC" }}
                      />
                      <Bar dataKey="count" radius={[12, 12, 0, 0]} animationDuration={800}>
                        {matchingHealthData.map((entry, i) => (
                          <Cell key={`cell-${i}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </motion.div>

              {/* Matching Distribution Pie Chart */}
              <motion.div variants={itemVariants}>
                <Card>
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-text-primary">Match Status Ratio</h3>
                    <p className="text-xs text-text-muted mt-0.5">{totalMatches} total matches</p>
                  </div>
                  {matchingHealthPieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={matchingHealthPieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ label, count }) => `${label}: ${count}`}
                          outerRadius={75}
                          fill="#8884d8"
                          dataKey="count"
                          animationDuration={800}
                        >
                          {matchingHealthPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `${value} matches`} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-56 flex items-center justify-center text-text-muted text-sm">
                      No match data available yet
                    </div>
                  )}
                </Card>
              </motion.div>
            </div>

            {/* Compliance & Privacy Section */}
            <motion.div variants={itemVariants}>
              <Card>
                <h3 className="text-sm font-semibold text-text-primary mb-4">System Status & Compliance</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* PII Protection */}
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-green-50 border border-green-200">
                    <CheckCircle2 size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-text-primary">PII Protection</p>
                      <p className="text-sm font-bold text-green-600 mt-1">
                        {summary.privacy?.entities_protected || 0}
                      </p>
                      <p className="text-xs text-text-muted mt-0.5">Entities redacted</p>
                    </div>
                  </div>

                  {/* Audit Logs */}
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200">
                    <Activity size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-text-primary">Audit Logs</p>
                      <p className="text-sm font-bold text-blue-600 mt-1">
                        {summary.privacy?.audit_logs_count || 0}
                      </p>
                      <p className="text-xs text-text-muted mt-0.5">Access events</p>
                    </div>
                  </div>

                  {/* Eligible Matches */}
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                    <CheckCircle2 size={20} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-text-primary">Eligible</p>
                      <p className="text-sm font-bold text-emerald-600 mt-1">
                        {summary.matching_health?.eligible_count || 0}
                      </p>
                      <p className="text-xs text-text-muted mt-0.5">Ready matches</p>
                    </div>
                  </div>

                  {/* Review Needed */}
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
                    <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-text-primary">Review Needed</p>
                      <p className="text-sm font-bold text-amber-600 mt-1">
                        {summary.matching_health?.review_needed || 0}
                      </p>
                      <p className="text-xs text-text-muted mt-0.5">Pending review</p>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Success Rate Metric */}
            <motion.div variants={itemVariants}>
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">Overall Success Rate</h3>
                    <p className="text-xs text-text-muted mt-0.5">Percentage of eligible matches from total matches</p>
                  </div>
                  <span className="text-3xl font-bold text-brand-purple">{successRate}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-surface-muted overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-brand-purple to-brand-blue transition-all duration-700"
                    style={{ width: `${successRate}%` }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4 mt-6 text-center">
                  <div>
                    <p className="text-xs text-text-muted">Eligible</p>
                    <p className="text-lg font-bold text-green-600 mt-1">
                      {summary.matching_health?.eligible_count || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted">Total</p>
                    <p className="text-lg font-bold text-text-primary mt-1">{totalMatches}</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted">Ineligible</p>
                    <p className="text-lg font-bold text-red-600 mt-1">
                      {summary.matching_health?.ineligible_count || 0}
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          </>
        )}
      </motion.div>
    </>
  );
}
