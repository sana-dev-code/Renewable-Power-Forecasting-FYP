// ForecastResults.tsx — Themed forecast results panel
import React, { useRef, useState, useMemo, useCallback } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend,
} from "chart.js";
import { Calendar, MapPin, Battery, TrendingUp, Download, Leaf } from "lucide-react";
import { ForecastResult } from "../types";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// ── Helpers ──────────────────────────────────────────────
const fmtKWh = (n: number) => (isFinite(n) ? n : 0).toFixed(2);
const fileStamp = () => new Date().toISOString().slice(0, 10);
const safeName = (s: string) => (s || "forecast").replace(/[^\w-]+/g, "_");
const perPanel = (s: any) =>
  typeof s?.per_panel_kWh === "number" ? s.per_panel_kWh :
  typeof s?.per_panel_kwh === "number" ? s.per_panel_kwh : 0;

const partsInTZ = (d: Date, tz: string) => {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false });
  const p = fmt.formatToParts(d);
  const pick = (t: string) => Number(p.find((x) => x.type === t)?.value);
  return { y: pick("year"), m: pick("month"), d: pick("day"), h: pick("hour") };
};
const makeHourLabel = (h: number) => new Date(2020, 0, 1, h).toLocaleTimeString([], { hour: "numeric", hour12: true });
const dayToUTC = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00Z`);

interface ForecastResultsProps {
  result: ForecastResult;
  extras: { tariff: number; emissionFactor: number };
}

export const ForecastResults: React.FC<ForecastResultsProps> = ({ result, extras }) => {
  const chartRef = useRef<any>(null);
  const [viewMode, setViewMode] = useState<"daily" | "hourly">("daily");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const tzLabel = result.meta?.tz || "UTC";
  const days = useMemo(() => result.daily_summary.map((d) => d.date), [result.daily_summary]);

  const totalEnergy = result.daily_summary.reduce((s, d) => s + (d.total_kWh || 0), 0);
  const avgDaily = totalEnergy / Math.max(result.daily_summary.length, 1);
  const savings = Math.max(extras.tariff || 0) * totalEnergy;
  const co2 = Math.max(extras.emissionFactor || 0) * totalEnergy;

  const getHourlyForDay = useCallback((dateISO: string) => {
    const totals: Record<number, number> = {}, pp: Record<number, number> = {};
    for (let h = 0; h < 24; h++) { totals[h] = 0; pp[h] = 0; }
    const [Y, M, D] = dateISO.split("-").map(Number);
    for (const s of result.series as any[]) {
      const dt = new Date(s.ts);
      if (isNaN(dt.getTime())) continue;
      const p = partsInTZ(dt, tzLabel);
      if (p.y === Y && p.m === M && p.d === D) {
        totals[p.h] += Number(s.total_kWh || 0);
        pp[p.h] += Number(s.per_panel_kWh ?? s.per_panel_kwh ?? 0);
      }
    }
    const hrs = Array.from({ length: 24 }, (_, i) => i);
    return { labels: hrs.map(makeHourLabel), totalSeries: hrs.map((h) => totals[h]), perPanelSeries: hrs.map((h) => pp[h]) };
  }, [result.series, tzLabel]);

  const dailyLabels = useMemo(() => result.daily_summary.map((d) => dayToUTC(d.date).toLocaleDateString(undefined, { timeZone: tzLabel })), [result.daily_summary, tzLabel]);
  const dailyTotals = useMemo(() => result.daily_summary.map((d) => d.total_kWh), [result.daily_summary]);
  const dailyPP = useMemo(() => result.daily_summary.map((d) => d.total_kWh / Math.max(result.meta.panel_count, 1)), [result.daily_summary, result.meta.panel_count]);
  const selectedDayData = useMemo(() => selectedDay ? getHourlyForDay(selectedDay) : null, [selectedDay, getHourlyForDay]);

  // Build chart data using CSS var colors (orange accent)
  const chartData = useMemo(() => {
    if (viewMode === "daily") {
      return {
        labels: dailyLabels,
        datasets: [
          { label: "Total Energy (kWh)", data: dailyTotals, borderColor: "#f97316", backgroundColor: "rgba(249,115,22,0.08)", tension: 0.3 },
          { label: "Per Panel (kWh)", data: dailyPP, borderColor: "#2563eb", backgroundColor: "rgba(37,99,235,0.05)", tension: 0.3 },
        ],
      };
    }
    if (viewMode === "hourly" && selectedDay && selectedDayData) {
      return {
        labels: selectedDayData.labels,
        datasets: [
          { label: "Total Energy (kWh)", data: selectedDayData.totalSeries, borderColor: "#f97316", backgroundColor: "rgba(249,115,22,0.06)", tension: 0.3 },
          { label: "Per Panel (kWh)", data: selectedDayData.perPanelSeries, borderColor: "#2563eb", backgroundColor: "rgba(37,99,235,0.04)", tension: 0.3 },
        ],
      };
    }
    return { labels: [], datasets: [] };
  }, [viewMode, dailyLabels, dailyTotals, dailyPP, selectedDay, selectedDayData]);

  const chartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: "top" as const, labels: { font: { size: 11 } } }, tooltip: { mode: "index" as const, intersect: false } },
    scales: {
      y: { beginAtZero: true, title: { display: true, text: "Energy (kWh)", font: { size: 11 } }, grid: { color: "rgba(128,128,128,0.1)" } },
      x: { grid: { display: false }, ticks: { maxRotation: 45, minRotation: 0 } },
    },
  };

  // ── CSV Export ────────────────────────────────────────
  const handleExportCSV = () => {
    let csv = "";
    if (viewMode === "daily") {
      const rows = [["Date", "Total kWh", "Per Panel kWh", "Location"],
        ...result.daily_summary.map((d) => [d.date, fmtKWh(d.total_kWh), fmtKWh(d.total_kWh / Math.max(result.meta.panel_count, 1)), result.meta.location])];
      csv = rows.map((r) => r.join(",")).join("\n");
    } else if (selectedDay && selectedDayData) {
      const rows = [["Hour", "Total kWh", "Per Panel kWh"],
        ...selectedDayData.labels.map((l, i) => [l, fmtKWh(selectedDayData.totalSeries[i]), fmtKWh(selectedDayData.perPanelSeries[i])])];
      csv = rows.map((r) => r.join(",")).join("\n");
    }
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${safeName(result.meta.location)}_${viewMode}_${fileStamp()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleExportPNG = () => {
    if (chartRef.current) {
      const a = document.createElement("a");
      a.href = chartRef.current.toBase64Image();
      a.download = `${safeName(result.meta.location)}_chart_${fileStamp()}.png`;
      a.click();
    }
  };

  const confVariant = parseInt(result.confidence) >= 85 ? "#16a34a" : parseInt(result.confidence) >= 70 ? "#d97706" : "#dc2626";

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Forecast Period", value: `${result.range_days}d`, Icon: Calendar, color: "#2563eb" },
          { label: "Total Energy", value: `${fmtKWh(totalEnergy)} kWh`, Icon: TrendingUp, color: "#16a34a" },
          { label: "Daily Average", value: `${fmtKWh(avgDaily)} kWh`, Icon: Battery, color: "#f97316" },
          { label: "CO₂ Reduced", value: `${co2.toFixed(1)} kg`, Icon: Leaf, color: "#059669" },
        ].map(({ label, value, Icon, color }) => (
          <div key={label} className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--muted)" }}>{label}</p>
            <p className="text-xl font-extrabold" style={{ color }}>{value}</p>
            <Icon style={{ width: 18, height: 18, color, opacity: 0.4, marginTop: 6 }} />
          </div>
        ))}
      </div>

      {/* Savings + location info */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <span className="flex items-center gap-1.5" style={{ color: "var(--text)" }}>
            <MapPin style={{ width: 14, height: 14, color: "var(--accent-2)" }} />
            <strong>{result.meta.location}</strong>
            <span style={{ color: "var(--muted)", fontSize: 11 }}>
              ({result.meta.lat.toFixed(3)}, {result.meta.lon.toFixed(3)})
            </span>
          </span>
          <span style={{ color: "var(--muted)" }}>
            Panels: <strong style={{ color: "var(--text)" }}>{result.meta.panel_count}× {result.meta.panel_type}</strong>
          </span>
          <span style={{ color: "var(--muted)" }}>
            Savings: <strong style={{ color: "#16a34a" }}>PKR {Math.round(savings).toLocaleString()}</strong>
          </span>
          <span
            className="ml-auto text-xs font-bold px-2.5 py-0.5 rounded-full"
            style={{ background: `${confVariant}18`, color: confVariant, border: `1px solid ${confVariant}40` }}
          >
            Confidence: {result.confidence}
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="text-sm font-bold" style={{ color: "var(--text)" }}>Energy Production Forecast</h3>
          <div className="flex flex-wrap gap-2">
            {/* View toggle */}
            <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: "var(--border)" }}>
              {["daily", "hourly"].map((m) => (
                <button
                  key={m}
                  onClick={() => { setViewMode(m as any); if (m === "hourly" && !selectedDay && days.length) setSelectedDay(days[0]); }}
                  className="px-3 py-1 text-xs font-semibold capitalize transition-colors"
                  style={{
                    background: viewMode === m ? "var(--accent-2)" : "var(--surface)",
                    color: viewMode === m ? "#fff" : "var(--text-secondary)",
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
            <button onClick={handleExportCSV} className="flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg border transition-colors"
              style={{ background: "rgba(22,163,74,0.07)", color: "var(--success)", borderColor: "rgba(22,163,74,0.25)" }}>
              <Download style={{ width: 12, height: 12 }} /> CSV
            </button>
            <button onClick={handleExportPNG} className="flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg border transition-colors"
              style={{ background: "rgba(37,99,235,0.07)", color: "var(--info)", borderColor: "rgba(37,99,235,0.25)" }}>
              <Download style={{ width: 12, height: 12 }} /> PNG
            </button>
          </div>
        </div>

        {viewMode === "hourly" && (
          <div className="flex items-center gap-2 mb-3">
            <label className="text-xs font-semibold" style={{ color: "var(--muted)" }}>Select Day:</label>
            <select
              value={selectedDay ?? ""}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="input-base text-xs"
              style={{ width: "auto", padding: "4px 8px" }}
            >
              {days.map((d) => (
                <option key={d} value={d}>
                  {dayToUTC(d).toLocaleDateString(undefined, { timeZone: tzLabel })}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="chart-container" style={{ height: 260 }}>
          <Line ref={chartRef} data={chartData as any} options={chartOptions as any} />
        </div>
      </div>

      {/* Data table */}
      <div className="card p-5">
        <h3 className="text-sm font-bold mb-3" style={{ color: "var(--text)" }}>
          {viewMode === "daily" ? "Daily Energy Summary" : `Hourly Breakdown — ${selectedDay || ""}`}
        </h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr style={{ background: "var(--surface-soft)", borderBottom: "1px solid var(--border)" }}>
                {viewMode === "daily"
                  ? ["Date", "Total kWh", "Per Panel kWh"].map((h) => (
                      <th key={h} className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>{h}</th>
                    ))
                  : ["Time", "Total kWh", "Per Panel kWh"].map((h) => (
                      <th key={h} className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>{h}</th>
                    ))
                }
              </tr>
            </thead>
            <tbody>
              {viewMode === "daily"
                ? result.daily_summary.map((d, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td className="px-4 py-2.5 text-sm" style={{ color: "var(--text-secondary)" }}>
                        {dayToUTC(d.date).toLocaleDateString(undefined, { timeZone: tzLabel })}
                      </td>
                      <td className="px-4 py-2.5 font-bold text-sm" style={{ color: "var(--accent-2)" }}>{fmtKWh(d.total_kWh)}</td>
                      <td className="px-4 py-2.5 text-sm" style={{ color: "var(--text-secondary)" }}>{fmtKWh(d.total_kWh / Math.max(result.meta.panel_count, 1))}</td>
                    </tr>
                  ))
                : selectedDayData?.labels.map((lab, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td className="px-4 py-2.5 text-sm" style={{ color: "var(--text-secondary)" }}>{lab}</td>
                      <td className="px-4 py-2.5 font-bold text-sm" style={{ color: "var(--accent-2)" }}>{fmtKWh(selectedDayData.totalSeries[i])}</td>
                      <td className="px-4 py-2.5 text-sm" style={{ color: "var(--text-secondary)" }}>{fmtKWh(selectedDayData.perPanelSeries[i])}</td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ForecastResults;
