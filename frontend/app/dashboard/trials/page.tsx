"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FlaskConical, RefreshCw, Search, Globe, MapPin } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Table";
import { searchTrials, syncTrials, searchTrialsLive, type Trial } from "@/lib/api";

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
  const [liveLocation, setLiveLocation] = useState("");
  const [liveResults, setLiveResults] = useState<Trial[]>([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveSearched, setLiveSearched] = useState(false);

  useEffect(() => {
    searchTrials({ limit: 50 })
      .then((res) => setTrials(res.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await syncTrials(true);
      setSyncMsg(res.message);
      const fresh = await searchTrials({ limit: 50 });
      setTrials(fresh.data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleLiveSearch = async () => {
    if (!liveCondition && !liveLocation) return;
    setLiveLoading(true);
    setLiveSearched(true);
    try {
      const res = await searchTrialsLive({
        condition: liveCondition || undefined,
        location: liveLocation || undefined,
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
    return (
      (t.title || "").toLowerCase().includes(s) ||
      (t.nct_id || "").toLowerCase().includes(s) ||
      (t.conditions?.join(" ") || "").toLowerCase().includes(s) ||
      (t.sponsor || "").toLowerCase().includes(s)
    );
  });

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
            <FlaskConical size={22} className="text-brand-purple" /> Clinical Trials
          </h1>
          <p className="text-sm text-text-muted mt-0.5">
            {trials.length} trials in database · Search live from ClinicalTrials.gov
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          leftIcon={<RefreshCw size={16} className={syncing ? "animate-spin" : ""} />}
          onClick={handleSync}
          loading={syncing}
        >
          Sync from ClinicalTrials.gov
        </Button>
      </motion.div>

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
            <div className="relative flex-1 max-w-xs">
              <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Location e.g. Mumbai, India, United States"
                value={liveLocation}
                onChange={(e) => setLiveLocation(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLiveSearch()}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-surface-muted border border-surface-border focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10 outline-none transition-all"
              />
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
                    {liveLocation && ` · ${liveLocation}`}
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
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-text-primary text-sm">Database Trials</h2>
          <div className="relative max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Filter by title, NCT ID, condition..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl text-sm bg-white border border-surface-border focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10 outline-none transition-all"
            />
          </div>
        </div>
        <div className="flex flex-col gap-3">
          {loading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-surface-muted animate-pulse" />
            ))
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-text-muted text-sm">
              No trials in database. Use &ldquo;Sync from ClinicalTrials.gov&rdquo; to fetch trials.
            </div>
          ) : (
            filtered.map((trial, i) => (
              <TrialCard key={trial._id || trial.nct_id} trial={trial} index={i} />
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
