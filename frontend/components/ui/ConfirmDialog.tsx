"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { Button } from "./Button";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "success";
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantStyles = {
  danger: {
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    iconColor: "text-red-500",
    buttonVariant: "danger" as const,
  },
  warning: {
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    iconColor: "text-orange-500",
    buttonVariant: "primary" as const,
  },
  success: {
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    iconColor: "text-green-500",
    buttonVariant: "primary" as const,
  },
};

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  onConfirm,
  onCancel,
  loading = false,
  icon,
}: ConfirmDialogProps) {
  const styles = variantStyles[variant];
  const defaultIcon = variant === "danger" ? (
    <AlertTriangle className={styles.iconColor} size={24} />
  ) : variant === "success" ? (
    <CheckCircle2 className={styles.iconColor} size={24} />
  ) : (
    <AlertTriangle className={styles.iconColor} size={24} />
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onCancel}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm"
          >
            <div className={`${styles.bgColor} border ${styles.borderColor} rounded-2xl shadow-2xl p-6`}>
              {/* Close Button */}
              <button
                onClick={onCancel}
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-black/5 transition-colors text-text-secondary"
              >
                <X size={18} />
              </button>

              {/* Icon */}
              <div className="flex justify-center mb-4">
                {icon || defaultIcon}
              </div>

              {/* Title */}
              <h2 className="text-lg font-bold text-text-primary text-center mb-2">
                {title}
              </h2>

              {/* Description */}
              <p className="text-sm text-text-secondary text-center mb-6">
                {description}
              </p>

              {/* Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={onCancel}
                  disabled={loading}
                  className="flex-1"
                >
                  {cancelText}
                </Button>
                <Button
                  variant={styles.buttonVariant}
                  onClick={onConfirm}
                  loading={loading}
                  disabled={loading}
                  className="flex-1"
                >
                  {confirmText}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
