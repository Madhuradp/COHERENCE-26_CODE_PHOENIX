"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, CheckCircle2, Loader2, Info, X } from "lucide-react";

type StatusType = "loading" | "success" | "error" | "info" | "warning";

interface SystemStatusProps {
  type: StatusType;
  title: string;
  message?: string;
  onDismiss?: () => void;
  autoClose?: number; // milliseconds
  progress?: number; // 0-100 for progress bars
}

const statusConfig = {
  loading: {
    icon: Loader2,
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    textColor: "text-blue-700",
    iconColor: "text-blue-500",
    animate: true,
  },
  success: {
    icon: CheckCircle2,
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    textColor: "text-green-700",
    iconColor: "text-green-500",
    animate: false,
  },
  error: {
    icon: AlertTriangle,
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    textColor: "text-red-700",
    iconColor: "text-red-500",
    animate: false,
  },
  warning: {
    icon: AlertTriangle,
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    textColor: "text-orange-700",
    iconColor: "text-orange-500",
    animate: false,
  },
  info: {
    icon: Info,
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    textColor: "text-blue-700",
    iconColor: "text-blue-500",
    animate: false,
  },
};

export function SystemStatus({
  type,
  title,
  message,
  onDismiss,
  autoClose,
  progress,
}: SystemStatusProps) {
  const config = statusConfig[type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.3 }}
      className={`${config.bgColor} border ${config.borderColor} rounded-xl p-4 flex gap-3 items-start`}
    >
      {/* Icon */}
      <motion.div
        animate={config.animate ? { rotate: 360 } : {}}
        transition={config.animate ? { duration: 1, repeat: Infinity, ease: "linear" } : {}}
      >
        <Icon className={`${config.iconColor} flex-shrink-0`} size={20} />
      </motion.div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-sm ${config.textColor}`}>{title}</p>
        {message && (
          <p className={`text-xs ${config.textColor} opacity-75 mt-0.5`}>
            {message}
          </p>
        )}

        {/* Progress Bar */}
        {progress !== undefined && (
          <div className="mt-3 w-full h-2 bg-black/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="h-full bg-current"
            />
          </div>
        )}
      </div>

      {/* Dismiss Button */}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className={`flex-shrink-0 p-1.5 rounded-lg hover:bg-black/5 transition-colors ${config.textColor}`}
        >
          <X size={16} />
        </button>
      )}
    </motion.div>
  );
}

interface SystemStatusContainerProps {
  statuses: (SystemStatusProps & { id: string })[];
  onDismiss: (id: string) => void;
}

export function SystemStatusContainer({
  statuses,
  onDismiss,
}: SystemStatusContainerProps) {
  return (
    <AnimatePresence>
      <div className="fixed top-4 right-4 z-50 max-w-md space-y-3">
        {statuses.map((status) => (
          <SystemStatus
            key={status.id}
            {...status}
            onDismiss={() => onDismiss(status.id)}
          />
        ))}
      </div>
    </AnimatePresence>
  );
}
