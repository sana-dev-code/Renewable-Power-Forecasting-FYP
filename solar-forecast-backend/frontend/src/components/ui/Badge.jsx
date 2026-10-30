import React from "react";

/**
 * Small status/label badge.
 * variant: "default" | "success" | "danger" | "warning" | "info" | "demo" | "accent"
 */
export default function Badge({ children, variant = "default", icon: Icon, className = "" }) {
  const base =
    "inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border leading-tight";

  const variants = {
    default:
      "bg-[var(--surface-soft)] text-[var(--text-secondary)] border-[var(--border)]",
    success:
      "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
    danger:
      "bg-red-100 text-red-800 border-red-200",
    warning:
      "bg-amber-100 text-amber-800 border-amber-200",
    info:
      "bg-blue-100 text-blue-800 border-blue-200",
    demo:
      "bg-amber-100 text-amber-800 border-amber-300 uppercase tracking-wide text-[0.65rem] font-bold",
    accent:
      "bg-orange-100 text-orange-800 border-orange-200",
  };

  return (
    <span className={`${base} ${variants[variant] ?? variants.default} ${className}`}>
      {Icon && <Icon style={{ width: 11, height: 11 }} />}
      {children}
    </span>
  );
}
