"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardList, Users, Star, FlaskConical, Search, CheckCircle, X, ChevronDown, Download, Clock, Zap,
} from "lucide-react";
import { StatCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Table, Badge } from "@/components/ui/Table";
import { listPatients, getMatchResults, type Patient, type MatchResult } from "@/lib/api";
import { exportMatchResultsAsCSV } from "@/lib/csvUtils";

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

interface SearchHistory {
  id: string;
  type: "sync" | "live";
  condition: string;
  phase?: string;
  timestamp: Date;
  resultCount: number;
  trials?: Array<{ nct_id: string; title: string; phase?: string; conditions?: string[]; locations?: any[] }>;
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
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [selectedHistory, setSelectedHistory] = useState<SearchHistory | null>(null);

  useEffect(() => {
    listPatients()
      .then((res) => setPatients(res.data))
      .catch((e) => setError(e.message))
      .finally(() => setPatientsLoading(false));

    // Load search history from localStorage
    const stored = localStorage.getItem("trial_search_history");
    if (stored) {
      try {
        const history = JSON.parse(stored).map((h: any) => ({
          ...h,
          timestamp: new Date(h.timestamp)
        }));
        setSearchHistory(history);
      } catch (e) {
        console.error("Failed to load search history:", e);
      }
    }
  }, []);

