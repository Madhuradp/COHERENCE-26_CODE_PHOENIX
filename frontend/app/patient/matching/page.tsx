"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { CheckCircle, Loader2, Zap, Brain, GitCompare, Shield, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { findMyMatches } from "@/lib/api";
import { useAuth } from "@/lib/authContext";

interface Step {
  id: string;
  label: string;
  subLabel: string;
  icon: React.ElementType;
  durationMs: number;
}

const steps: Step[] = [
  { id: "analyze", label: "Analyzing patient data", subLabel: "Parsing health profile and lab results...", icon: Brain, durationMs: 1400 },
  { id: "inclusion", label: "Checking inclusion criteria", subLabel: "Evaluating age, diagnosis, and lab thresholds...", icon: CheckCircle, durationMs: 1600 },
  { id: "exclusion", label: "Checking exclusion criteria", subLabel: "Screening for contraindications and conflicts...", icon: Shield, durationMs: 1200 },
  { id: "score", label: "Calculating match score", subLabel: "Applying ML model to rank trial suitability...", icon: GitCompare, durationMs: 1000 },
];

type StepStatus = "waiting" | "running" | "done";

export default function MatchingPage() {
  const router = useRouter();
  const auth = useAuth();
  const [stepStatuses, setStepStatuses] = useState<Record<string, StepStatus>>(
    Object.fromEntries(steps.map((s) => [s.id, "waiting"]))
  );
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [finished, setFinished] = useState(false);
  const [started, setStarted] = useState(false);
  const [matchCount, setMatchCount] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setStarted(true), 400);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!started) return;

    if (auth.patientId) {
      findMyMatches(auth.patientId)
        .then((res) => setMatchCount(res.data.length))
        .catch(() => setMatchCount(0));
    }

    let delay = 0;
    steps.forEach((step, index) => {
      setTimeout(() => {
        setCurrentStepIndex(index);
        setStepStatuses((prev) => ({ ...prev, [step.id]: "running" }));
      }, delay);
      delay += step.durationMs;
      setTimeout(() => {
        setStepStatuses((prev) => ({ ...prev, [step.id]: "done" }));
        if (index === steps.length - 1) setTimeout(() => setFinished(true), 400);
      }, delay);
      delay += 200;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Zap size={22} className="text-brand-purple" /> Running Eligibility Matching
        </h1>
        <p className="text-sm text-text-muted mt-0.5">
          Our AI engine is evaluating your eligibility against available clinical trials.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="bg-white rounded-3xl shadow-card p-8 flex flex-col items-center gap-8"
      >
        <div className="relative">
          <AnimatePresence mode="wait">
            {!finished ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="w-24 h-24 rounded-full flex items-center justify-center relative"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  className="absolute inset-0 rounded-full border-4 border-transparent border-t-brand-purple border-r-brand-purple/30"
                />
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                  className="absolute inset-2 rounded-full border-4 border-transparent border-b-blue-400 border-l-blue-400/30"
                />
                <div className="w-12 h-12 rounded-full bg-brand-purple-light flex items-center justify-center z-10">
                  <Zap className="text-brand-purple" size={22} />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center"
              >
                <CheckCircle className="text-emerald-500" size={44} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait">
          {finished ? (
            <motion.div key="finished" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
              <p className="text-xl font-bold text-text-primary">Matching Complete!</p>
              <p className="text-sm text-text-muted mt-1">
                We found{" "}
                <strong className="text-brand-purple">
                  {matchCount !== null ? matchCount : "..."} clinical trial{matchCount !== 1 ? "s" : ""}
                </strong>{" "}
                you may qualify for.
              </p>
            </motion.div>
          ) : (
            <motion.div key="running" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
              <p className="text-lg font-bold text-text-primary">
                {currentStepIndex >= 0 ? steps[currentStepIndex].label : "Starting analysis..."}
              </p>
              <p className="text-sm text-text-muted mt-1">
                {currentStepIndex >= 0 ? steps[currentStepIndex].subLabel : "Preparing your health profile..."}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {!finished && (
          <div className="w-full max-w-sm">
            <div className="h-1.5 rounded-full bg-surface-muted overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
                transition={{ duration: 0.4 }}
                className="h-full rounded-full bg-gradient-to-r from-brand-purple to-blue-500"
              />
            </div>
            <p className="text-xs text-text-muted text-center mt-1.5">
              Step {Math.max(currentStepIndex + 1, 1)} of {steps.length}
            </p>
          </div>
        )}

        <div className="w-full max-w-md flex flex-col gap-3">
          {steps.map((step, i) => {
            const status = stepStatuses[step.id];
            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl border transition-all duration-300 ${
                  status === "running"
                    ? "border-brand-purple/30 bg-brand-purple-light/30"
                    : status === "done"
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-surface-border bg-surface-muted/30"
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors duration-300 ${
                    status === "running" ? "bg-brand-purple-light" : status === "done" ? "bg-emerald-100" : "bg-surface-muted"
                  }`}
                >
                  {status === "running" ? (
                    <Loader2 size={16} className="text-brand-purple animate-spin" />
                  ) : status === "done" ? (
                    <CheckCircle size={16} className="text-emerald-500" />
                  ) : (
                    <step.icon size={16} className="text-text-muted" />
                  )}
                </div>
                <div className="flex-1">
                  <p
                    className={`text-sm font-semibold transition-colors ${
                      status === "running" ? "text-brand-purple" : status === "done" ? "text-emerald-700" : "text-text-muted"
                    }`}
                  >
                    {step.label}
                  </p>
                  {status === "running" && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-text-muted mt-0.5">
                      {step.subLabel}
                    </motion.p>
                  )}
                  {status === "done" && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-emerald-600 mt-0.5">
                      Completed
                    </motion.p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        <AnimatePresence>
          {finished && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Button variant="primary" size="lg" rightIcon={<ArrowRight size={16} />} onClick={() => router.push("/patient/matches")}>
                View My Trial Matches
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
