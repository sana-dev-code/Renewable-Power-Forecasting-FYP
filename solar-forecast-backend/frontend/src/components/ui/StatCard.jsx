import React from "react";
import Card from "./Card";

/**
 * KPI metric card.
 * Props: label, value, sub, icon (Lucide component), color ("orange"|"green"|"blue"|"emerald"|"red"|"amber")
 */
const colorMap = {
  orange:  { bg: "rgba(59, 130, 246, 0.1)",  color: "var(--accent)" },   // Remapped to brand blue
  green:   { bg: "rgba(16, 185, 129, 0.1)",  color: "var(--success)" },
  blue:    { bg: "rgba(14, 165, 233, 0.1)",  color: "var(--info)" },
  emerald: { bg: "rgba(16, 185, 129, 0.1)",  color: "var(--success)" },
  red:     { bg: "rgba(239, 68, 68, 0.1)",   color: "var(--danger)" },
  amber:   { bg: "rgba(245, 158, 11, 0.1)",  color: "var(--warning)" },
  purple:  { bg: "rgba(139, 92, 246, 0.1)",  color: "var(--accent)" },
};

export default function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color = "orange",
  trend,
  className = "",
}) {
  const c = colorMap[color] ?? colorMap.orange;
  return (
    <Card className={`flex items-start justify-between ${className}`}>
      <div className="min-w-0 flex-1 pr-3">
        <p
          className="text-[10px] font-bold uppercase tracking-wider mb-1 truncate"
          style={{ color: "var(--muted)" }}
        >
          {label}
        </p>
        <p className="text-2xl font-extrabold leading-none tracking-tight" style={{ color: "var(--text)" }}>
          {value ?? "—"}
        </p>
        {sub && (
          <p className="text-xs mt-1 truncate" style={{ color: "var(--muted)" }}>
            {sub}
          </p>
        )}
        {trend && (
          <p
            className={`text-xs font-semibold mt-1 flex items-center gap-0.5 ${
              trend.dir === "up" ? "text-[var(--success)]" : "text-[var(--danger)]"
            }`}
          >
            {trend.dir === "up" ? "↑" : "↓"} {trend.label}
          </p>
        )}
      </div>
      {Icon && (
        <div className="p-2.5 rounded-lg flex-shrink-0" style={{ backgroundColor: c.bg }}>
          <Icon style={{ width: 20, height: 20, color: c.color }} strokeWidth={2} />
        </div>
      )}
    </Card>
  );
}
