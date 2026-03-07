"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, X, Zap } from "lucide-react";
import { clsx } from "clsx";

type AlertVariant = "error" | "success" | "warning" | "info";

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  message: string;
  onDismiss?: () => void;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: "primary" | "secondary";
  }>;
  icon?: React.ReactNode;
}

const variantConfig = {
  error: {
    icon: AlertTriangle,
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    titleColor: "text-red-900",
    messageColor: "text-red-700",
    iconColor: "text-red-500",
  },
  success: {
    icon: CheckCircle2,
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    titleColor: "text-green-900",
    messageColor: "text-green-700",
    iconColor: "text-green-500",
  },
  warning: {
    icon: AlertTriangle,
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    titleColor: "text-orange-900",
    messageColor: "text-orange-700",
    iconColor: "text-orange-500",
  },
  info: {
    icon: Info,
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    titleColor: "text-blue-900",
    messageColor: "text-blue-700",
    iconColor: "text-blue-500",
  },
};

export function Alert({
  variant = "info",
  title,
  message,
  onDismiss,
  actions,
  icon,
}: AlertProps) {
  const config = variantConfig[variant];
  const Icon = icon ? null : config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.2 }}
      className={clsx(
        "border rounded-xl p-4 flex gap-4",
        config.bgColor,
        config.borderColor
      )}
    >
      {/* Icon */}
      <div className="flex-shrink-0 pt-0.5">
        {icon || (Icon && <Icon className={config.iconColor} size={20} />)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {title && (
          <h4 className={clsx("font-semibold text-sm", config.titleColor)}>
            {title}
          </h4>
        )}
        <p className={clsx("text-sm", config.messageColor, title && "mt-1")}>
          {message}
        </p>

        {/* Actions */}
        {actions && actions.length > 0 && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {actions.map((action, i) => (
              <motion.button
                key={i}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={action.onClick}
                className={clsx(
                  "text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors",
                  action.variant === "primary"
                    ? `${config.bgColor} text-current hover:opacity-75`
                    : "border border-current/20 hover:bg-black/5"
                )}
              >
                {action.label}
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* Dismiss Button */}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className={clsx(
            "flex-shrink-0 p-1.5 rounded-lg hover:bg-black/10 transition-colors -mt-1",
            config.messageColor
          )}
        >
          <X size={16} />
        </button>
      )}
    </motion.div>
  );
}

interface AlertGroupProps {
  alerts: (AlertProps & { id: string })[];
  onDismiss: (id: string) => void;
}

export function AlertGroup({ alerts, onDismiss }: AlertGroupProps) {
  return (
    <AnimatePresence>
      <div className="space-y-3">
        {alerts.map((alert) => (
          <Alert
            key={alert.id}
            {...alert}
            onDismiss={() => onDismiss(alert.id)}
          />
        ))}
      </div>
    </AnimatePresence>
  );
}
