"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GitCompare, ChevronDown, CheckCircle, Zap, Users,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Table";
import { listPatients, runMatch, type Patient, type MatchResult } from "@/lib/api";
import { useRouter } from "next/navigation";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const steps = [
  { label: "Loading patient data", icon: Users },
  { label: "Running semantic similarity", icon: Zap },
  { label: "Applying eligibility criteria", icon: CheckCircle },
  { label: "Scoring and ranking matches", icon: GitCompare },
];

export default function MatchingPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [matchResult, setMatchResult] = useState<{ patient: string; matches: MatchResult[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [patientsLoading, setPatientsLoading] = useState(true);

  useEffect(() => {
    listPatients()
      .then((res) => setPatients(res.data))
      .catch((e) => setError(e.message))
      .finally(() => setPatientsLoading(false));
  }, []);

  const handleRunMatching = async () => {
    if (!selectedPatient) return;
    setRunning(true);
    setMatchResult(null);
    setError(null);

    // Animate through steps
    for (let i = 0; i < steps.length; i++) {
      setCurrentStep(i);
      await new Promise((r) => setTimeout(r, 600));
    }

    try {
      const result = await runMatch(selectedPatient._id);
      setMatchResult(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Matching failed");
    } finally {
      setRunning(false);
      setCurrentStep(-1);
    }
  };

  const getPatientLabel = (p: any) => {
    const id = p.display_id || p._id.slice(0, 8);
    // Support both formats: new simplified and old nested
    const condition = p.primary_condition || p.conditions?.[0]?.name || "Unknown";
    const age = p.age ?? p.demographics?.age;
    return `${id} · ${condition}${age ? ` · Age ${age}` : ""}`;
  };

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
          <GitCompare size={22} className="text-brand-purple" /> Trial Matching
        </h1>
        <p className="text-sm text-text-muted mt-0.5">
          Select a patient and run AI-powered clinical trial eligibility matching
        </p>
      </motion.div>

      {error && (
        <motion.div variants={itemVariants} className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
          {error}
        </motion.div>
      )}

      {/* Patient selector */}
      <motion.div variants={itemVariants}>
        <Card>
          <h2 className="text-sm font-semibold text-text-primary mb-4">Select Patient</h2>
          {patientsLoading ? (
            <div className="space-y-2">
              <div className="h-12 rounded-xl bg-surface-muted animate-pulse" />
              <p className="text-xs text-text-muted text-center py-4">Loading patient data...</p>
            </div>
          ) : patients.length === 0 ? (
            <div className="h-12 rounded-xl border-2 border-dashed border-surface-border flex items-center justify-center text-text-muted text-sm">
              No patients found. Upload patients first.
            </div>
          ) : (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-surface-border bg-white hover:border-brand-purple focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10 transition-all text-left outline-none"
              >
                {selectedPatient ? (
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-brand-purple bg-brand-purple-light px-2 py-0.5 rounded-lg">
                      {(selectedPatient as any).display_id || selectedPatient._id.slice(0, 8)}
                    </span>
                    <span className="text-sm font-medium text-text-primary truncate">
                      {(selectedPatient as any).primary_condition || selectedPatient.conditions?.[0]?.name || "Patient"}
                      {((selectedPatient as any).age ?? selectedPatient.demographics?.age) ? ` · Age ${(selectedPatient as any).age ?? selectedPatient.demographics?.age}` : ""}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-text-muted">Select a patient...</span>
                )}
                <ChevronDown
                  size={16}
                  className={`text-text-muted transition-transform flex-shrink-0 ${dropdownOpen ? "rotate-180" : ""}`}
                />
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-surface-border shadow-glass z-20 overflow-hidden max-h-60 overflow-y-auto"
                  >
                    {patients.length === 0 ? (
                      <div className="px-4 py-8 text-center text-sm text-text-muted">
                        No patients found. Upload patients first.
                      </div>
                    ) : (
                      patients.map((p: any) => (
                        <button
                          key={p._id}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-muted transition-colors text-left border-b border-surface-border last:border-0"
                          onClick={() => {
                            setSelectedPatient(p);
                            setDropdownOpen(false);
                            setMatchResult(null);
                          }}
                        >
                          <span className="font-mono text-xs font-bold text-brand-purple bg-brand-purple-light px-2 py-0.5 rounded-lg flex-shrink-0">
                            {p.display_id || p._id.slice(0, 8)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-text-primary truncate">
                              {p.primary_condition || p.conditions?.[0]?.name || "No condition data"}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              {(p.age ?? p.demographics?.age) && (
                                <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                                  Age {p.age ?? p.demographics?.age}
                                </span>
                              )}
                              {(p.gender ?? p.demographics?.gender) && (
                                <span className="text-xs bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">
                                  {p.gender ?? p.demographics?.gender}
                                </span>
                              )}
                              {p.medications_count > 0 && (
                                <span className="text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded">
                                  {p.medications_count} meds
                                </span>
                              )}
                              {p.additional_conditions_count > 0 && (
                                <span className="text-xs bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded">
                                  +{p.additional_conditions_count} more
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </Card>
      </motion.div>

      {/* Run matching section */}
      <AnimatePresence mode="wait">
        {selectedPatient && !running && !matchResult && (
          <motion.div
            key="ready"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-text-primary">Patient Selected</h3>
                    <p className="text-xs text-text-muted mt-0.5">Ready to run AI-powered matching</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-text-muted mb-1">Patient ID</p>
                    <p className="font-mono font-bold text-brand-purple">{(selectedPatient as any).display_id || selectedPatient._id.slice(0, 8)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs text-text-muted mb-1">Condition</p>
                    <p className="text-sm font-medium text-blue-900 truncate">
                      {(selectedPatient as any).primary_condition || selectedPatient.conditions?.[0]?.name || "No data"}
                    </p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3">
                    <p className="text-xs text-text-muted mb-1">Age</p>
                    <p className="text-sm font-medium text-purple-900">
                      {((selectedPatient as any).age ?? selectedPatient.demographics?.age) ?? "N/A"}
                    </p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-xs text-text-muted mb-1">Medications</p>
                    <p className="text-sm font-medium text-green-900">
                      {(selectedPatient as any).medications_count ?? 0}
                    </p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-3">
                    <p className="text-xs text-text-muted mb-1">Lab Values</p>
                    <p className="text-sm font-medium text-orange-900">
                      {(selectedPatient as any).lab_values_count ?? 0}
                    </p>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="md"
                  className="w-full"
                  leftIcon={<Zap size={16} />}
                  onClick={handleRunMatching}
                >
                  Run 3-Tier AI Matching Pipeline
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {running && (
          <motion.div
            key="running"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            <Card>
              <h3 className="font-semibold text-text-primary text-sm mb-5">Running AI Matching Pipeline…</h3>
              <div className="flex flex-col gap-3">
                {steps.map((step, i) => {
                  const Icon = step.icon;
                  const done = i < currentStep;
                  const active = i === currentStep;
                  return (
                    <div key={i} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${active ? "bg-brand-purple-light" : done ? "bg-green-50" : "bg-surface-muted"}`}>
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${active ? "bg-brand-purple" : done ? "bg-green-500" : "bg-surface-border"}`}>
                        <Icon size={15} className={active || done ? "text-white" : "text-text-muted"} />
                      </div>
                      <span className={`text-sm font-medium ${active ? "text-brand-purple" : done ? "text-green-700" : "text-text-muted"}`}>
                        {step.label}
                      </span>
                      {active && (
                        <div className="ml-auto flex gap-1">
                          {[0, 1, 2].map((dot) => (
                            <motion.div
                              key={dot}
                              className="w-1.5 h-1.5 rounded-full bg-brand-purple"
                              animate={{ opacity: [0.3, 1, 0.3] }}
                              transition={{ duration: 0.8, repeat: Infinity, delay: dot * 0.2 }}
                            />
                          ))}
                        </div>
                      )}
                      {done && <CheckCircle size={15} className="ml-auto text-green-500 flex-shrink-0" />}
                    </div>
                  );
                })}
              </div>
            </Card>
          </motion.div>
        )}

        {matchResult && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <Card>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center flex-shrink-0">
                  <CheckCircle size={22} className="text-green-500" />
                </div>
                <div>
                  <h3 className="font-bold text-text-primary">Matching Complete</h3>
                  <p className="text-sm text-text-muted">
                    Found <strong className="text-text-primary">{matchResult.matches.length}</strong> trial matches for patient{" "}
                    <strong className="text-brand-purple">{matchResult.patient}</strong>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <Badge variant="green">{matchResult.matches.filter(m => m.status === "ELIGIBLE").length} Eligible</Badge>
                <Badge variant="orange">{matchResult.matches.filter(m => m.status === "REVIEW_NEEDED").length} Review Needed</Badge>
                <Badge variant="red">{matchResult.matches.filter(m => m.status === "INELIGIBLE").length} Ineligible</Badge>
              </div>
              <div className="flex gap-3">
                <Button variant="primary" size="md" onClick={() => router.push("/dashboard/results")}>
                  View Full Results
                </Button>
                <Button variant="secondary" size="md" onClick={() => { setMatchResult(null); setSelectedPatient(null); }}>
                  Run Another
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
