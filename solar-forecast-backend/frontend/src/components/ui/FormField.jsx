import React from "react";

/**
 * Reusable labelled form field wrapper.
 * Supports: input, select, textarea via the `as` prop.
 */
export default function FormField({
  label,
  helper,
  error,
  hint,
  children,
  required,
  id,
}) {
  return (
    <div>
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-semibold mb-1"
          style={{ color: "var(--text)" }}
        >
          {label}
          {required && <span className="text-[var(--danger)] ml-0.5">*</span>}
        </label>
      )}
      {helper && (
        <p className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>
          {helper}
        </p>
      )}
      {children}
      {error && (
        <p className="text-xs mt-1 font-medium" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
      {hint && !error && (
        <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
          {hint}
        </p>
      )}
    </div>
  );
}

/**
 * Themed input element.
 */
export function ThemedInput({
  error,
  className = "",
  ...props
}) {
  return (
    <input
      className={`input-base ${error ? "!border-[var(--danger)]" : ""} ${className}`}
      {...props}
    />
  );
}

/**
 * Themed select element.
 */
export function ThemedSelect({ error, className = "", children, ...props }) {
  return (
    <select
      className={`input-base ${error ? "!border-[var(--danger)]" : ""} ${className}`}
      style={{
        backgroundColor: "var(--surface)",
        color: "var(--text)",
        borderColor: error ? "var(--danger)" : "var(--border)",
      }}
      {...props}
    >
      {children}
    </select>
  );
}
