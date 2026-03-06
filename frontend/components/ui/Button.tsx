"use client";

import { motion } from "framer-motion";
import { clsx } from "clsx";
import { Loader2 } from "lucide-react";
import React from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-brand-purple text-white hover:bg-violet-600 shadow-sm hover:shadow-md",
  secondary:
    "bg-white text-text-secondary border border-surface-border hover:border-brand-purple hover:text-brand-purple hover:bg-brand-purple-light",
  ghost:
    "text-text-secondary hover:bg-surface-muted hover:text-text-primary",
  danger:
    "bg-red-500 text-white hover:bg-red-600 shadow-sm",
  outline:
    "border-2 border-brand-purple text-brand-purple hover:bg-brand-purple hover:text-white",
};

const sizeStyles: Record<Size, string> = {
  sm: "px-3 py-2 text-xs rounded-lg gap-1.5",
  md: "px-5 py-2.5 text-sm rounded-xl gap-2",
  lg: "px-6 py-3.5 text-base rounded-xl gap-2",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  leftIcon,
  rightIcon,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: disabled || loading ? 1 : 1.01, y: disabled || loading ? 0 : -1 }}
      whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
      transition={{ duration: 0.15 }}
      className={clsx(
        "inline-flex items-center justify-center font-semibold transition-all duration-200 select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      disabled={disabled || loading}
      {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {loading ? (
        <Loader2 className="animate-spin" size={16} />
      ) : (
        leftIcon && <span>{leftIcon}</span>
      )}
      {children}
      {!loading && rightIcon && <span>{rightIcon}</span>}
    </motion.button>
  );
}
