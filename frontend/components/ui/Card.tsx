"use client";

import { motion } from "framer-motion";
import { clsx } from "clsx";
import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glass?: boolean;
  padding?: "sm" | "md" | "lg" | "none";
}

const paddingStyles = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function Card({
  children,
  className,
  hover = false,
  glass = false,
  padding = "md",
}: CardProps) {
  return (
    <motion.div
      whileHover={hover ? { y: -2, boxShadow: "0 4px 20px rgba(139,92,246,0.12)" } : {}}
      transition={{ duration: 0.2 }}
      className={clsx(
        "rounded-2xl",
        glass
          ? "glass-card"
          : "bg-white shadow-card",
        paddingStyles[padding],
        className
      )}
    >
      {children}
    </motion.div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconBg?: string;
  trend?: { value: number; label: string };
  subtitle?: string;
}

export function StatCard({ title, value, icon, iconBg, trend, subtitle }: StatCardProps) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      className="stat-card p-5 flex flex-col gap-4"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            {title}
          </p>
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl font-bold text-text-primary mt-1"
          >
            {typeof value === "number" ? value.toLocaleString() : value}
          </motion.p>
          {subtitle && (
            <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>
          )}
        </div>
        <div
          className={clsx(
            "w-11 h-11 rounded-2xl flex items-center justify-center",
            iconBg || "bg-brand-purple-light"
          )}
        >
          {icon}
        </div>
      </div>
      {trend && (
        <div className="flex items-center gap-1.5">
          <span
            className={clsx(
              "text-xs font-semibold",
              trend.value >= 0 ? "text-emerald-600" : "text-red-500"
            )}
          >
            {trend.value >= 0 ? "+" : ""}
            {trend.value}%
          </span>
          <span className="text-xs text-text-muted">{trend.label}</span>
        </div>
      )}
    </motion.div>
  );
}
