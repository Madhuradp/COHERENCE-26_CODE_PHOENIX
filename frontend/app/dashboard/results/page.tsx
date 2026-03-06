"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardList, Users, Star, FlaskConical, Search, CheckCircle, X, ChevronDown,
} from "lucide-react";
import { StatCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Table, Badge } from "@/components/ui/Table";
import { listPatients, getMatchResults, type Patient, type MatchResult } from "@/lib/api";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

function getScoreBadge(score: number): "green" | "blue" | "orange" | "red" {
  if (score >= 0.9) return "green";
  if (score >= 0.75) return "blue";
  if (score >= 0.6) return "orange";
  return "red";
}

export default function ResultsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<MatchResult | null>(null);
  const [search, setSearch] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listPatients()
      .then((res) => setPatients(res.data))
      .catch((e) => setError(e.message))
      .finally(() => setPatientsLoading(false));
  }, []);

  const loadMatches = async (patient: Patient) => {
    setSelectedPatient(patient);
    setDropdownOpen(false);
    setMatchesLoading(true);
    setSelectedMatch(null);
    try {
      const res = await getMatchResults(patient._id);
      setMatches(res.data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load matches");
    } finally {
      setMatchesLoading(false);
    }
  };

  const filtered = matches.filter((m) => {
    const s = search.toLowerCase();
    const score = m.confidence_score;
    return (
      score >= minScore &&
      ((m.nct_id || "").toLowerCase().includes(s) ||
        (m.status || "").toLowerCase().includes(s) ||
        (m.analysis?.summary || "").toLowerCase().includes(s))
    );
  });

  const eligibleCount = matches.filter(m => m.status === "ELIGIBLE").length;
  const avgScore = matches.length
    ? Math.round((matches.reduce((s, m) => s + m.confidence_score, 0) / matches.length) * 100)
    : 0;

  const columns = [
    {
      key: "nct_id",
      header: "Trial ID",
      render: (v: unknown) => (
        <span className="font-mono text-xs font-bold text-brand-purple">{String(v)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (v: unknown) => {
        const s = String(v);
        const variant = s === "ELIGIBLE" ? "green" : s === "REVIEW_NEEDED" ? "orange" : "red";
        return <Badge variant={variant as "green" | "orange" | "red"}>{s.replace("_", " ")}</Badge>;
      },
    },
    {
      key: "confidence_score",
      header: "Match Score",
      render: (v: unknown) => {
        const score = Number(v);
        const pct = Math.round(score * 100);
        return (
          <div className="flex items-center gap-2">
            <div className="flex-1 max-w-[80px] h-1.5 rounded-full bg-surface-muted overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.7 }}
                className={`h-full rounded-full ${pct >= 90 ? "bg-emerald-400" : pct >= 75 ? "bg-blue-400" : "bg-orange-400"}`}
              />
            </div>
            <Badge variant={getScoreBadge(score)}>{pct}%</Badge>
          </div>
        );
      },
    },
    {
      key: "distance_km",
      header: "Distance",
      render: (v: unknown) => (
        <span className="text-xs">{v !== undefined && v !== null ? `${Number(v).toFixed(1)} km` : "—"}</span>
      ),
    },
  ];

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
          <ClipboardList size={22} className="text-brand-purple" /> Match Results
        </h1>
        <p className="text-sm text-text-muted mt-0.5">
          Select a patient to view their clinical trial match results
        </p>
      </motion.div>

      {error && (
        <motion.div variants={itemVariants} className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
          {error}
        </motion.div>
      )}

      {/* Patient selector */}
      <motion.div variants={itemVariants}>
        <div className="bg-white rounded-2xl shadow-card p-5">
          <h2 className="text-sm font-semibold text-text-primary mb-3">Select Patient</h2>
          {patientsLoading ? (
            <div className="h-12 rounded-xl bg-surface-muted animate-pulse" />
          ) : (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-surface-border bg-white hover:border-brand-purple outline-none transition-all text-left"
              >
                {selectedPatient ? (
                  <span className="text-sm font-medium text-text-primary">
                    {selectedPatient.display_id || selectedPatient._id.slice(0, 12)} — {selectedPatient.conditions?.[0]?.name || "Unknown"}
                  </span>
                ) : (
                  <span className="text-sm text-text-muted">Choose a patient to view results...</span>
                )}
                <ChevronDown size={16} className={`text-text-muted transition-transform flex-shrink-0 ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-surface-border shadow-glass z-20 max-h-56 overflow-y-auto"
                  >
                    {patients.map((p) => (
                      <button
                        key={p._id}
                        className="w-full px-4 py-3 text-left text-sm hover:bg-surface-muted transition-colors border-b border-surface-border last:border-0"
                        onClick={() => loadMatches(p)}
                      >
                        <span className="font-mono text-xs font-bold text-brand-purple mr-2">
                          {p.display_id || p._id.slice(0, 8)}
                        </span>
                        {p.conditions?.[0]?.name || "Unknown condition"}
                        {p.demographics?.age ? ` · Age ${p.demographics.age}` : ""}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.div>

      {/* Summary cards */}
      {selectedPatient && !matchesLoading && (
        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Eligible Trials"
            value={eligibleCount}
            icon={<Users size={20} className="text-brand-purple" />}
            iconBg="bg-brand-purple-light"
            subtitle="Full eligibility matches"
          />
          <StatCard
            title="Avg. Match Score"
            value={`${avgScore}%`}
            icon={<Star size={20} className="text-orange-500" />}
            iconBg="bg-brand-orange-light"
          />
          <StatCard
            title="Total Matches"
            value={matches.length}
            icon={<FlaskConical size={20} className="text-blue-500" />}
            iconBg="bg-brand-blue-light"
          />
        </motion.div>
      )}

      {/* Filters + table */}
      {selectedPatient && (
        <>
          <motion.div variants={itemVariants} className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Search trials..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-white border border-surface-border focus:border-brand-purple outline-none transition-all"
              />
            </div>
            <select
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="px-3 py-2.5 rounded-xl text-sm bg-white border border-surface-border focus:border-brand-purple outline-none cursor-pointer"
            >
              <option value={0}>All scores</option>
              <option value={0.6}>Score ≥ 60%</option>
              <option value={0.75}>Score ≥ 75%</option>
              <option value={0.9}>Score ≥ 90%</option>
            </select>
            <span className="text-xs text-text-muted ml-auto">{filtered.length} results</span>
          </motion.div>

          <motion.div variants={itemVariants} className="flex gap-4 flex-col lg:flex-row">
            <div className="flex-1 min-w-0">
              {matchesLoading ? (
                <div className="flex flex-col gap-2">
                  {[...Array(4)].map((_, i) => <div key={i} className="h-12 rounded-xl bg-surface-muted animate-pulse" />)}
                </div>
              ) : (
                <Table
                  columns={columns as Parameters<typeof Table>[0]["columns"]}
                  data={filtered as Record<string, unknown>[]}
                  onRowClick={(row) => setSelectedMatch(row as unknown as MatchResult)}
                  emptyMessage="No match results found. Run matching from the Matching page first."
                />
              )}
            </div>

            {/* Detail panel */}
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
                      <div>
                        <p className="font-mono text-sm font-bold text-brand-purple">{selectedMatch.nct_id}</p>
                        <Badge variant={selectedMatch.status === "ELIGIBLE" ? "green" : selectedMatch.status === "REVIEW_NEEDED" ? "orange" : "red"}>
                          {selectedMatch.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <button onClick={() => setSelectedMatch(null)} className="p-1.5 rounded-lg hover:bg-surface-muted text-text-muted transition-colors">
                        <X size={14} />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 mb-5">
                      <div className="flex-1 h-2 rounded-full bg-surface-muted overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${selectedMatch.confidence_score * 100}%` }}
                          transition={{ duration: 0.7 }}
                          className="h-full rounded-full bg-gradient-to-r from-brand-purple to-brand-blue"
                        />
                      </div>
                      <span className="text-sm font-bold text-text-primary">
                        {Math.round(selectedMatch.confidence_score * 100)}%
                      </span>
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
