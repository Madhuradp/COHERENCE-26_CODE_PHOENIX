"use client";

import { motion } from "framer-motion";

interface ProgressBarProps {
  isLoading: boolean;
  progress?: number; // 0-100, if not provided will use indeterminate animation
  label?: string;
}

export function ProgressBar({ isLoading, progress, label }: ProgressBarProps) {
  if (!isLoading) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full bg-surface-muted border-b border-surface-border"
    >
      <div className="px-4 md:px-6 lg:px-8 py-3">
        {/* Determinate progress bar */}
        {progress !== undefined ? (
          <div className="flex flex-col gap-2">
            <div className="w-full bg-surface-bg rounded-full h-2 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(progress, 100)}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-brand-purple to-brand-blue"
              />
            </div>
            {label && (
              <p className="text-xs text-text-muted">{label} {progress.toFixed(0)}%</p>
            )}
          </div>
        ) : (
          /* Indeterminate progress bar */
          <div className="flex flex-col gap-2">
            <div className="w-full bg-surface-bg rounded-full h-2.5 overflow-hidden relative">
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute h-full w-1/3 bg-gradient-to-r from-transparent via-brand-purple to-transparent"
              />
            </div>
            {label && (
              <p className="text-xs text-text-muted flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-brand-purple rounded-full animate-pulse" />
                {label}
              </p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
