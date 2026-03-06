"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  HeartPulse,
  GitCompare,
  Send,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  FlaskConical,
  Star,
} from "lucide-react";
import { StatCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Table";
import { getMatchResults, type MatchResult } from "@/lib/api";
import { useAuth } from "@/lib/authContext";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export default function PatientDashboardPage() {
  const auth = useAuth();
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const hasProfile = !!auth.patientId;

  useEffect(() => {
    if (!auth.patientId) return;
    setLoading(true);
    getMatchResults(auth.patientId)
      .then((res) => setMatches(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [auth.patientId]);

  const eligibleCount = matches.filter((m) => m.status === "ELIGIBLE").length;
  const top3 = matches.slice(0, 3);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-text-primary">
          Welcome back, {auth.user?.full_name || "Patient"}
        </h1>
        <p className="text-sm text-text-muted mt-0.5">
          Here&apos;s your clinical trial matching summary.
        </p>
      </motion.div>

      {/* Profile incomplete banner */}
      {!hasProfile && (
        <motion.div
          variants={itemVariants}
          className="flex items-start gap-3 p-4 rounded-2xl bg-orange-50 border border-orange-200"
        >
          <AlertCircle size={18} className="text-orange-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-orange-700">
              Health Profile Incomplete
            </p>
            <p className="text-xs text-orange-600 mt-0.5">
              Add your health information to find matching clinical trials.
            </p>
          </div>
          <Link
            href="/patient/health-records"
            className="flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700 hover:underline flex-shrink-0"
          >
            Complete Profile <ChevronRight size={13} />
          </Link>
        </motion.div>
      )}

      {/* Stat cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Health Profile"
          value={hasProfile ? "Complete" : "Incomplete"}
          icon={
            hasProfile ? (
              <CheckCircle size={20} className="text-emerald-500" />
            ) : (
              <AlertCircle size={20} className="text-orange-500" />
            )
          }
          iconBg={hasProfile ? "bg-emerald-100" : "bg-orange-100"}
          subtitle={hasProfile ? "All fields filled" : "Action required"}
        />
        <StatCard
          title="Matches Found"
          value={loading ? "—" : matches.length}
          icon={<GitCompare size={20} className="text-brand-purple" />}
          iconBg="bg-brand-purple-light"
          subtitle="Based on your profile"
        />
        <StatCard
          title="Eligible Trials"
          value={loading ? "—" : eligibleCount}
          icon={<Send size={20} className="text-blue-500" />}
          iconBg="bg-brand-blue-light"
          subtitle="Full eligibility matches"
        />
      </motion.div>

      {/* Update health records CTA */}
      <motion.div variants={itemVariants}>
        <div
          className="rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          style={{ background: "linear-gradient(135deg, #EDE9FE 0%, #DBEAFE 100%)" }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm flex-shrink-0">
              <HeartPulse className="text-brand-purple" size={22} />
            </div>
            <div>
              <p className="font-bold text-text-primary text-sm">
                Keep your health records updated
              </p>
              <p className="text-xs text-text-secondary mt-0.5">
                Better data leads to more accurate trial matches.
              </p>
            </div>
          </div>
          <Link
            href="/patient/health-records"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-purple text-white text-sm font-semibold hover:bg-violet-600 transition-colors shadow-sm flex-shrink-0"
          >
            Update Health Records <ArrowRight size={14} />
          </Link>
        </div>
      </motion.div>

      {/* Matched trials */}
      {hasProfile && (
        <motion.div variants={itemVariants} className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-text-primary">Your Trial Matches</h2>
              <p className="text-xs text-text-muted mt-0.5">
                Trials matched to your health profile
              </p>
            </div>
            <Link
              href="/patient/matches"
              className="flex items-center gap-1 text-xs font-semibold text-brand-purple hover:underline"
            >
              View all <ChevronRight size={13} />
            </Link>
          </div>

          {loading ? (
            <div className="flex flex-col gap-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 rounded-2xl bg-surface-muted animate-pulse" />
              ))}
            </div>
          ) : top3.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-card p-10 flex flex-col items-center gap-3 text-center">
              <GitCompare size={28} className="text-text-muted" />
              <p className="font-semibold text-text-primary text-sm">No matches yet</p>
              <p className="text-xs text-text-muted">
                Go to the{" "}
                <Link href="/patient/matching" className="text-brand-purple font-medium hover:underline">
                  Matching
                </Link>{" "}
                page to find trials.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {top3.map((match, i) => {
                const pct = Math.round(match.confidence_score * 100);
                const variant =
                  match.status === "ELIGIBLE"
                    ? "green"
                    : match.status === "REVIEW_NEEDED"
                    ? "orange"
                    : "red";
                return (
                  <motion.div
                    key={match._id || match.nct_id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className="bg-white rounded-2xl shadow-card p-5 flex flex-col sm:flex-row sm:items-center gap-4"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-brand-purple-light flex items-center justify-center flex-shrink-0">
                      <FlaskConical size={18} className="text-brand-purple" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold text-brand-purple bg-brand-purple-light px-2 py-0.5 rounded-lg">
                          {match.nct_id}
                        </span>
                        <Badge variant={variant as "green" | "orange" | "red"}>
                          {match.status.replace("_", " ")}
                        </Badge>
                      </div>
                      {match.analysis?.summary && (
                        <p className="text-xs text-text-muted leading-snug line-clamp-2">
                          {match.analysis.summary}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col sm:items-end gap-2 flex-shrink-0">
                      <div className="flex items-center gap-1.5">
                        <Star size={13} className="text-brand-orange" />
                        <span
                          className={`font-bold text-sm ${
                            pct >= 90
                              ? "text-emerald-600"
                              : pct >= 75
                              ? "text-blue-600"
                              : "text-orange-600"
                          }`}
                        >
                          {pct}% match
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
