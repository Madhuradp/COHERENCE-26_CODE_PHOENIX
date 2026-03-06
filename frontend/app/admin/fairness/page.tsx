"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Scale, AlertTriangle, TrendingUp, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { getFairnessStats } from "@/lib/api";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export default function FairnessAnalyticsPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getFairnessStats()
      .then((res) => setData(res.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Extract common numeric metrics to display as stat cards
  const renderStatCards = () => {
    if (!data) return null;
    const entries = Object.entries(data).filter(([, v]) => typeof v === "number" || typeof v === "string");
    if (entries.length === 0) return null;
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {entries.slice(0, 8).map(([key, val]) => (
          <div key={key} className="bg-white rounded-2xl shadow-card p-5">
            <p className="text-xl font-bold text-text-primary">{String(val)}</p>
            <p className="text-xs text-text-muted mt-0.5 capitalize">{key.replace(/_/g, " ")}</p>
          </div>
        ))}
      </div>
    );
  };

  // Render nested objects as sections
  const renderSection = (key: string, val: unknown) => {
    if (typeof val !== "object" || val === null || Array.isArray(val)) return null;
    const entries = Object.entries(val as Record<string, unknown>);
    return (
      <Card key={key}>
        <h3 className="font-semibold text-text-primary mb-3 capitalize">{key.replace(/_/g, " ")}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {entries.map(([k, v]) => (
            <div key={k} className="p-3 rounded-xl bg-surface-muted">
              <p className="text-sm font-bold text-text-primary">{String(v)}</p>
              <p className="text-xs text-text-muted capitalize">{k.replace(/_/g, " ")}</p>
            </div>
          ))}
        </div>
      </Card>
    );
  };

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
            <Scale size={22} className="text-brand-purple" /> Fairness Analytics
          </h1>
          <p className="text-sm text-text-muted mt-0.5">Demographic representation and bias detection across active trials</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-purple-light flex items-center justify-center">
            <TrendingUp size={20} className="text-brand-purple" />
          </div>
        </div>
      </motion.div>

      {error && (
        <motion.div variants={itemVariants} className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 border border-red-200">
          <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{error}</p>
        </motion.div>
      )}

      {loading && (
        <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-surface-muted animate-pulse" />)}
        </motion.div>
      )}

      {!loading && !error && (!data || Object.keys(data).length === 0) && (
        <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-card p-12 flex flex-col items-center gap-3 text-center">
          <ShieldCheck size={32} className="text-text-muted" />
          <p className="font-semibold text-text-primary">No fairness data available</p>
          <p className="text-sm text-text-muted">Run matching jobs to generate fairness metrics.</p>
        </motion.div>
      )}

      {data && Object.keys(data).length > 0 && (
        <>
          <motion.div variants={itemVariants}>
            {renderStatCards()}
          </motion.div>

          {Object.entries(data)
            .filter(([, v]) => typeof v === "object" && v !== null && !Array.isArray(v))
            .map(([key, val]) => (
              <motion.div key={key} variants={itemVariants}>
                {renderSection(key, val)}
              </motion.div>
            ))}
        </>
      )}
    </motion.div>
  );
}