  const loadMatches = async (patient: Patient) => {
    setSelectedPatient(patient);
    setDropdownOpen(false);
    setMatchesLoading(true);
    setSelectedMatch(null);
    setSelectedHistory(null);
    try {
      const res = await getMatchResults(patient._id);
      setMatches(res.data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load matches");
    } finally {
      setMatchesLoading(false);
    }
  };

  const handleHistoryClick = (history: SearchHistory) => {
    setSelectedHistory(history);
    setSelectedMatch(null);
  };

  const filtered = matches.filter((m) => {
    const s = search.toLowerCase();
    const score = m.confidence_score;

    // If a history item is selected, filter by condition
    if (selectedHistory) {
      const conditionMatch = (m.conditions || []).some((c: string) =>
        c.toLowerCase().includes(selectedHistory.condition.toLowerCase())
      );
      if (!conditionMatch) return false;
    }

    return (
      score >= minScore &&
      ((m.nct_id || "").toLowerCase().includes(s) ||
        (m.status || "").toLowerCase().includes(s) ||
        (m.analysis?.summary || "").toLowerCase().includes(s) ||
        (m.title || "").toLowerCase().includes(s))
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

      {/* Search History */}
      {searchHistory.length > 0 && (
        <motion.div variants={itemVariants}>
          <div className="bg-white rounded-2xl shadow-card p-5">
            <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
              <Clock size={16} className="text-brand-purple" />
              Search History ({searchHistory.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {searchHistory.map((history) => (
                <motion.button
                  key={history.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => handleHistoryClick(history)}
                  className={`p-3 rounded-lg border transition-all text-left ${
                    selectedHistory?.id === history.id
                      ? "bg-brand-purple/10 border-brand-purple shadow-md"
                      : "bg-surface-muted border-surface-border hover:border-brand-purple"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-text-primary truncate">
                        {history.condition}
                      </p>
                      <p className="text-xs text-text-muted mt-1">
                        {history.timestamp.toLocaleString()}
                      </p>
                    </div>
                    <Badge variant={history.type === "sync" ? "green" : "blue"}>
                      {history.type === "sync" ? "🟢 Synced" : "🔵 Live"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    {history.phase && (
                      <Badge variant="purple">{history.phase}</Badge>
                    )}
                    <span className="text-text-muted font-medium">{history.resultCount} results</span>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Search History Results */}
      {selectedHistory && selectedHistory.trials && selectedHistory.trials.length > 0 && !selectedPatient && (
        <motion.div variants={itemVariants}>
          <div className="bg-white rounded-2xl shadow-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <FlaskConical size={16} className="text-brand-purple" />
                Results for "{selectedHistory.condition}"
                {selectedHistory.trials.length > 0 && (
                  <span className="text-xs font-normal text-text-muted">({selectedHistory.trials.length})</span>
                )}
              </h2>
              <button
                onClick={() => setSelectedHistory(null)}
                className="p-1.5 rounded-lg hover:bg-surface-muted text-text-muted transition-colors"
              >
                <X size={14} />
              </button>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {selectedHistory.trials.map((trial) => (
                <motion.div
                  key={trial.nct_id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-3 rounded-lg bg-surface-muted border border-surface-border hover:border-brand-purple transition-all cursor-pointer"
                >
                  <p className="font-mono text-xs font-bold text-brand-purple mb-1">{trial.nct_id}</p>
                  <p className="text-sm font-medium text-text-primary mb-1 line-clamp-2">{trial.title}</p>
                  <div className="flex flex-wrap gap-2 items-center">
                    {trial.phase && <Badge variant="blue">{trial.phase}</Badge>}
                    {(trial.conditions || []).slice(0, 1).map((c) => (
                      <Badge key={c} variant="purple">{c}</Badge>
                    ))}
                    {trial.locations && trial.locations.length > 0 && (
                      <span className="text-xs text-text-muted">📍 {trial.locations.length} locations</span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
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
          {selectedHistory && (
            <motion.div
              variants={itemVariants}
              className="p-3 rounded-lg bg-brand-purple/5 border border-brand-purple/20 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-text-primary">
                  Filtering by: <span className="font-semibold text-brand-purple">{selectedHistory.condition}</span>
                </span>
                {selectedHistory.phase && (
                  <Badge variant="purple">{selectedHistory.phase}</Badge>
                )}
              </div>
              <button
                onClick={() => setSelectedHistory(null)}
                className="p-1 rounded hover:bg-brand-purple/10 text-text-muted hover:text-text-primary transition-colors"
              >
                <X size={16} />
              </button>
            </motion.div>
          )}

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
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Download size={14} />}
              onClick={() => {
                if (selectedPatient && filtered.length > 0) {
                  exportMatchResultsAsCSV(
                    {
                      display_id: selectedPatient.display_id || selectedPatient._id,
                      age: selectedPatient.demographics?.age,
                      gender: selectedPatient.demographics?.gender,
                      primary_condition: selectedPatient.conditions?.[0]?.name || "Unknown",
                      medications_count: selectedPatient.medications?.length || 0,
                      lab_values_count: selectedPatient.lab_values?.length || 0,
                    },
                    filtered.map(m => ({
                      nct_id: m.nct_id,
                      title: m.title || "",
                      status: m.status,
                      confidence_score: m.confidence_score,
                      distance_km: m.distance_km || 0,
                      explanation: m.explanation || m.analysis?.summary || "",
                    } as any))
                  );
                }
              }}
            >
              Export CSV
            </Button>
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
                  data={filtered as unknown as Record<string, unknown>[]}
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

                    {/* Overall Eligibility Status */}
                    {(selectedMatch as any).overall_eligibility && (
                      <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
                        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1">Overall Eligibility</p>
                        <p className="text-sm font-bold text-blue-900">{(selectedMatch as any).overall_eligibility}</p>
                      </div>
                    )}

                    {/* Explanation */}
                    {(selectedMatch as any).explanation && (
                      <p className="text-xs text-text-muted mb-4 leading-relaxed">{(selectedMatch as any).explanation}</p>
                    )}

                    {selectedMatch.analysis?.summary && (
                      <p className="text-xs text-text-muted mb-4 leading-relaxed">{selectedMatch.analysis.summary}</p>
                    )}

                    {/* Inclusion Criteria Breakdown */}
                    {(selectedMatch as any).inclusion_criteria && (selectedMatch as any).inclusion_criteria.length > 0 && (
                      <div className="mb-4 border-t border-surface-border pt-3">
                        <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-2">✓ Inclusion Criteria</p>
                        <div className="flex flex-col gap-2">
                          {(selectedMatch as any).inclusion_criteria.map((criterion: any, i: number) => (
                            <div key={i} className="bg-emerald-50 rounded p-2 border-l-2 border-emerald-500">
                              <p className="text-xs font-medium text-text-primary">{criterion.criterion}</p>
                              {criterion.patient_value && (
                                <p className="text-xs text-text-muted mt-0.5">Patient: {criterion.patient_value}</p>
                              )}
                              <div className="mt-1">
                                <Badge variant={criterion.status === "MET" ? "green" : "orange"}>
                                  {criterion.status}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Exclusion Criteria Breakdown */}
                    {(selectedMatch as any).exclusion_criteria && (selectedMatch as any).exclusion_criteria.length > 0 && (
                      <div className="mb-4 border-t border-surface-border pt-3">
                        <p className="text-xs font-semibold text-orange-600 uppercase tracking-wider mb-2">✗ Exclusion Criteria</p>
                        <div className="flex flex-col gap-2">
                          {(selectedMatch as any).exclusion_criteria.map((criterion: any, i: number) => (
                            <div key={i} className="bg-orange-50 rounded p-2 border-l-2 border-orange-500">
                              <p className="text-xs font-medium text-text-primary">{criterion.criterion}</p>
                              {criterion.patient_has !== undefined && (
                                <p className="text-xs text-text-muted mt-0.5">
                                  {criterion.patient_has ? "Patient has this" : "Patient does not have this"}
                                </p>
                              )}
                              <div className="mt-1">
                                <Badge variant={criterion.status === "NOT_EXCLUDED" ? "green" : "red"}>
                                  {criterion.status}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Patient-Trial Mapping Analysis */}
                    {(selectedMatch as any).mapping_analysis && (
                      <div className="border-t border-surface-border pt-3">
                        <p className="text-xs font-semibold text-brand-purple uppercase tracking-wider mb-2">📊 Mapping Analysis</p>
                        <p className="text-xs text-text-muted leading-relaxed">{(selectedMatch as any).mapping_analysis}</p>
                      </div>
                    )}

                    {(selectedMatch.analysis?.criteria_met?.length ?? 0) > 0 && (
                      <div className="mb-3 border-t border-surface-border pt-3">
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
                      <div className="mb-3 border-t border-surface-border pt-3">
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
                      <div className="border-t border-surface-border pt-3">
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
