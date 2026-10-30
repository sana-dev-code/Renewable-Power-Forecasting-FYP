import React from "react";
import { Loader2 } from "lucide-react";

/**
 * Reusable button.
 * variant: "primary" | "secondary" | "ghost" | "danger" | "success"
 * size:    "sm" | "md" (default) | "lg"
 */
export default function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon: Icon,
  iconRight: IconRight,
  className = "",
  fullWidth = false,
  onClick,
  type = "button",
  ...rest
}) {
  const base =
    "inline-flex items-center justify-center font-semibold rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none";

  const variants = {
    primary:
      "bg-[var(--accent)] hover:bg-[var(--accent-2)] text-white focus-visible:ring-[var(--accent)]",
    secondary:
      "bg-[var(--surface-soft)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] border border-[var(--border)] focus-visible:ring-[var(--accent)]",
    ghost:
      "bg-transparent hover:bg-[var(--surface-soft)] text-[var(--text-secondary)] focus-visible:ring-[var(--accent)]",
    danger:
      "bg-[var(--danger)] hover:opacity-90 text-white focus-visible:ring-[var(--danger)]",
    success:
      "bg-[var(--success)] hover:opacity-90 text-white focus-visible:ring-[var(--success)]",
    outline:
      "bg-transparent border border-[var(--border)] hover:bg-[var(--surface-soft)] text-[var(--text)] focus-visible:ring-[var(--accent)]",
  };

  const sizes = {
    xs: "text-xs px-2.5 py-1 gap-1",
    sm: "text-xs px-3 py-1.5 gap-1.5",
    md: "text-sm px-4 py-2 gap-2",
    lg: "text-sm px-5 py-2.5 gap-2",
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${base} ${variants[variant] ?? variants.primary} ${sizes[size] ?? sizes.md} ${fullWidth ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        Icon && <Icon style={{ width: 15, height: 15 }} />
      )}
      {children}
      {IconRight && !loading && <IconRight style={{ width: 14, height: 14 }} />}
    </button>
  );
}
