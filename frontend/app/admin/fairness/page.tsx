"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Scale, AlertTriangle, TrendingUp, ShieldCheck, Users, MapPin } from "lucide-react";
import { Card, StatCard } from "@/components/ui/Card";
import { getFairnessStats } from "@/lib/api";
import { fairnessData as mockFairness } from "@/lib/adminMockData";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const SEVERITY_COLORS: Record<string, string> = {
  high: "#EF4444",
  medium: "#F97316",
  low: "#EAB308",
};

const SEVERITY_BG: Record<string, string> = {
  high: "bg-red-50 border-red-200 text-red-900",
  medium: "bg-orange-50 border-orange-200 text-orange-900",
  low: "bg-yellow-50 border-yellow-200 text-yellow-900",
};

export default function FairnessAnalyticsPage() {
  const [apiData, setApiData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getFairnessStats()
      .then((res) => setApiData(res.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Merge API data into chart data: prefer API values, fall back to mock
  const genderData = (() => {
    const dist = (apiData as any)?.gender_distribution;
    if (dist && Object.keys(dist).length > 0) {
      const COLORS = ["#7C3AED", "#60A5FA", "#FB923C", "#34D399"];
      return Object.entries(dist).map(([name, value], i) => ({
        name,
        value: typeof value === "number" ? value : Number(value) || 0,
        fill: COLORS[i % COLORS.length],
      }));
    }
    return mockFairness.genderDistribution;
  })();

  const ageData = (() => {
    const dist = (apiData as any)?.age_distribution;
    if (dist && Object.keys(dist).length > 0) {
      const COLORS = ["#7C3AED", "#8B5CF6", "#60A5FA", "#FB923C", "#F87171"];
      return Object.entries(dist).map(([range, count], i) => ({
        range,
        count: typeof count === "number" ? count : Number(count) || 0,
        fill: COLORS[i % COLORS.length],
      }));
    }
    return mockFairness.ageDistribution;
  })();

  const regionData = mockFairness.regionDistribution;

  const biasAlerts: Array<{ id: number; trial: string; metric: string; severity: "high" | "medium" | "low"; description: string }> = (() => {
    const alerts = (apiData as any)?.bias_alerts;
    if (alerts && Array.isArray(alerts) && alerts.length > 0) return alerts;
    return mockFairness.biasAlerts;
  })();

  const totalPatients = ageData.reduce((s, d) => s + d.count, 0);
  const genderBalance = (() => {
    const male = genderData.find((d) => d.name.toLowerCase() === "male");
    const female = genderData.find((d) => d.name.toLowerCase() === "female");
    if (!male || !female) return "—";
    const diff = Math.abs(male.value - female.value);
    return diff <= 5 ? "Balanced" : diff <= 15 ? "Moderate" : "Imbalanced";
  })();

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
            <Scale size={22} className="text-brand-purple" /> Fairness Analytics
          </h1>
          <p className="text-sm text-text-muted mt-0.5">
            Demographic representation and bias detection across active trials
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200">
          <ShieldCheck size={14} className="text-emerald-600" />
          <span className="text-xs font-semibold text-emerald-700">Fairness Monitoring Active</span>
        </div>
      </motion.div>

      {error && (
        <motion.div variants={itemVariants} className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 border border-red-200">
          <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{error} — showing representative data</p>
        </motion.div>
      )}

      {/* Summary stat cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Patients Analysed"
          value={loading ? "—" : String(totalPatients || "1,062")}
          icon={<Users size={18} className="text-brand-purple" />}
          iconBg="bg-brand-purple-light"
          subtitle="Across all trials"
        />
        <StatCard
          title="Gender Balance"
          value={loading ? "—" : genderBalance}
          icon={<Scale size={18} className="text-blue-500" />}
          iconBg="bg-blue-50"
          subtitle="M/F/Other distribution"
        />
        <StatCard
          title="Active Bias Alerts"
          value={loading ? "—" : String(biasAlerts.length)}
          icon={<AlertTriangle size={18} className="text-amber-500" />}
          iconBg="bg-amber-50"
          subtitle={biasAlerts.filter((a) => a.severity === "high").length + " high severity"}
        />
        <StatCard
          title="Regions Represented"
          value={String(regionData.length)}
          icon={<MapPin size={18} className="text-emerald-500" />}
          iconBg="bg-emerald-50"
          subtitle="Geographic coverage"
        />
      </motion.div>

      {/* Charts row 1: Gender Pie + Age Bar */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gender Distribution */}
        <Card>
          <h2 className="font-semibold text-text-primary mb-1">Gender Distribution</h2>
          <p className="text-xs text-text-muted mb-4">Share of patients by gender across all trials</p>
          {loading ? (
            <div className="h-52 rounded-xl bg-surface-muted animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={genderData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {genderData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12 }}
                  formatter={(v: number) => [`${v}%`, "Share"]}
                />
                <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Age Distribution */}
        <Card>
          <h2 className="font-semibold text-text-primary mb-1">Age Group Distribution</h2>
          <p className="text-xs text-text-muted mb-4">Patient count per age bracket</p>
          {loading ? (
            <div className="h-52 rounded-xl bg-surface-muted animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ageData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="range" tick={{ fontSize: 11 }} stroke="#CBD5E1" />
                <YAxis tick={{ fontSize: 11 }} stroke="#CBD5E1" />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12 }}
                  formatter={(v: number) => [v, "Patients"]}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {ageData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </motion.div>

      {/* Regional Enrollment Chart */}
      <motion.div variants={itemVariants}>
        <Card>
          <h2 className="font-semibold text-text-primary mb-1">Regional Enrollment vs Eligible Pool</h2>
          <p className="text-xs text-text-muted mb-4">
            Enrolled patients compared to eligible patients in each region — gaps indicate potential regional bias
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={regionData} margin={{ top: 4, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="region" tick={{ fontSize: 11 }} stroke="#CBD5E1" />
              <YAxis tick={{ fontSize: 11 }} stroke="#CBD5E1" />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12 }}
              />
              <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="eligible" name="Eligible" fill="#60A5FA" radius={[4, 4, 0, 0]} />
              <Bar dataKey="enrolled" name="Enrolled" fill="#7C3AED" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </motion.div>

      {/* Bias Alerts */}
      <motion.div variants={itemVariants}>
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-text-primary flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-500" /> Active Bias Alerts
            </h2>
            <span className="text-xs px-2 py-1 rounded-lg bg-amber-50 text-amber-700 font-semibold border border-amber-200">
              {biasAlerts.length} alerts
            </span>
          </div>
          <div className="space-y-3">
            {biasAlerts.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <ShieldCheck size={28} className="text-emerald-500" />
                <p className="text-sm font-semibold text-text-primary">No bias alerts detected</p>
                <p className="text-xs text-text-muted">All demographics are within acceptable thresholds.</p>
              </div>
            ) : (
              biasAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`flex items-start gap-3 p-4 rounded-xl border ${SEVERITY_BG[alert.severity] || "bg-surface-muted border-surface-border text-text-primary"}`}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0"
                    style={{ background: SEVERITY_COLORS[alert.severity] || "#9CA3AF" }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-bold uppercase tracking-wide">{alert.severity} severity</span>
                      <span className="text-xs font-semibold">• {alert.metric}</span>
                      {alert.trial && (
                        <span className="text-xs font-mono bg-white/60 px-1.5 py-0.5 rounded">{alert.trial}</span>
                      )}
                    </div>
                    <p className="text-xs leading-relaxed">{alert.description}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </motion.div>

      {/* Fairness score summary */}
      <motion.div variants={itemVariants}>
        <Card>
          <h2 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-brand-purple" /> Fairness Dimension Scores
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Gender Parity", score: 88, color: "#7C3AED", note: "Slight female under-representation" },
              { label: "Age Coverage", score: 74, color: "#60A5FA", note: "Seniors (61+) under-enrolled" },
              { label: "Regional Equity", score: 81, color: "#FB923C", note: "East India gap detected" },
            ].map((dim) => (
              <div key={dim.label} className="p-4 rounded-xl bg-surface-muted">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-text-primary">{dim.label}</span>
                  <span className="text-lg font-bold" style={{ color: dim.color }}>{dim.score}</span>
                </div>
                <div className="h-2 rounded-full bg-surface-border overflow-hidden mb-2">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${dim.score}%`, background: dim.color }}
                  />
                </div>
                <p className="text-xs text-text-muted">{dim.note}</p>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
