"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GitCompare, Search, Star, CheckCircle, ArrowRight, FlaskConical, X,
} from "lucide-react";
import { Badge } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { getMatchResults, type MatchResult } from "@/lib/api";
import { useAuth } from "@/lib/authContext";
import Link from "next/link";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

function ScoreBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    pct >= 90 ? "text-emerald-600 bg-emerald-100" :
    pct >= 75 ? "text-blue-600 bg-brand-blue-light" :
    "text-orange-600 bg-brand-orange-light";
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-sm font-bold ${color}`}>
      <Star size={13} /> {pct}% match
    </span>
  );
}

export default function MatchesPage() {
  const auth = useAuth();
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [selectedMatch, setSelectedMatch] = useState<MatchResult | null>(null);

  useEffect(() => {
    if (!auth.patientId) {
      setLoading(false);
      return;
    }
    getMatchResults(auth.patientId)
      .then((res) => setMatches(res.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [auth.patientId]);

  const filtered = matches
    .filter((m) => {
      const s = search.toLowerCase();
      return (
        m.confidence_score >= minScore &&
        (statusFilter ? m.status === statusFilter : true) &&
        ((m.nct_id || "").toLowerCase().includes(s) ||
          (m.analysis?.summary || "").toLowerCase().includes(s))
      );
    })
    .sort((a, b) => b.confidence_score - a.confidence_score);

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
            <GitCompare size={22} className="text-brand-purple" /> Trial Matches
          </h1>
          <p className="text-sm text-text-muted mt-0.5">
            {loading ? "Loading..." : `${filtered.length} trials matched to your health profile`}
          </p>
        </div>
        <Link href="/patient/health-records">
          <Button variant="secondary" size="sm">Update Health Records</Button>
        </Link>
      </motion.div>

      {error && (
        <motion.div variants={itemVariants} className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
          {error}
        </motion.div>
      )}

      {!auth.patientId && !loading && (
        <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-card p-12 flex flex-col items-center gap-3 text-center">
          <GitCompare size={32} className="text-text-muted" />
          <p className="font-semibold text-text-primary">No health profile found</p>
          <p className="text-sm text-text-muted">Add your health records first to find trial matches.</p>
          <Link href="/patient/health-records" className="text-sm text-brand-purple hover:underline font-medium">
            Add health records →
          </Link>
        </motion.div>
      )}

      {auth.patientId && (
        <>
          {/* Filters */}
          <motion.div variants={itemVariants} className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Search by trial ID or summary..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-white border border-surface-border focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10 outline-none transition-all"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl text-sm bg-white border border-surface-border focus:border-brand-purple outline-none cursor-pointer"
            >
              <option value="">All statuses</option>
              <option value="ELIGIBLE">Eligible</option>
              <option value="REVIEW_NEEDED">Review Needed</option>
              <option value="INELIGIBLE">Ineligible</option>
            </select>
            <select
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="px-3 py-2.5 rounded-xl text-sm bg-white border border-surface-border focus:border-brand-purple outline-none cursor-pointer"
            >
              <option value={0}>All scores</option>
              <option value={0.75}>≥ 75%</option>
              <option value={0.85}>≥ 85%</option>
              <option value={0.9}>≥ 90%</option>
            </select>
            {(search || statusFilter || minScore > 0) && (
              <button
                onClick={() => { setSearch(""); setStatusFilter(""); setMinScore(0); }}
                className="flex items-center gap-1.5 text-xs text-red-500 hover:underline"
              >
                <X size={13} /> Clear filters
              </button>
            )}
          </motion.div>

          {/* Matches grid + detail panel */}
          <motion.div variants={itemVariants} className="flex gap-5 flex-col lg:flex-row">
            <div className="flex-1 flex flex-col gap-4">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <div key={i} className="h-28 rounded-2xl bg-surface-muted animate-pulse" />
                ))
              ) : filtered.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-card p-12 flex flex-col items-center gap-3 text-center">
                  <GitCompare size={32} className="text-text-muted" />
                  <p className="font-semibold text-text-primary">No matches found</p>
                  <p className="text-sm text-text-muted">Try adjusting your filters or run matching again.</p>
                </div>
              ) : (
                filtered.map((match, i) => {
                  const pct = Math.round(match.confidence_score * 100);
                  const statusVariant =
                    match.status === "ELIGIBLE" ? "green" :
                    match.status === "REVIEW_NEEDED" ? "orange" : "red";
                  return (
                    <motion.div
                      key={match._id || match.nct_id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.07 }}
                      onClick={() => setSelectedMatch(match)}
                      className={`bg-white rounded-2xl shadow-card p-5 cursor-pointer hover:shadow-card-hover transition-all duration-200 ${
                        selectedMatch?.nct_id === match.nct_id ? "ring-2 ring-brand-purple" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="w-11 h-11 rounded-2xl bg-brand-purple-light flex items-center justify-center flex-shrink-0 mt-0.5">
                            <FlaskConical size={19} className="text-brand-purple" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1.5">
                              <span className="font-mono text-xs font-bold text-brand-purple bg-brand-purple-light px-2 py-0.5 rounded-lg">
                                {match.nct_id}
                              </span>
                              <Badge variant={statusVariant as "green" | "orange" | "red"}>
                                {match.status.replace("_", " ")}
                              </Badge>
                            </div>
                            {match.analysis?.summary && (
                              <p className="text-sm text-text-secondary leading-snug line-clamp-2">
                                {match.analysis.summary}
                              </p>
                            )}
                            {(match.analysis?.criteria_met?.length ?? 0) > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {match.analysis!.criteria_met!.slice(0, 2).map((c, ci) => (
                                  <div key={ci} className="flex items-center gap-1.5 text-xs text-emerald-600">
                                    <CheckCircle size={11} />
                                    <span className="truncate max-w-[180px]">{c}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <ScoreBadge score={match.confidence_score} />
                          <div className="w-24 h-1.5 rounded-full bg-surface-muted overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.7, delay: i * 0.1 }}
                              className={`h-full rounded-full ${
                                pct >= 90 ? "bg-emerald-400" : pct >= 75 ? "bg-blue-400" : "bg-orange-400"
                              }`}
                            />
                          </div>
                          {match.distance_km !== undefined && match.distance_km !== null && (
                            <span className="text-xs text-text-muted">{match.distance_km.toFixed(1)} km</span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Eligibility detail panel */}
            <AnimatePresence>
              {selectedMatch && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.25 }}
                  className="w-full lg:w-72 xl:w-80 flex-shrink-0"
                >
                  <div className="bg-white rounded-2xl shadow-card p-5 sticky top-6">
                    <div className="flex items-center justify-between mb-4">
                      <p className="font-bold text-text-primary text-sm">Eligibility Details</p>
                      <button
                        onClick={() => setSelectedMatch(null)}
                        className="p-1.5 rounded-lg hover:bg-surface-muted text-text-muted"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    <div className="mb-4 pb-4 border-b border-surface-border">
                      <p className="font-mono text-sm font-bold text-brand-purple mb-1">{selectedMatch.nct_id}</p>
                      <ScoreBadge score={selectedMatch.confidence_score} />
                    </div>

                    {selectedMatch.analysis?.summary && (
                      <p className="text-xs text-text-muted mb-4 leading-relaxed">{selectedMatch.analysis.summary}</p>
                    )}

                    {(selectedMatch.analysis?.criteria_met?.length ?? 0) > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-2">Criteria Met</p>
                        <div className="flex flex-col gap-1.5">
                          {selectedMatch.analysis!.criteria_met!.map((c, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <CheckCircle size={12} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                              <span className="text-xs text-text-primary leading-snug">{c}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {(selectedMatch.analysis?.criteria_failed?.length ?? 0) > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-2">Criteria Failed</p>
                        <div className="flex flex-col gap-1.5">
                          {selectedMatch.analysis!.criteria_failed!.map((c, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <X size={12} className="text-red-400 flex-shrink-0 mt-0.5" />
                              <span className="text-xs text-text-primary leading-snug">{c}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {(selectedMatch.analysis?.warnings?.length ?? 0) > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-2">Warnings</p>
                        <div className="flex flex-col gap-1.5">
                          {selectedMatch.analysis!.warnings!.map((w, i) => (
                            <span key={i} className="text-xs text-text-muted leading-snug">⚠ {w}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-5 pt-4 border-t border-surface-border">
                      <Link href={`/patient/trials/${selectedMatch.nct_id}`}>
                        <Button variant="primary" size="md" className="w-full" rightIcon={<ArrowRight size={14} />}>
                          View Trial Details
                        </Button>
                      </Link>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
