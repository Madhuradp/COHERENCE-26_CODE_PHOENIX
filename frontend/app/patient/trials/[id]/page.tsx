"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import {
  FlaskConical, MapPin, Calendar, Building2, CheckCircle, XCircle,
  ArrowLeft, Send, AlertCircle, Star,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Table";
import { mockPatientMatches } from "@/lib/patientMockData";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export default function TrialDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  const trial = mockPatientMatches.find((t) => t.id === params.id);

  if (!trial) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertCircle size={40} className="text-text-muted" />
        <p className="font-semibold text-text-primary">Trial not found</p>
        <Button variant="secondary" size="md" leftIcon={<ArrowLeft size={14} />} onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  const handleApply = async () => {
    setApplying(true);
    await new Promise((r) => setTimeout(r, 1200));
    setApplying(false);
    setApplied(true);
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-6"
    >
      {/* Back */}
      <motion.div variants={itemVariants}>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          Back to matches
        </button>
      </motion.div>

      {/* Trial header card */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-2xl shadow-card p-6"
      >
        <div className="flex items-start gap-5 flex-wrap">
          <div className="w-14 h-14 rounded-2xl bg-brand-purple-light flex items-center justify-center flex-shrink-0">
            <FlaskConical size={26} className="text-brand-purple" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="font-mono text-xs font-bold text-brand-purple bg-brand-purple-light px-2.5 py-1 rounded-lg">
                {trial.id}
              </span>
              <Badge variant="purple">{trial.phase}</Badge>
              <Badge variant={trial.status === "RECRUITING" ? "green" : "blue"}>
                {trial.status}
              </Badge>
            </div>
            <h1 className="text-xl font-bold text-text-primary leading-snug">
              {trial.title}
            </h1>

            {/* Match score */}
            <div className="flex items-center gap-2 mt-3">
              <Star size={15} className="text-brand-orange" />
              <span className="text-sm font-bold text-text-primary">{trial.matchScore}% match</span>
              <div className="flex-1 max-w-[120px] h-2 rounded-full bg-surface-muted overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${trial.matchScore}%` }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  className={`h-full rounded-full ${
                    trial.matchScore >= 90 ? "bg-emerald-400" : "bg-brand-purple"
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Apply button */}
          <div className="flex-shrink-0">
            <AnimatePresence mode="wait">
              {applied ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-100 text-emerald-700 font-semibold text-sm"
                >
                  <CheckCircle size={15} />
                  Request Sent
                </motion.div>
              ) : (
                <Button
                  variant="primary"
                  size="md"
                  loading={applying}
                  leftIcon={<Send size={15} />}
                  onClick={handleApply}
                >
                  Request Participation
                </Button>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Meta info */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t border-surface-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-surface-muted flex items-center justify-center flex-shrink-0">
              <FlaskConical size={14} className="text-text-muted" />
            </div>
            <div>
              <p className="text-xs text-text-muted">Condition</p>
              <p className="text-sm font-semibold text-text-primary">{trial.condition}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-surface-muted flex items-center justify-center flex-shrink-0">
              <MapPin size={14} className="text-text-muted" />
            </div>
            <div>
              <p className="text-xs text-text-muted">Location</p>
              <p className="text-sm font-semibold text-text-primary">{trial.location}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-surface-muted flex items-center justify-center flex-shrink-0">
              <Building2 size={14} className="text-text-muted" />
            </div>
            <div>
              <p className="text-xs text-text-muted">Sponsor</p>
              <p className="text-sm font-semibold text-text-primary">{trial.sponsor}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-surface-muted flex items-center justify-center flex-shrink-0">
              <Calendar size={14} className="text-text-muted" />
            </div>
            <div>
              <p className="text-xs text-text-muted">Timeline</p>
              <p className="text-sm font-semibold text-text-primary">
                {trial.startDate} → {trial.completionDate}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Why you qualify */}
      <motion.div variants={itemVariants}>
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
          <p className="text-sm font-bold text-emerald-700 mb-3 flex items-center gap-2">
            <CheckCircle size={16} /> Why you may qualify
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {trial.eligibilityReasons.map((reason, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                className="flex items-start gap-2"
              >
                <CheckCircle size={13} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                <span className="text-xs text-emerald-800">{reason}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Criteria */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Inclusion */}
        <div className="bg-white rounded-2xl shadow-card p-5">
          <p className="text-sm font-bold text-emerald-600 uppercase tracking-wider mb-4">
            Inclusion Criteria
          </p>
          <div className="flex flex-col gap-3">
            {trial.inclusionCriteria.map((c, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-start gap-2.5"
              >
                <CheckCircle size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-text-primary">{c}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Exclusion */}
        <div className="bg-white rounded-2xl shadow-card p-5">
          <p className="text-sm font-bold text-red-500 uppercase tracking-wider mb-4">
            Exclusion Criteria
          </p>
          <div className="flex flex-col gap-3">
            {trial.exclusionCriteria.map((c, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-start gap-2.5"
              >
                <XCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-text-primary">{c}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Bottom CTA */}
      <motion.div variants={itemVariants}>
        <div className="bg-white rounded-2xl shadow-card p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-bold text-text-primary">
              Interested in this trial?
            </p>
            <p className="text-sm text-text-muted mt-0.5">
              Submit a participation request and the trial team will contact you.
            </p>
          </div>
          <AnimatePresence mode="wait">
            {applied ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-100 text-emerald-700 font-semibold text-sm flex-shrink-0"
              >
                <CheckCircle size={15} />
                Application Submitted
              </motion.div>
            ) : (
              <Button
                variant="primary"
                size="lg"
                loading={applying}
                leftIcon={<Send size={15} />}
                onClick={handleApply}
                className="flex-shrink-0"
              >
                Request Participation
              </Button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
