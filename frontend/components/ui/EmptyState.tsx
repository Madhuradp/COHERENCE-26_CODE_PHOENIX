"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { Button } from "./Button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
    >
      {/* Icon */}
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="mb-4"
      >
        <div className="w-16 h-16 rounded-full bg-surface-muted flex items-center justify-center">
          <Icon className="text-text-muted" size={32} />
        </div>
      </motion.div>

      {/* Title */}
      <h3 className="text-lg font-bold text-text-primary mb-2">{title}</h3>

      {/* Description */}
      <p className="text-sm text-text-muted max-w-sm mb-6">{description}</p>

      {/* Action Button */}
      {action && (
        <Button
          onClick={action.onClick}
          variant="primary"
          leftIcon={action.icon && <action.icon size={16} />}
        >
          {action.label}
        </Button>
      )}
    </motion.div>
  );
}
