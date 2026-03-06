"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, Brain, Zap, ShieldCheck } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  getAnalyticsSummary, getTrainingStats, trainModel,
  type AnalyticsSummary, type TrainingStats,
} from "@/lib/api";
import { Button } from "@/components/ui/Button";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [trainingStats, setTrainingStats] = useState<TrainingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [training, setTraining] = useState(false);
  const [trainResult, setTrainResult] = useState<Record<string, unknown> | null>(null);
  const [trainError, setTrainError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getAnalyticsSummary(), getTrainingStats()])
      .then(([s, t]) => {
        setSummary(s.data);
        setTrainingStats(t.data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleTrain = async () => {
    setTraining(true);
    setTrainError(null);
    setTrainResult(null);
    try {
      const res = await trainModel("random_forest");
      setTrainResult(res.metrics);
    } catch (e: unknown) {
      setTrainError(e instanceof Error ? e.message : "Training failed");
    } finally {
      setTraining(false);
    }
  };

  const matchingHealthData = summary
    ? [
        { label: "Eligible", count: summary.matching_health.eligible_count, color: "#22C55E" },
        { label: "Review Needed", count: summary.matching_health.review_needed, color: "#F59E0B" },
        { label: "Ineligible", count: summary.matching_health.ineligible_count, color: "#EF4444" },
      ]
    : [];

  const trainingClassData = trainingStats
    ? [
        { label: "Eligible Samples", count: trainingStats.eligible_samples, color: "#8B5CF6" },
        { label: "Ineligible Samples", count: trainingStats.ineligible_samples, color: "#60A5FA" },
        { label: "Review Needed", count: trainingStats.review_needed_samples, color: "#FB923C" },
      ]
    : [];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <BarChart3 size={22} className="text-brand-purple" /> Analytics
        </h1>
        <p className="text-sm text-text-muted mt-0.5">System performance metrics and ML model insights</p>
      </motion.div>

      {error && (
        <motion.div variants={itemVariants} className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
          {error}
        </motion.div>
      )}

      {loading && (
        <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-2xl bg-surface-muted animate-pulse" />)}
        </motion.div>
      )}

      {summary && (
        <>
          {/* Overview stat cards */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Patients", value: summary.counts.patients, color: "text-brand-purple", bg: "bg-brand-purple-light", icon: BarChart3 },
              { label: "Trials", value: summary.counts.trials, color: "text-blue-500", bg: "bg-brand-blue-light", icon: BarChart3 },
              { label: "Matches", value: summary.counts.matches, color: "text-teal-500", bg: "bg-teal-50", icon: Zap },
              { label: "PII Protected", value: summary.privacy.entities_protected, color: "text-green-600", bg: "bg-green-50", icon: ShieldCheck },
            ].map((item) => (
              <div key={item.label} className="bg-white rounded-2xl shadow-card p-5">
                <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center mb-3`}>
                  <item.icon size={18} className={item.color} />
                </div>
                <p className="text-2xl font-bold text-text-primary">{item.value.toLocaleString()}</p>
                <p className="text-xs text-text-muted mt-0.5">{item.label}</p>
              </div>
            ))}
          </motion.div>

          {/* Charts row */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Matching health */}
            <div className="bg-white rounded-2xl shadow-card p-6">
              <h3 className="text-sm font-semibold text-text-primary mb-1">Matching Health</h3>
              <p className="text-xs text-text-muted mb-4">Eligibility outcomes across all match runs</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={matchingHealthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12 }} cursor={{ fill: "#F8FAFC" }} />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]} animationDuration={700}>
                    {matchingHealthData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Training data distribution */}
            {trainingStats && (
              <div className="bg-white rounded-2xl shadow-card p-6">
                <h3 className="text-sm font-semibold text-text-primary mb-1">ML Training Data</h3>
                <p className="text-xs text-text-muted mb-4">Sample distribution for ML gatekeeper model</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={trainingClassData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12 }} cursor={{ fill: "#F8FAFC" }} />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]} animationDuration={700}>
                      {trainingClassData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </motion.div>
        </>
      )}

      {/* ML Model Training */}
      {trainingStats && (
        <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-card p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-purple-light flex items-center justify-center">
                <Brain size={18} className="text-brand-purple" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-text-primary">ML Gatekeeper Model</h3>
                <p className="text-xs text-text-muted">Train or retrain the Random Forest eligibility classifier</p>
              </div>
            </div>
            <Button
              variant="primary"
              size="md"
              leftIcon={<Brain size={15} />}
              loading={training}
              onClick={handleTrain}
              disabled={!trainingStats.ready_to_train}
            >
              {trainingStats.ready_to_train ? "Train Model" : "Not enough data"}
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            {[
              { label: "Training Samples", value: trainingStats.training_samples_available },
              { label: "Eligible", value: trainingStats.eligible_samples },
              { label: "Ineligible", value: trainingStats.ineligible_samples },
              { label: "Ready to Train", value: trainingStats.ready_to_train ? "Yes" : "No" },
            ].map((item) => (
              <div key={item.label} className="p-3 rounded-xl bg-surface-muted">
                <p className="text-lg font-bold text-text-primary">{String(item.value)}</p>
                <p className="text-xs text-text-muted">{item.label}</p>
              </div>
            ))}
          </div>

          {trainError && (
            <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 mb-3">{trainError}</div>
          )}

          {trainResult && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-green-50 border border-green-200"
            >
              <p className="text-sm font-semibold text-green-700 mb-2">Training Complete</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {["accuracy", "precision", "recall", "f1_score"].map((key) => (
                  trainResult[key] !== undefined && (
                    <div key={key}>
                      <p className="text-lg font-bold text-green-800">{(Number(trainResult[key]) * 100).toFixed(1)}%</p>
                      <p className="text-xs text-green-600 capitalize">{key.replace("_", " ")}</p>
                    </div>
                  )
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
