"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FlaskConical, RefreshCw, Search, Globe, Download, X, Clock, Zap, FileText, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Table";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { searchTrials, syncTrials, searchTrialsLive, listPatients, type Trial, type Patient } from "@/lib/api";
import { exportTrialsAsCSV } from "@/lib/csvUtils";

interface SearchSession {
  id: string;
  type: "sync" | "live";
  condition: string;
  phase?: string;
  timestamp: Date;
  results: Trial[];
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const statusVariant: Record<string, "green" | "blue" | "gray" | "orange"> = {
  RECRUITING: "green",
  ACTIVE_NOT_RECRUITING: "blue",
  COMPLETED: "gray",
  NOT_YET_RECRUITING: "orange",
  ENROLLING_BY_INVITATION: "blue",
};

function TrialResultCard({
  trial,
  index,
  onCheckMatches
}: {
  trial: Trial;
  index: number;
  onCheckMatches?: (trial: Trial) => void;
}) {
  const [expandedEligibility, setExpandedEligibility] = useState(false);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const hasEligibility = trial.eligibility?.raw_text;

  return (
    <motion.div
      key={trial.nct_id || trial._id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
      className="bg-white rounded-xl shadow-sm border border-surface-border p-4 hover:shadow-md hover:border-brand-purple transition-all duration-200"
    >
      <div className="flex flex-col gap-3">
        {/* Trial Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-mono text-xs font-bold text-brand-purple bg-brand-purple-light px-2 py-0.5 rounded">
                {trial.nct_id}
              </span>
              <Badge variant={statusVariant[trial.status || ""] || "gray"}>
                {(trial.status || "UNKNOWN").replace(/_/g, " ")}
              </Badge>
              {trial.phase && <Badge variant="purple">{trial.phase}</Badge>}
            </div>

            <h4 className="font-semibold text-text-primary text-sm leading-snug">
              {trial.title || trial.brief_title || "—"}
            </h4>
          </div>
        </div>

        {/* Trial Details Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {trial.conditions?.[0] && (
            <div className="bg-surface-muted p-2 rounded">
              <span className="text-text-muted block font-semibold">Condition</span>
              <span className="text-text-primary">{trial.conditions[0]}</span>
            </div>
          )}
          {trial.locations?.[0] && (
            <div className="bg-surface-muted p-2 rounded">
              <span className="text-text-muted block font-semibold">Location</span>
              <span className="text-text-primary">{trial.locations[0].city}</span>
            </div>
          )}
          {trial.enrollment && (
            <div className="bg-surface-muted p-2 rounded">
              <span className="text-text-muted block font-semibold">Enrollment</span>
              <span className="text-text-primary">{trial.enrollment}</span>
            </div>
          )}
          {trial.eligibility && (
            <div className="bg-surface-muted p-2 rounded">
              <span className="text-text-muted block font-semibold">Age Range</span>
              <span className="text-text-primary">{trial.eligibility.min_age ?? "?"} – {trial.eligibility.max_age ?? "?"}</span>
            </div>
          )}
        </div>

        {/* Eligibility Section */}
        {hasEligibility && (
          <div className="border-t border-surface-border pt-2">
            <button
              type="button"
              onClick={() => setExpandedEligibility(!expandedEligibility)}
              className="flex items-center gap-2 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
            >
              <FileText size={12} />
              <span>Criteria</span>
              <span className={`transform transition-transform duration-200 ${expandedEligibility ? 'rotate-180' : ''}`}>▼</span>
            </button>
            {expandedEligibility && trial.eligibility?.raw_text && (
              <div className="mt-2 p-3 rounded bg-blue-50 border border-blue-200 max-h-[200px] overflow-y-auto">
                <p className="text-xs text-blue-900 font-mono whitespace-pre-wrap break-words">
                  {trial.eligibility.raw_text
                    .split('\n')
                    .filter((line: string) => line.trim().length > 0)
                    .slice(0, 10)
                    .join('\n')}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Action Button */}
        {onCheckMatches && (
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Users size={12} />}
            onClick={() => {
              setLoadingMatches(true);
              onCheckMatches(trial);
            }}
            loading={loadingMatches}
            className="w-full text-xs"
          >
            Check Patient Matches
          </Button>
        )}
      </div>
    </motion.div>
  );
}

export default function TrialsPage() {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  // Live search state
  const [liveCondition, setLiveCondition] = useState("");
  const [livePhase, setLivePhase] = useState("");
  const [liveLoading, setLiveLoading] = useState(false);

  // Search sessions
  const [searchSessions, setSearchSessions] = useState<SearchSession[]>([]);
  const [allTrials, setAllTrials] = useState<Trial[]>([]);

  // Patient matching
  const [selectedTrial, setSelectedTrial] = useState<Trial | null>(null);
  const [matchingPatients, setMatchingPatients] = useState<Patient[]>([]);
  const [showMatchingModal, setShowMatchingModal] = useState(false);
  const [matchingLoading, setMatchingLoading] = useState(false);

  // Sync parameters state
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [syncCondition, setSyncCondition] = useState("");
  const [syncPhase, setSyncPhase] = useState("");
  const [syncLimit, setSyncLimit] = useState(50);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    setLoading(false);
  }, []);

  const handleSync = async () => {
    if (!syncCondition.trim()) {
      setSyncError("Please specify a medical condition");
      return;
    }

    setSyncing(true);
    setSyncMsg(null);
    setSyncError(null);

    try {
      let res = await syncTrials({
        condition: syncCondition,
        phase: syncPhase || undefined,
        limit: syncLimit,
        extract_criteria: true
      });

      if (!res.success || (res.count === 0 && retryCount < 2)) {
        setRetryCount(retryCount + 1);
        setSyncMsg(`Retrying with broader search...`);

        if (syncPhase) {
          res = await syncTrials({
            condition: syncCondition,
            phase: undefined,
            limit: syncLimit + 20,
            extract_criteria: true
          });
        }

        if (!res.success || res.count === 0) {
          setSyncError(`No trials found for "${syncCondition}".`);
          setSyncing(false);
          return;
        }
      }

      // Fetch synced trials
      const trialsRes = await searchTrials({
        condition: syncCondition,
        phase: syncPhase || undefined,
        limit: syncLimit
      });

      const newSession: SearchSession = {
        id: Date.now().toString(),
        type: "sync",
        condition: syncCondition,
        phase: syncPhase || undefined,
        timestamp: new Date(),
        results: trialsRes.data || [],
      };

      setSearchSessions((prev) => [newSession, ...prev]);
      setAllTrials((prev) => [...(trialsRes.data || []), ...prev]);

      setSyncMsg(`✓ Synced ${res.count || 0} trials`);
      setRetryCount(0);
      setSyncCondition("");
      setSyncPhase("");
      setSyncModalOpen(false);
    } catch (e: unknown) {
      setSyncError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleLiveSearch = async () => {
    if (!liveCondition.trim()) return;
    setLiveLoading(true);

    try {
      const res = await searchTrialsLive({
        condition: liveCondition,
        phase: livePhase || undefined,
        limit: 20,
      });

      const newSession: SearchSession = {
        id: Date.now().toString(),
        type: "live",
        condition: liveCondition,
        phase: livePhase || undefined,
        timestamp: new Date(),
        results: res.data,
      };

      setSearchSessions((prev) => [newSession, ...prev]);
      setAllTrials((prev) => [...res.data, ...prev]);

      setLiveCondition("");
      setLivePhase("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Live search failed");
    } finally {
      setLiveLoading(false);
    }
  };

  const handleCheckPatientMatches = async (trial: Trial) => {
    setSelectedTrial(trial);
    setShowMatchingModal(true);
    setMatchingLoading(true);

    try {
      const res = await listPatients();
      // Filter patients by condition match
      const matchedPatients = res.data.filter(patient => {
        const patientConditions = patient.conditions?.map(c => c.name.toLowerCase()) || [];
        const trialConditions = trial.conditions?.map(c => c.toLowerCase()) || [];
        return trialConditions.some(tc => patientConditions.some(pc => pc.includes(tc) || tc.includes(pc)));
      });
      setMatchingPatients(matchedPatients.length > 0 ? matchedPatients : res.data.slice(0, 10));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load patients");
    } finally {
      setMatchingLoading(false);
    }
  };

  return (
    <>
      <ProgressBar isLoading={loading} label="Loading..." />
      <ProgressBar isLoading={syncing} label="Syncing trials..." />
      <ProgressBar isLoading={liveLoading} label="Searching..." />

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
              <FlaskConical size={22} className="text-brand-purple" /> Clinical Trials
            </h1>
            <p className="text-sm text-text-muted mt-0.5">
              {allTrials.length} trials total · Search, sync & match with patients
            </p>
          </div>
          <Button
            variant="primary"
            size="md"
            leftIcon={<RefreshCw size={16} className={syncing ? "animate-spin" : ""} />}
            onClick={() => setSyncModalOpen(true)}
            loading={syncing}
          >
            Sync Trials
          </Button>
        </motion.div>

        {/* Sync Modal */}
        {syncModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white border-b border-surface-border p-6 flex items-center justify-between">
                <h2 className="text-lg font-bold text-text-primary">Sync Clinical Trials</h2>
                <button
                  onClick={() => setSyncModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-surface-muted transition-colors"
                >
                  <X size={18} className="text-text-muted" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-2">
                    Medical Condition <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., diabetes, cancer, hypertension"
                    value={syncCondition}
                    onChange={(e) => setSyncCondition(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl text-sm bg-surface-muted border border-surface-border focus:border-brand-purple outline-none"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-2">Phase (Optional)</label>
                  <select
                    value={syncPhase}
                    onChange={(e) => setSyncPhase(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl text-sm bg-surface-muted border border-surface-border focus:border-brand-purple outline-none"
                  >
                    <option value="">All Phases</option>
                    <option value="PHASE1">Phase 1</option>
                    <option value="PHASE2">Phase 2</option>
                    <option value="PHASE3">Phase 3</option>
                    <option value="PHASE4">Phase 4</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-2">Number of Trials</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="10"
                      max="500"
                      step="10"
                      value={syncLimit}
                      onChange={(e) => setSyncLimit(Number(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-sm font-bold text-brand-purple bg-brand-purple-light px-3 py-1.5 rounded-lg min-w-[60px] text-center">
                      {syncLimit}
                    </span>
                  </div>
                </div>

                {syncError && (
                  <motion.div className="p-4 rounded-xl bg-red-50 border border-red-200">
                    <p className="text-sm font-semibold text-red-700">{syncError}</p>
                  </motion.div>
                )}
              </div>

              <div className="sticky bottom-0 bg-white border-t border-surface-border p-6 flex gap-3 justify-end">
                <Button variant="secondary" size="md" onClick={() => setSyncModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => handleSync()}
                  loading={syncing}
                  disabled={!syncCondition.trim()}
                >
                  Sync
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {syncMsg && (
          <motion.div variants={itemVariants} className="px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700 flex items-start gap-2">
            <span>✓</span>
            <span>{syncMsg}</span>
          </motion.div>
        )}
        {error && (
          <motion.div variants={itemVariants} className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
            {error}
          </motion.div>
        )}

        {/* Live Search */}
        <motion.div variants={itemVariants}>
          <div className="bg-white rounded-2xl shadow-card p-5 border border-surface-border">
            <div className="flex items-center gap-2.5 mb-4">
              <Zap size={16} className="text-blue-600" />
              <h2 className="font-bold text-text-primary text-sm">Live Search</h2>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search condition..."
                  value={liveCondition}
                  onChange={(e) => setLiveCondition(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLiveSearch()}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-surface-muted border border-surface-border focus:border-brand-purple outline-none"
                />
              </div>

              <select
                value={livePhase}
                onChange={(e) => setLivePhase(e.target.value)}
                className="px-4 py-2.5 rounded-xl text-sm bg-surface-muted border border-surface-border focus:border-brand-purple outline-none"
              >
                <option value="">All Phases</option>
                <option value="PHASE1">Phase 1</option>
                <option value="PHASE2">Phase 2</option>
                <option value="PHASE3">Phase 3</option>
                <option value="PHASE4">Phase 4</option>
              </select>

              <Button
                variant="primary"
                size="md"
                onClick={handleLiveSearch}
                loading={liveLoading}
                leftIcon={<Globe size={14} />}
                disabled={!liveCondition.trim()}
              >
                Search
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Search History */}
        {searchSessions.length > 0 && (
          <motion.div variants={itemVariants}>
            <div className="bg-white rounded-2xl shadow-card p-5 border border-surface-border">
              <h3 className="font-bold text-text-primary text-sm mb-3 flex items-center gap-2">
                <Clock size={16} className="text-brand-purple" />
                Search History ({searchSessions.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {searchSessions.map((session) => (
                  <div
                    key={session.id}
                    className="px-3 py-2 rounded-lg bg-surface-muted border border-surface-border text-xs flex items-center gap-2"
                  >
                    <span className={`w-2 h-2 rounded-full ${session.type === "sync" ? "bg-green-500" : "bg-blue-500"}`} />
                    <span className="font-semibold">{session.condition}</span>
                    {session.phase && <Badge variant="purple">{session.phase}</Badge>}
                    <span className="text-text-muted">({session.results.length})</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Results */}
        <motion.div variants={itemVariants}>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="font-bold text-text-primary text-sm flex items-center gap-2">
              <FileText size={16} className="text-brand-purple" />
              Clinical Trial Results ({allTrials.length})
            </h2>
            {allTrials.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Download size={14} />}
                onClick={() => exportTrialsAsCSV(allTrials)}
              >
                Export All CSV
              </Button>
            )}
          </div>

          {allTrials.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-surface-border">
              <FlaskConical size={48} className="text-text-muted mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold text-text-primary mb-2">No trials yet</h3>
              <p className="text-sm text-text-muted">Sync or search to see results</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {allTrials.map((trial, i) => (
                <TrialResultCard
                  key={trial.nct_id || i}
                  trial={trial}
                  index={i}
                  onCheckMatches={handleCheckPatientMatches}
                />
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Patient Matching Modal */}
      <AnimatePresence>
        {showMatchingModal && selectedTrial && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white border-b border-surface-border p-6 flex items-center justify-between">
                <div>
                  <p className="font-mono text-sm font-bold text-brand-purple">{selectedTrial.nct_id}</p>
                  <h2 className="text-lg font-bold text-text-primary mt-1">{selectedTrial.title || selectedTrial.brief_title}</h2>
                  <p className="text-sm text-text-muted mt-1">Matching Eligible Patients</p>
                </div>
                <button
                  onClick={() => setShowMatchingModal(false)}
                  className="p-1.5 rounded-lg hover:bg-surface-muted transition-colors"
                >
                  <X size={20} className="text-text-muted" />
                </button>
              </div>

              <div className="p-6">
                {matchingLoading ? (
                  <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-16 rounded-lg bg-surface-muted animate-pulse" />
                    ))}
                  </div>
                ) : matchingPatients.length === 0 ? (
                  <div className="text-center py-8 text-text-muted">
                    <Users size={32} className="mx-auto mb-2 opacity-50" />
                    <p>No matching patients found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {matchingPatients.map((patient) => (
                      <motion.div
                        key={patient._id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-lg bg-surface-muted border border-surface-border hover:border-brand-purple transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="flex-1">
                            <p className="font-semibold text-text-primary">
                              {patient.display_id || patient._id.slice(0, 8)}
                            </p>
                            <p className="text-xs text-text-muted mt-1">
                              {patient.conditions?.[0]?.name && `Condition: ${patient.conditions[0].name}`}
                              {patient.demographics?.age && ` • Age: ${patient.demographics.age}`}
                              {patient.demographics?.gender && ` • Gender: ${patient.demographics.gender}`}
                            </p>
                            {patient.medications && patient.medications.length > 0 && (
                              <p className="text-xs text-text-muted mt-1">
                                Medications: {patient.medications.length}
                              </p>
                            )}
                          </div>
                          <Badge variant="green">Eligible</Badge>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
