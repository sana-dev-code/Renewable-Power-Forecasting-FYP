import React from "react";

export default function Toggle({ checked, onChange, label, description, id }) {
  return (
    <div className="flex items-center justify-between py-2.5 gap-4">
      <div className="flex-1 min-w-0">
        {label && (
          <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
            {label}
          </p>
        )}
        {description && (
          <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
            {description}
          </p>
        )}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        id={id}
        onClick={() => onChange(!checked)}
        className={`toggle-track ${checked ? "on" : ""} focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-2)] focus-visible:ring-offset-2`}
      >
        <span className="toggle-thumb" />
      </button>
    </div>
  );
}
