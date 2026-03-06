"use client";

import { motion } from "framer-motion";
import { clsx } from "clsx";
import React from "react";

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (value: unknown, row: T, index: number) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function Table<T extends Record<string, unknown>>({
  columns,
  data,
  onRowClick,
  loading = false,
  emptyMessage = "No data found",
  className,
}: TableProps<T>) {
  if (loading) {
    return (
      <div className="overflow-hidden rounded-2xl border border-surface-border bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-border bg-surface-muted">
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-surface-border last:border-0">
                {columns.map((col) => (
                  <td key={String(col.key)} className="px-4 py-3">
                    <div className="h-4 bg-surface-muted rounded-full animate-pulse" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "overflow-hidden rounded-2xl border border-surface-border bg-white",
        className
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-border bg-surface-muted">
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={clsx(
                    "px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider",
                    col.headerClassName
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-sm text-text-muted"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <motion.tr
                  key={i}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => onRowClick?.(row)}
                  className={clsx(
                    "border-b border-surface-border last:border-0 transition-colors duration-150",
                    onRowClick &&
                      "cursor-pointer hover:bg-brand-purple-light/30"
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={String(col.key)}
                      className={clsx(
                        "px-4 py-3 text-sm text-text-primary",
                        col.className
                      )}
                    >
                      {col.render
                        ? col.render(row[col.key as keyof T] as unknown, row, i)
                        : String(row[col.key as keyof T] ?? "")}
                    </td>
                  ))}
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface BadgeProps {
  children: React.ReactNode;
  variant?: "purple" | "blue" | "orange" | "green" | "red" | "gray";
}

const badgeVariants: Record<string, string> = {
  purple: "bg-brand-purple-light text-brand-purple",
  blue: "bg-brand-blue-light text-blue-700",
  orange: "bg-brand-orange-light text-orange-700",
  green: "bg-emerald-100 text-emerald-700",
  red: "bg-red-100 text-red-600",
  gray: "bg-surface-muted text-text-muted",
};

export function Badge({ children, variant = "gray" }: BadgeProps) {
  return (
    <span className={clsx("badge", badgeVariants[variant])}>
      {children}
    </span>
  );
}
