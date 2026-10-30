import React from "react";

export default function ProgressBar({ value = 0, max = 100, color, label, showPct = true }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  const getColor = () => {
    if (color) return color;
    if (pct >= 85) return "var(--success)";
    if (pct >= 50) return "var(--accent-2)";
    return "var(--danger)";
  };

  return (
    <div className="w-full">
      {(label || showPct) && (
        <div className="flex justify-between items-center mb-1.5 text-xs" style={{ color: "var(--muted)" }}>
          {label && <span className="font-medium">{label}</span>}
          {showPct && <span className="font-semibold tabular-nums">{Math.round(pct)}%</span>}
        </div>
      )}
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${getColor()}, ${getColor()}cc)` }}
        />
      </div>
    </div>
  );
}
