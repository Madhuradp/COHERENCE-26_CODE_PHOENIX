"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FlaskConical, Search, ChevronRight, CheckCircle,
  Clock, PauseCircle, XCircle, MoreHorizontal, Eye, ShieldCheck,
} from "lucide-react";
import { Card, StatCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { adminTrials } from "@/lib/adminMockData";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const trialStatusConfig = {
  active: { color: "green" as const, icon: CheckCircle, label: "Active" },
  pending: { color: "orange" as const, icon: Clock, label: "Pending" },
  paused: { color: "gray" as const, icon: PauseCircle, label: "Paused" },
  closed: { color: "red" as const, icon: XCircle, label: "Closed" },
};

const ethicsConfig = {
  approved: { color: "green" as const, label: "Approved" },
  pending: { color: "orange" as const, label: "Pending" },
  rejected: { color: "red" as const, label: "Rejected" },
};

const allStatuses = ["All", "active", "pending", "paused", "closed"];
const allPhases = ["All", "Phase I", "Phase II", "Phase III", "Observational"];

export default function TrialManagementPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [phaseFilter, setPhaseFilter] = useState("All");
  const [selectedTrial, setSelectedTrial] = useState<typeof adminTrials[0] | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const filtered = adminTrials.filter((t) => {
    const matchSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.id.toLowerCase().includes(search.toLowerCase()) ||
      t.sponsor.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || t.status === statusFilter;
    const matchPhase = phaseFilter === "All" || t.phase === phaseFilter;
    return matchSearch && matchStatus && matchPhase;
  });

  const activeCount = adminTrials.filter((t) => t.status === "active").length;
  const pendingCount = adminTrials.filter((t) => t.status === "pending").length;
  const totalEnrolled = adminTrials.reduce((s, t) => s + t.enrolled, 0);
  const totalTarget = adminTrials.reduce((s, t) => s + t.target, 0);

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
            <FlaskConical size={22} className="text-brand-purple" /> Trial Management
          </h1>
          <p className="text-sm text-text-muted mt-0.5">Oversight of all clinical trials across the platform</p>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Trials" value={String(adminTrials.length)} icon={<FlaskConical size={18} className="text-brand-purple" />} iconBg="bg-brand-purple-light" />
        <StatCard title="Active" value={String(activeCount)} icon={<CheckCircle size={18} className="text-emerald-500" />} iconBg="bg-emerald-100" />
        <StatCard title="Pending Ethics" value={String(pendingCount)} icon={<Clock size={18} className="text-orange-500" />} iconBg="bg-orange-100" />
        <StatCard
          title="Overall Enrollment"
          value={`${Math.round((totalEnrolled / totalTarget) * 100)}%`}
          icon={<ShieldCheck size={18} className="text-blue-500" />}
          iconBg="bg-blue-100"
          subtitle={`${totalEnrolled} / ${totalTarget} patients`}
        />
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants}>
        <Card>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Search by title, ID or sponsor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-9"
              />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field w-full sm:w-36">
              {allStatuses.map((s) => <option key={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
            <select value={phaseFilter} onChange={(e) => setPhaseFilter(e.target.value)} className="input-field w-full sm:w-40">
              {allPhases.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <p className="text-xs text-text-muted mt-3">{filtered.length} trials</p>
        </Card>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Trials table */}
        <motion.div variants={itemVariants} className="flex-1 min-w-0">
          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border bg-surface-muted/40">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted">Trial</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted">Phase</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted">Status</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted">Ethics</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted">Enrollment</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((trial) => {
                    const pct = Math.round((trial.enrolled / trial.target) * 100);
                    const sCfg = trialStatusConfig[trial.status] ?? trialStatusConfig.pending;
                    const eCfg = ethicsConfig[trial.ethics] ?? ethicsConfig.pending;
                    return (
                      <tr
                        key={trial.id}
                        className={`border-b border-surface-border last:border-0 hover:bg-surface-muted/30 transition-colors cursor-pointer ${selectedTrial?.id === trial.id ? "bg-brand-purple-light/20" : ""}`}
                        onClick={() => setSelectedTrial(selectedTrial?.id === trial.id ? null : trial)}
                      >
                        <td className="px-5 py-3.5">
                          <p className="text-sm font-medium text-text-primary">{trial.title}</p>
                          <p className="text-xs text-text-muted">{trial.id} · {trial.sponsor}</p>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-text-secondary">{trial.phase}</td>
                        <td className="px-5 py-3.5">
                          <Badge color={sCfg.color}>{sCfg.label}</Badge>
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge color={eCfg.color}>{eCfg.label}</Badge>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2 w-28">
                            <div className="flex-1 h-1.5 rounded-full bg-surface-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-brand-purple"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs text-text-muted w-8">{pct}%</span>
                          </div>
                          <p className="text-xs text-text-muted mt-0.5">{trial.enrolled}/{trial.target}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === trial.id ? null : trial.id); }}
                            className="p-1.5 rounded-lg hover:bg-surface-muted transition-colors text-text-muted"
                          >
                            <MoreHorizontal size={16} />
                          </button>
                          <AnimatePresence>
                            {openMenuId === trial.id && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95, y: 4 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: 4 }}
                                  transition={{ duration: 0.12 }}
                                  className="absolute right-4 mt-1 w-44 bg-white rounded-xl shadow-glass border border-surface-border z-50 overflow-hidden"
                                >
                                  <button className="flex items-center gap-2 w-full px-3 py-2 text-xs text-text-secondary hover:bg-surface-muted transition-colors">
                                    <Eye size={13} /> View Details
                                  </button>
                                  {trial.ethics === "pending" && (
                                    <button className="flex items-center gap-2 w-full px-3 py-2 text-xs text-emerald-600 hover:bg-emerald-50 transition-colors">
                                      <ShieldCheck size={13} /> Approve Ethics
                                    </button>
                                  )}
                                  {trial.status === "active" && (
                                    <button className="flex items-center gap-2 w-full px-3 py-2 text-xs text-orange-500 hover:bg-orange-50 transition-colors">
                                      <PauseCircle size={13} /> Pause Trial
                                    </button>
                                  )}
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-sm text-text-muted">No trials match your filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>

        {/* Trial Detail Panel */}
        <AnimatePresence>
          {selectedTrial && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25 }}
              className="w-full lg:w-72 flex-shrink-0"
            >
              <Card>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-xs font-mono text-brand-purple">{selectedTrial.id}</p>
                    <h3 className="font-semibold text-text-primary mt-0.5 leading-snug">{selectedTrial.title}</h3>
                  </div>
                  <button
                    onClick={() => setSelectedTrial(null)}
                    className="p-1 rounded-lg hover:bg-surface-muted transition-colors text-text-muted flex-shrink-0"
                  >
                    <XCircle size={16} />
                  </button>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Sponsor</span>
                    <span className="text-text-primary font-medium">{selectedTrial.sponsor}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Phase</span>
                    <span className="text-text-primary font-medium">{selectedTrial.phase}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Sites</span>
                    <span className="text-text-primary font-medium">{selectedTrial.sites}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Start Date</span>
                    <span className="text-text-primary font-medium">{selectedTrial.startDate}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Ethics</span>
                    <Badge color={ethicsConfig[selectedTrial.ethics]?.color ?? "gray"}>
                      {ethicsConfig[selectedTrial.ethics]?.label ?? selectedTrial.ethics}
                    </Badge>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-surface-border">
                  <p className="text-xs text-text-muted mb-2">Enrollment Progress</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2.5 rounded-full bg-surface-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-purple to-blue-400"
                        style={{ width: `${Math.round((selectedTrial.enrolled / selectedTrial.target) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-text-primary">
                      {Math.round((selectedTrial.enrolled / selectedTrial.target) * 100)}%
                    </span>
                  </div>
                  <p className="text-xs text-text-muted mt-1">{selectedTrial.enrolled} / {selectedTrial.target} patients enrolled</p>
                </div>

                {selectedTrial.ethics === "pending" && (
                  <div className="mt-4">
                    <Button variant="primary" size="sm" className="w-full" leftIcon={<ShieldCheck size={13} />}>
                      Approve Ethics Review
                    </Button>
                  </div>
                )}
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
