"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GitCompare, ChevronDown, CheckCircle, Zap, Users, AlertCircle, Check, X, Play,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Table";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { listPatients, searchTrials, type Patient, type Trial } from "@/lib/api";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

interface MatchData {
  patient: Patient;
  trial: Trial;
  status: "ELIGIBLE" | "REVIEW_NEEDED" | "INELIGIBLE";
  reasons: {
    matched: string[];
    notMatched: string[];
  };
  expanded: boolean;
}

export default function MatchingPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [trials, setTrials] = useState<Trial[]>([]);
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [trialsLoading, setTrialsLoading] = useState(true);
  const [expandedMatches, setExpandedMatches] = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([
      listPatients()
        .then((res) => {
          setPatients(res.data || []);
          setPatientsLoading(false);
        })
        .catch((e) => {
          setError(e.message);
          setPatientsLoading(false);
        }),
      searchTrials({ limit: 100 })
        .then((res) => {
          setTrials(res.data || []);
          setTrialsLoading(false);
        })
        .catch((e) => {
          setError(e.message);
          setTrialsLoading(false);
        }),
    ]);
  }, []);

  const performMatching = (patient: Patient, trial: Trial): MatchData => {
    const patientAge = (patient as any).age ?? patient.demographics?.age ?? 0;
    const patientCondition = ((patient as any).primary_condition || patient.conditions?.[0]?.name || "").toLowerCase();
    const patientGender = (patient as any).gender ?? patient.demographics?.gender;

    const trialMinAge = trial.eligibility?.min_age ?? 0;
    const trialMaxAge = trial.eligibility?.max_age ?? 150;
    const trialConditions = (trial.conditions || []).map(c => c.toLowerCase());
    const trialGender = trial.eligibility?.gender?.toLowerCase();

    const matched: string[] = [];
    const notMatched: string[] = [];
    let eligibleCount = 0;
    let excludedCount = 0;

    // Check age
    if (patientAge >= trialMinAge && patientAge <= trialMaxAge) {
      matched.push(`✓ Age ${patientAge} within range (${trialMinAge}-${trialMaxAge})`);
      eligibleCount++;
    } else {
      notMatched.push(`✗ Age ${patientAge} outside trial range (${trialMinAge}-${trialMaxAge})`);
      excludedCount++;
    }

    // Check condition match
    if (trialConditions.length > 0) {
      const conditionMatches = trialConditions.some(tc => patientCondition.includes(tc) || tc.includes(patientCondition));
      if (conditionMatches) {
        matched.push(`✓ Condition "${patientCondition}" matches trial focus`);
        eligibleCount++;
      } else {
        notMatched.push(`✗ Condition "${patientCondition}" doesn't match trial conditions: ${trialConditions.join(", ")}`);
        excludedCount++;
      }
    }

    // Check gender
    if (trialGender && trialGender !== "all") {
      if (patientGender && patientGender.toLowerCase().startsWith(trialGender[0])) {
        matched.push(`✓ Gender matches trial requirement (${trialGender})`);
        eligibleCount++;
      } else if (patientGender) {
        notMatched.push(`✗ Gender "${patientGender}" doesn't match trial requirement (${trialGender})`);
        excludedCount++;
      }
    }

    // Check recruiting status
    if (trial.status === "RECRUITING") {
      matched.push(`✓ Trial is actively recruiting`);
      eligibleCount++;
    } else {
      notMatched.push(`✗ Trial status is "${trial.status}" (not actively recruiting)`);
      excludedCount++;
    }

    // Determine status
    let status: "ELIGIBLE" | "REVIEW_NEEDED" | "INELIGIBLE" = "INELIGIBLE";
    if (excludedCount === 0 && eligibleCount >= 3) {
      status = "ELIGIBLE";
    } else if (excludedCount === 0 && eligibleCount >= 1) {
      status = "REVIEW_NEEDED";
    }

    return {
      patient,
      trial,
      status,
      reasons: { matched, notMatched },
      expanded: false,
    };
  };

  const handleRunMatching = async () => {
    setRunning(true);
    setError(null);
    setMatches([]);
    setExpandedMatches(new Set());

    try {
      // Create matches for all patient-trial combinations
      const allMatches: MatchData[] = [];
      for (const patient of patients) {
        for (const trial of trials) {
          const match = performMatching(patient, trial);
          allMatches.push(match);
        }
      }

      // Sort by status: ELIGIBLE > REVIEW_NEEDED > INELIGIBLE
      allMatches.sort((a, b) => {
        const statusOrder = { ELIGIBLE: 0, REVIEW_NEEDED: 1, INELIGIBLE: 2 };
        return statusOrder[a.status] - statusOrder[b.status];
      });

      setMatches(allMatches);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Matching failed");
    } finally {
      setRunning(false);
    }
  };

  const toggleMatch = (key: string) => {
    const newExpanded = new Set(expandedMatches);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedMatches(newExpanded);
  };

  const getStatusColor = (status: string): "green" | "orange" | "red" => {
    if (status === "ELIGIBLE") return "green";
    if (status === "REVIEW_NEEDED") return "orange";
    return "red";
  };

  const getStatusLabel = (status: string): string => {
    if (status === "ELIGIBLE") return "✓ Eligible";
    if (status === "REVIEW_NEEDED") return "⚠ Review Needed";
    return "✗ Ineligible";
  };

  const stats = {
    eligible: matches.filter(m => m.status === "ELIGIBLE").length,
    reviewNeeded: matches.filter(m => m.status === "REVIEW_NEEDED").length,
    ineligible: matches.filter(m => m.status === "INELIGIBLE").length,
  };

  return (
    <>
      <ProgressBar isLoading={patientsLoading || trialsLoading} label="Loading data..." />
      <ProgressBar isLoading={running} label="Running trial matching for all patients..." />
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-6"
      >
        {/* Header */}
        <motion.div variants={itemVariants}>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <GitCompare size={22} className="text-brand-purple" /> Clinical Trial Matching
          </h1>
          <p className="text-sm text-text-muted mt-0.5">
            Find suitable clinical trials for all patients and review why each matches or doesn't match
          </p>
        </motion.div>

        {error && (
          <motion.div variants={itemVariants} className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
            {error}
          </motion.div>
        )}

        {/* Data Overview */}
        {!running && matches.length === 0 && (
          <motion.div variants={itemVariants}>
            <Card>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <p className="text-xs text-text-muted mb-1">Available Patients</p>
                  <p className="text-2xl font-bold text-blue-600">{patients.length}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <p className="text-xs text-text-muted mb-1">Available Trials</p>
                  <p className="text-2xl font-bold text-purple-600">{trials.length}</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                  <p className="text-xs text-text-muted mb-1">Possible Matches</p>
                  <p className="text-2xl font-bold text-amber-600">{patients.length * trials.length}</p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-text-primary text-sm">Bulk Trial Matching</h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    Run matching analysis for all {patients.length} patients against all {trials.length} clinical trials
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="md"
                  leftIcon={<Play size={16} />}
                  onClick={handleRunMatching}
                  disabled={patients.length === 0 || trials.length === 0}
                >
                  Run Matching
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Results Summary */}
        {matches.length > 0 && (
          <motion.div variants={itemVariants}>
            <Card>
              <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
                <div>
                  <h3 className="font-semibold text-text-primary">Matching Complete</h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    Analyzed {matches.length} patient-trial combinations
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => {
                    setMatches([]);
                    setExpandedMatches(new Set());
                  }}
                >
                  Run New Matching
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <p className="text-xs text-text-muted mb-1">✓ Eligible</p>
                  <p className="text-2xl font-bold text-green-600">{stats.eligible}</p>
                  <p className="text-xs text-green-700 mt-1">Perfect matches</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                  <p className="text-xs text-text-muted mb-1">⚠ Review Needed</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.reviewNeeded}</p>
                  <p className="text-xs text-orange-700 mt-1">Potential matches</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <p className="text-xs text-text-muted mb-1">✗ Ineligible</p>
                  <p className="text-2xl font-bold text-red-600">{stats.ineligible}</p>
                  <p className="text-xs text-red-700 mt-1">No match</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Match Results */}
        {matches.length > 0 && (
          <motion.div variants={itemVariants} className="flex flex-col gap-3">
            {matches.map((match, idx) => {
              const key = `${match.patient._id}-${match.trial.nct_id}`;
              const isExpanded = expandedMatches.has(key);

              return (
                <motion.div
                  key={key}
                  variants={itemVariants}
                  className="bg-white rounded-2xl shadow-card overflow-hidden"
                >
                  {/* Match Header */}
                  <button
                    onClick={() => toggleMatch(key)}
                    className="w-full text-left p-5 hover:bg-surface-muted/50 transition-colors border-b border-surface-border"
                  >
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          {/* Patient Info */}
                          <span className="inline-flex items-center gap-1 text-xs">
                            <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                              {(match.patient as any).display_id || match.patient._id.slice(0, 6)}
                            </span>
                            <span className="text-text-muted">•</span>
                            <span className="text-sm text-text-primary font-medium max-w-xs truncate">
                              {(match.patient as any).primary_condition || match.patient.conditions?.[0]?.name || "Patient"}
                            </span>
                          </span>

                          {/* Matches Trial */}
                          <span className="text-text-muted text-xs">↔</span>

                          {/* Trial Info */}
                          <span className="inline-flex items-center gap-1 text-xs">
                            <span className="font-mono font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                              {match.trial.nct_id}
                            </span>
                            <Badge variant={getStatusColor(match.status)}>
                              {getStatusLabel(match.status)}
                            </Badge>
                          </span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap mt-1">
                          <p className="text-xs text-text-primary line-clamp-1">
                            {match.trial.title || match.trial.brief_title || "Clinical Trial"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs font-bold text-text-primary">
                          {match.reasons.matched.length}/{match.reasons.matched.length + match.reasons.notMatched.length}
                        </span>
                        <ChevronDown
                          size={16}
                          className={`text-text-muted transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        />
                      </div>
                    </div>
                  </button>

                  {/* Expanded Details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 py-4 border-t border-surface-border space-y-4">
                          {/* Patient Info */}
                          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                            <p className="text-xs font-semibold text-blue-900 mb-2">Patient Information</p>
                            <div className="space-y-1 text-xs text-blue-800">
                              <p>
                                <strong>Age:</strong> {(match.patient as any).age ?? match.patient.demographics?.age ?? "N/A"} years
                              </p>
                              <p>
                                <strong>Gender:</strong> {(match.patient as any).gender ?? match.patient.demographics?.gender ?? "N/A"}
                              </p>
                              <p>
                                <strong>Condition:</strong> {(match.patient as any).primary_condition || match.patient.conditions?.[0]?.name || "Unknown"}
                              </p>
                            </div>
                          </div>

                          {/* Trial Info */}
                          <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                            <p className="text-xs font-semibold text-purple-900 mb-2">Trial Information</p>
                            <div className="space-y-1 text-xs text-purple-800">
                              <p>
                                <strong>Phase:</strong> {match.trial.phase || "N/A"}
                              </p>
                              <p>
                                <strong>Status:</strong> {match.trial.status || "Unknown"}
                              </p>
                              <p>
                                <strong>Age Range:</strong> {match.trial.eligibility?.min_age || "Any"} - {match.trial.eligibility?.max_age || "Any"}
                              </p>
                              {match.trial.enrollment && (
                                <p>
                                  <strong>Enrollment:</strong> {match.trial.enrollment}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Why It Matches */}
                          {match.reasons.matched.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-text-primary mb-2 flex items-center gap-2">
                                <Check size={14} className="text-green-600" />
                                Why This Matches
                              </p>
                              <div className="space-y-2 ml-6">
                                {match.reasons.matched.map((reason, i) => (
                                  <div
                                    key={i}
                                    className="text-xs p-2.5 rounded-lg bg-green-50 border border-green-200 text-green-800 flex items-start gap-2"
                                  >
                                    <Check size={12} className="text-green-600 flex-shrink-0 mt-0.5" />
                                    <span>{reason}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Why It Doesn't Match */}
                          {match.reasons.notMatched.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-text-primary mb-2 flex items-center gap-2">
                                <AlertCircle size={14} className="text-red-600" />
                                Why It Doesn't Match
                              </p>
                              <div className="space-y-2 ml-6">
                                {match.reasons.notMatched.map((reason, i) => (
                                  <div
                                    key={i}
                                    className="text-xs p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-800 flex items-start gap-2"
                                  >
                                    <X size={12} className="text-red-600 flex-shrink-0 mt-0.5" />
                                    <span>{reason}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* Empty State */}
        {!running && matches.length === 0 && !patientsLoading && !trialsLoading && (
          <motion.div variants={itemVariants}>
            <Card>
              <div className="text-center py-12">
                {patients.length === 0 || trials.length === 0 ? (
                  <>
                    <AlertCircle size={40} className="text-text-muted/30 mx-auto mb-3" />
                    <p className="text-sm text-text-muted">
                      {patients.length === 0 ? "No patients found. Please upload patients first." : "No trials found. Please sync clinical trials first."}
                    </p>
                  </>
                ) : (
                  <>
                    <GitCompare size={40} className="text-text-muted/30 mx-auto mb-3" />
                    <p className="text-sm text-text-muted">Run matching to see results</p>
                  </>
                )}
              </div>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </>
  );
}
