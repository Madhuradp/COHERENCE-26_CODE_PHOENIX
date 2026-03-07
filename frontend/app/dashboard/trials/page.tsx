"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FlaskConical, RefreshCw, Search, Globe, MapPin, Download, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Table";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { searchTrials, syncTrials, searchTrialsLive, type Trial } from "@/lib/api";
import { exportTrialsAsCSV } from "@/lib/csvUtils";

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

function TrialCard({ trial, index }: { trial: Trial; index: number }) {
  return (
    <motion.div
      key={trial.nct_id || trial._id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="bg-white rounded-2xl shadow-card p-5 hover:shadow-card-hover transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap mb-2">
            <span className="font-mono text-xs font-bold text-brand-purple bg-brand-purple-light px-2 py-0.5 rounded-lg">
              {trial.nct_id}
            </span>
            <Badge variant={statusVariant[trial.status || ""] || "gray"}>
              {(trial.status || "UNKNOWN").replace(/_/g, " ")}
            </Badge>
            {trial.phase && <Badge variant="purple">{trial.phase}</Badge>}
          </div>
          <h3 className="font-semibold text-text-primary text-sm leading-snug">
            {trial.title || trial.brief_title || "—"}
          </h3>
          <div className="flex flex-wrap gap-4 mt-2.5 text-xs text-text-muted">
            {trial.conditions?.[0] && (
              <span>Condition: <strong className="text-text-primary">{trial.conditions[0]}</strong></span>
            )}
            {trial.locations?.[0] && (
              <span className="flex items-center gap-1">
                <MapPin size={10} />
                <strong className="text-text-primary">{trial.locations[0].city}, {trial.locations[0].country}</strong>
              </span>
            )}
            {trial.sponsor && (
              <span>Sponsor: <strong className="text-text-primary">{trial.sponsor}</strong></span>
            )}
            {trial.enrollment && (
              <span>Enrollment: <strong className="text-text-primary">{trial.enrollment}</strong></span>
            )}
            {trial.eligibility && (
              <span>Age: <strong className="text-text-primary">{trial.eligibility.min_age ?? "?"} – {trial.eligibility.max_age ?? "?"} yrs</strong></span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function TrialsPage() {
  const [trials, setTrials] = useState<Trial[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  // Live search state
  const [liveCondition, setLiveCondition] = useState("");
  const [liveResults, setLiveResults] = useState<Trial[]>([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveSearched, setLiveSearched] = useState(false);

  // Filter state
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [phaseFilter, setPhaseFilter] = useState<string>("");
  const [minEnrollment, setMinEnrollment] = useState<number | "">("");
  const [maxEnrollment, setMaxEnrollment] = useState<number | "">("");

  // Sync parameters state
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [syncCondition, setSyncCondition] = useState("");
  const [syncPhase, setSyncPhase] = useState("");
  const [syncLimit, setSyncLimit] = useState(50);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    searchTrials({ limit: 50 })
      .then((res) => setTrials(res.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSync = async (retryWithAdjustedParams = false) => {
    // Validate condition is provided
    if (!syncCondition.trim()) {
      setSyncError("Please specify a medical condition (e.g., diabetes, cancer, hypertension)");
      return;
    }

    setSyncing(true);
    setSyncMsg(null);
    setSyncError(null);

    try {
      // Try with current parameters
      let res = await syncTrials({
        condition: syncCondition,
        phase: syncPhase || undefined,
        limit: syncLimit,
        extract_criteria: true
      });

      // If no data found, retry with broader parameters
      if (!res.success || (res.count === 0 && retryCount < 2)) {
        setRetryCount(retryCount + 1);
        setSyncMsg(`No trials found for "${syncCondition}" ${syncPhase ? `in ${syncPhase}` : ""}. Retrying with broader search...`);

        // Retry without phase filter
        if (syncPhase) {
          res = await syncTrials({
            condition: syncCondition,
            phase: undefined,
            limit: syncLimit + 20,
            extract_criteria: true
          });
        }

        // If still no results, suggest alternatives
        if (!res.success || res.count === 0) {
          setSyncError(
            `No trials found for "${syncCondition}". Try:\n` +
            "• Use different spelling (e.g., 'Type 2 Diabetes' instead of 'Diabetes')\n" +
            "• Search for broader conditions\n" +
            "• Check if trials exist in Maharashtra database"
          );
          setSyncing(false);
          return;
        }
      }

      setSyncMsg(`✓ Successfully synced ${res.count || 0} clinical trials from Maharashtra`);
      setRetryCount(0);

      // Refresh trials list
      const fresh = await searchTrials({ limit: 50 });
      setTrials(fresh.data);

      // Close modal on success
      setSyncModalOpen(false);
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : "Sync failed";
      setSyncError(`Sync failed: ${errMsg}. Please check your internet connection and try again.`);
    } finally {
      setSyncing(false);
    }
  };

  const handleLiveSearch = async () => {
    if (!liveCondition) return;
    setLiveLoading(true);
    setLiveSearched(true);
    try {
      const res = await searchTrialsLive({
        condition: liveCondition || undefined,
        location: "Maharashtra, India",
        limit: 20,
      });
      setLiveResults(res.data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Live search failed");
    } finally {
      setLiveLoading(false);
    }
  };

  const filtered = trials.filter((t) => {
    const s = search.toLowerCase();

    // Search filter
    const matchesSearch = (
      (t.title || "").toLowerCase().includes(s) ||
      (t.nct_id || "").toLowerCase().includes(s) ||
      (t.conditions?.join(" ") || "").toLowerCase().includes(s) ||
      (t.sponsor || "").toLowerCase().includes(s)
    );

    // Status filter
    const matchesStatus = !statusFilter || (t.status || "").includes(statusFilter);

    // Phase filter
    const matchesPhase = !phaseFilter || (t.phase || "").includes(phaseFilter);

    // Enrollment filter
    const enrollment = t.enrollment || 0;
    const matchesEnrollment =
      (!minEnrollment || enrollment >= minEnrollment) &&
      (!maxEnrollment || enrollment <= maxEnrollment);

    return matchesSearch && matchesStatus && matchesPhase && matchesEnrollment;
  });

  return (
    <>
      {/* Progress Bars for all loading states */}
      <ProgressBar isLoading={loading} label="Loading trials..." />
      <ProgressBar isLoading={syncing} label="Syncing clinical trials..." />
      <ProgressBar isLoading={liveLoading} label="Searching ClinicalTrials.gov..." />

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
            {trials.length} trials in database · Search live from ClinicalTrials.gov
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Button
            variant="secondary"
            size="md"
            leftIcon={<Download size={16} />}
            onClick={() => {
              if (trials.length > 0) {
                exportTrialsAsCSV(trials);
              }
            }}
          >
            Export CSV
          </Button>
          <Button
            variant="primary"
            size="md"
            leftIcon={<RefreshCw size={16} className={syncing ? "animate-spin" : ""} />}
            onClick={() => setSyncModalOpen(true)}
            loading={syncing}
          >
            Sync Clinical Trials
          </Button>
        </div>
      </motion.div>

      {/* Sync Clinical Trials Modal */}
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
            className="bg-white rounded-2xl shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-surface-border p-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-text-primary">Sync Clinical Trials from Maharashtra</h2>
                <p className="text-sm text-text-muted mt-0.5">Search and sync trials for specific medical conditions</p>
              </div>
              <button
                onClick={() => setSyncModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-surface-muted transition-colors"
              >
                <X size={18} className="text-text-muted" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              {/* Condition Input - Required */}
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-2">
                  Medical Condition <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. diabetes, cancer, hypertension, heart disease"
                  value={syncCondition}
                  onChange={(e) => setSyncCondition(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm bg-surface-muted border border-surface-border focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10 outline-none transition-all"
                  autoFocus
                />
                <p className="text-xs text-text-muted mt-1.5">Specify the disease or health condition to search for trials (required)</p>
              </div>

              {/* Phase Filter */}
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-2">Trial Phase (Optional)</label>
                <select
                  value={syncPhase}
                  onChange={(e) => setSyncPhase(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm bg-surface-muted border border-surface-border focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10 outline-none transition-all"
                >
                  <option value="">All Phases (Recommended)</option>
                  <option value="PHASE1">Phase 1 - Safety & Dosage</option>
                  <option value="PHASE2">Phase 2 - Efficacy & Side Effects</option>
                  <option value="PHASE3">Phase 3 - Efficacy & Monitoring</option>
                  <option value="PHASE4">Phase 4 - Post-Market Surveillance</option>
                </select>
                <p className="text-xs text-text-muted mt-1.5">Leave blank to search all trial phases</p>
              </div>

              {/* Limit Filter */}
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-2">Number of Trials to Sync</label>
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
                <p className="text-xs text-text-muted mt-1.5">Fetch 10-500 trials (more = slower sync, but more comprehensive)</p>
              </div>

              {/* Location Display */}
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-blue-600" />
                  <span className="text-sm font-semibold text-blue-700">📍 Maharashtra, India (Locked)</span>
                </div>
                <p className="text-xs text-blue-600 mt-1">All synced trials will be from Maharashtra only</p>
              </div>

              {/* Error Messages */}
              {syncError && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl bg-red-50 border border-red-200"
                >
                  <p className="text-sm font-semibold text-red-700 mb-2">⚠️ {syncError.split("\n")[0]}</p>
                  {syncError.includes("•") && (
                    <ul className="text-xs text-red-600 space-y-1 ml-4">
                      {syncError.split("\n").slice(1).map((line, i) => (
                        <li key={i}>{line}</li>
                      ))}
                    </ul>
                  )}
                </motion.div>
              )}

              {/* Retry Counter */}
              {retryCount > 0 && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
                  Retry attempt {retryCount}/2 - Searching with adjusted parameters...
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white border-t border-surface-border p-6 flex gap-3 justify-end">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setSyncModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => handleSync()}
                loading={syncing}
                leftIcon={<RefreshCw size={16} />}
                disabled={!syncCondition.trim()}
              >
                {syncing ? "Syncing..." : "Sync Trials"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {syncMsg && (
        <motion.div variants={itemVariants} className="px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700">
          {syncMsg}
        </motion.div>
      )}
      {error && (
        <motion.div variants={itemVariants} className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
          {error}
        </motion.div>
      )}

      {/* Live Search from ClinicalTrials.gov */}
      <motion.div variants={itemVariants}>
        <div className="bg-white rounded-2xl shadow-card p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-xl bg-brand-blue-light flex items-center justify-center">
              <Globe size={15} className="text-blue-600" />
            </div>
            <div>
              <h2 className="font-bold text-text-primary text-sm">Live Search — ClinicalTrials.gov</h2>
              <p className="text-xs text-text-muted">Search directly from the official registry in real-time</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Condition e.g. diabetes, cancer, hypertension"
                value={liveCondition}
                onChange={(e) => setLiveCondition(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLiveSearch()}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-surface-muted border border-surface-border focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10 outline-none transition-all"
              />
            </div>
            <div className="px-4 py-2.5 rounded-xl text-sm bg-blue-50 border border-blue-200 flex items-center gap-2 whitespace-nowrap">
              <MapPin size={14} className="text-blue-600" />
              <span className="text-blue-700 font-medium">Maharashtra, India</span>
            </div>
            <Button
              variant="secondary"
              size="md"
              onClick={handleLiveSearch}
              loading={liveLoading}
              leftIcon={<Globe size={14} />}
            >
              Search Live
            </Button>
          </div>

          {/* Live results */}
          {liveSearched && (
            <div className="mt-4 flex flex-col gap-3">
              {liveLoading ? (
                [...Array(3)].map((_, i) => (
                  <div key={i} className="h-20 rounded-2xl bg-surface-muted animate-pulse" />
                ))
              ) : liveResults.length === 0 ? (
                <p className="text-center text-sm text-text-muted py-6">
                  No trials found on ClinicalTrials.gov for these criteria.
                </p>
              ) : (
                <>
                  <p className="text-xs text-text-muted">
                    {liveResults.length} trials from ClinicalTrials.gov
                    {liveCondition && ` · "${liveCondition}"`}
                    · Maharashtra, India
                  </p>
                  {liveResults.map((trial, i) => (
                    <TrialCard key={trial.nct_id || i} trial={trial} index={i} />
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* Database trials */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
          <h2 className="font-bold text-text-primary text-sm">Database Trials</h2>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[250px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Filter by title, NCT ID, condition..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl text-sm bg-white border border-surface-border focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10 outline-none transition-all"
              />
            </div>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Filter size={14} />}
              onClick={() => setFilterOpen(!filterOpen)}
              className={filterOpen ? "!border-brand-purple" : ""}
            >
              Filters
            </Button>
          </div>
        </div>

        {/* Filters Panel */}
        {filterOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-4 p-4 bg-surface-muted rounded-xl border border-surface-border"
          >
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              {/* Status Filter */}
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-2 uppercase tracking-wider">
                  Trial Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm bg-white border border-surface-border focus:border-brand-purple outline-none"
                >
                  <option value="">All Status</option>
                  <option value="RECRUITING">Recruiting</option>
                  <option value="ACTIVE_NOT_RECRUITING">Active (Not Recruiting)</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="NOT_YET_RECRUITING">Not Yet Recruiting</option>
                  <option value="ENROLLING_BY_INVITATION">Enrolling by Invitation</option>
                </select>
              </div>

              {/* Phase Filter */}
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-2 uppercase tracking-wider">
                  Phase
                </label>
                <select
                  value={phaseFilter}
                  onChange={(e) => setPhaseFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm bg-white border border-surface-border focus:border-brand-purple outline-none"
                >
                  <option value="">All Phases</option>
                  <option value="Phase 1">Phase 1</option>
                  <option value="Phase 2">Phase 2</option>
                  <option value="Phase 3">Phase 3</option>
                  <option value="Phase 4">Phase 4</option>
                  <option value="N/A">Not Applicable</option>
                </select>
              </div>

              {/* Min Enrollment */}
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-2 uppercase tracking-wider">
                  Min Enrollment
                </label>
                <input
                  type="number"
                  value={minEnrollment}
                  onChange={(e) => setMinEnrollment(e.target.value ? Number(e.target.value) : "")}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-lg text-sm bg-white border border-surface-border focus:border-brand-purple outline-none"
                />
              </div>

              {/* Max Enrollment */}
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-2 uppercase tracking-wider">
                  Max Enrollment
                </label>
                <input
                  type="number"
                  value={maxEnrollment}
                  onChange={(e) => setMaxEnrollment(e.target.value ? Number(e.target.value) : "")}
                  placeholder="Any"
                  className="w-full px-3 py-2 rounded-lg text-sm bg-white border border-surface-border focus:border-brand-purple outline-none"
                />
              </div>
            </div>

            {/* Clear Filters Button */}
            {(statusFilter || phaseFilter || minEnrollment || maxEnrollment) && (
              <div className="mt-4 flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<X size={14} />}
                  onClick={() => {
                    setStatusFilter("");
                    setPhaseFilter("");
                    setMinEnrollment("");
                    setMaxEnrollment("");
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </motion.div>
        )}
        <div className="flex flex-col gap-3">
          {/* Results Summary */}
          {!loading && trials.length > 0 && (
            <div className="text-xs text-text-muted mb-2">
              Showing <span className="font-semibold text-text-primary">{filtered.length}</span> of{" "}
              <span className="font-semibold text-text-primary">{trials.length}</span> trials
            </div>
          )}

          {loading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-surface-muted animate-pulse" />
            ))
          ) : trials.length === 0 ? (
            <div className="text-center py-16 text-text-muted text-sm">
              No trials in database. Use &ldquo;Sync from ClinicalTrials.gov&rdquo; to fetch trials.
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-text-muted text-sm">
              No trials match your filters. Try adjusting your search criteria.
            </div>
          ) : (
            filtered.map((trial, i) => (
              <TrialCard key={trial._id || trial.nct_id} trial={trial} index={i} />
            ))
          )}
        </div>
      </motion.div>
      </motion.div>
    </>
  );
}
