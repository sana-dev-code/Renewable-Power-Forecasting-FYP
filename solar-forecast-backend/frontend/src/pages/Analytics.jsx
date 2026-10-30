import React, { useMemo, useState } from "react";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, Title, Tooltip, Legend, Filler,
} from "chart.js";
import {
  BarChart3, TrendingUp, TrendingDown, Zap, DollarSign,
  Leaf, ArrowRight, Activity, Award,
} from "lucide-react";
import { useForecast } from "../context/ForecastContext";
import { useTheme } from "../context/ThemeContext";
import StatCard from "../components/ui/StatCard";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import EmptyState from "../components/ui/EmptyState";
import ProgressBar from "../components/ui/ProgressBar";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

const fmtDate = (iso) =>
  iso ? new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—";

export default function Analytics({ onNavigateToForecast }) {
  const { forecastResult, isDemo, extras } = useForecast();
  const { isDark } = useTheme();
  const [activeChart, setActiveChart] = useState("trend");

  const analytics = useMemo(() => {
    if (!forecastResult) return null;
    const data = forecastResult.daily_summary;
    const values = data.map((d) => d.total_kWh);
    const total = values.reduce((s, v) => s + v, 0);
    const avg = total / Math.max(values.length, 1);
    const best = Math.max(...values);
    const worst = Math.min(...values);
    const bestDay = data.find((d) => d.total_kWh === best)?.date || "";
    const worstDay = data.find((d) => d.total_kWh === worst)?.date || "";
    const variance = ((best - worst) / avg) * 100;
    const savings = total * extras.tariff;
    const co2 = total * extras.emissionFactor;
    const capacityKwp = forecastResult.meta.panel_count * 0.55;
    const peakSunHours = capacityKwp > 0 ? avg / capacityKwp : 0;
    return {
      total: total.toFixed(1), avg: avg.toFixed(2),
      best: best.toFixed(2), worst: worst.toFixed(2),
      bestDay, worstDay,
      variance: variance.toFixed(1),
      savings: Math.round(savings).toLocaleString(),
      co2: co2.toFixed(1),
      peakSunHours: peakSunHours.toFixed(1),
      days: data.length,
    };
  }, [forecastResult, extras]);

  const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";
  const tickColor = isDark ? "#8b949e" : "#6b7280";
  const tooltipBg = isDark ? "#1c2330" : "#fff";
  const tooltipTitle = isDark ? "#e6edf3" : "#111";
  const tooltipBody = isDark ? "#8b949e" : "#374151";
  const tooltipBorder = isDark ? "#30363d" : "#e5e7eb";

  const sharedOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: "top", labels: { color: tickColor, font: { size: 11 }, boxWidth: 14 } },
      tooltip: { mode: "index", intersect: false, backgroundColor: tooltipBg, titleColor: tooltipTitle, bodyColor: tooltipBody, borderColor: tooltipBorder, borderWidth: 1 },
    },
    scales: {
      y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: tickColor, font: { size: 11 } }, title: { display: true, text: "kWh", color: tickColor, font: { size: 11 } } },
      x: { grid: { display: false }, ticks: { color: tickColor, font: { size: 11 } } },
    },
  };

  const trendChartData = useMemo(() => {
    if (!forecastResult) return null;
    const labels = forecastResult.daily_summary.map((d) => fmtDate(d.date));
    const data = forecastResult.daily_summary.map((d) => d.total_kWh);
    const avgVal = data.reduce((s, v) => s + v, 0) / Math.max(data.length, 1);
    return {
      labels,
      datasets: [
        { label: "Daily Output (kWh)", data, borderColor: "#f97316", backgroundColor: isDark ? "rgba(249,115,22,0.1)" : "rgba(249,115,22,0.07)", fill: true, tension: 0.35, pointRadius: 4, pointHoverRadius: 6, pointBackgroundColor: "#f97316" },
        { label: "Average", data: data.map(() => avgVal), borderColor: "#2563eb", backgroundColor: "transparent", borderDash: [5, 3], tension: 0, pointRadius: 0, fill: false },
      ],
    };
  }, [forecastResult, isDark]);

  const distChartData = useMemo(() => {
    if (!forecastResult) return null;
    const labels = forecastResult.daily_summary.map((d) => fmtDate(d.date));
    const data = forecastResult.daily_summary.map((d) => d.total_kWh);
    const maxVal = Math.max(...data);
    return {
      labels,
      datasets: [{
        label: "Daily Output (kWh)",
        data,
        backgroundColor: data.map((v) => v === maxVal ? "rgba(22,163,74,0.8)" : "rgba(249,115,22,0.7)"),
        borderColor: data.map((v) => v === maxVal ? "rgba(22,163,74,1)" : "rgba(249,115,22,1)"),
        borderWidth: 1,
        borderRadius: 6,
      }],
    };
  }, [forecastResult]);

  if (!forecastResult) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No Analytics Data"
        description="Run a solar forecast to unlock production trends, efficiency analysis, savings, and more."
        primaryAction={{ label: "Run First Forecast", icon: ArrowRight, onClick: onNavigateToForecast }}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Demo notice */}
      {isDemo && (
        <div className="flex items-center gap-2 p-3 rounded-lg border text-xs"
          style={{ background: "rgba(245,158,11,0.08)", borderColor: "rgba(245,158,11,0.25)", color: "var(--warning)" }}>
          <Activity style={{ width: 14, height: 14, flexShrink: 0 }} />
          <span><strong>Demo Mode:</strong> Analytics reflect simulated Lahore data.</span>
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Output" value={`${analytics?.total} kWh`} sub={`Over ${analytics?.days} days`} icon={Zap} color="orange" />
        <StatCard label="Avg Daily Yield" value={`${analytics?.avg} kWh`} sub={`~${analytics?.peakSunHours} peak sun hrs`} icon={TrendingUp} color="blue" />
        <StatCard label="Est. Savings" value={`PKR ${analytics?.savings}`} sub={`At PKR ${extras.tariff}/kWh`} icon={DollarSign} color="green" />
        <StatCard label="CO₂ Prevented" value={`${analytics?.co2} kg`} sub={`${extras.emissionFactor} kg/kWh`} icon={Leaf} color="emerald" />
      </div>

      {/* Chart */}
      <Card padding="lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="text-base font-bold" style={{ color: "var(--text)" }}>
              Production Analysis
            </h3>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
              {forecastResult.meta.location} · {forecastResult.meta.panel_count}× {forecastResult.meta.panel_type} panels
            </p>
          </div>
          <div
            className="flex rounded-lg overflow-hidden text-xs font-semibold border"
            style={{ borderColor: "var(--border)" }}
          >
            {["trend", "distribution"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveChart(tab)}
                className="px-3 py-1.5 transition-colors capitalize"
                style={{
                  background: activeChart === tab ? "var(--accent-2)" : "var(--surface)",
                  color: activeChart === tab ? "#fff" : "var(--text-secondary)",
                }}
              >
                {tab === "trend" ? "Trend" : "Daily Bars"}
              </button>
            ))}
          </div>
        </div>
        <div className="chart-container" style={{ height: 260 }}>
          {activeChart === "trend" && trendChartData ? (
            <Line data={trendChartData} options={sharedOptions} />
          ) : distChartData ? (
            <Bar data={distChartData} options={sharedOptions} />
          ) : null}
        </div>
      </Card>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Best vs Worst */}
        <Card padding="lg">
          <h4 className="text-sm font-bold mb-4" style={{ color: "var(--text)" }}>
            Peak vs Low Day
          </h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border"
              style={{ background: "rgba(22,163,74,0.07)", borderColor: "rgba(22,163,74,0.2)" }}>
              <div>
                <p className="text-xs font-semibold" style={{ color: "var(--success)" }}>Best Production</p>
                <p className="text-lg font-extrabold" style={{ color: "var(--success)" }}>{analytics?.best} kWh</p>
                <p className="text-xs" style={{ color: "var(--muted)" }}>{fmtDate(analytics?.bestDay)}</p>
              </div>
              <TrendingUp style={{ width: 24, height: 24, color: "var(--success)" }} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border"
              style={{ background: "rgba(220,38,38,0.07)", borderColor: "rgba(220,38,38,0.2)" }}>
              <div>
                <p className="text-xs font-semibold" style={{ color: "var(--danger)" }}>Lowest Production</p>
                <p className="text-lg font-extrabold" style={{ color: "var(--danger)" }}>{analytics?.worst} kWh</p>
                <p className="text-xs" style={{ color: "var(--muted)" }}>{fmtDate(analytics?.worstDay)}</p>
              </div>
              <TrendingDown style={{ width: 24, height: 24, color: "var(--danger)" }} />
            </div>
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              Variance: <span className="font-semibold" style={{ color: "var(--text)" }}>{analytics?.variance}%</span>
            </p>
          </div>
        </Card>

        {/* Efficiency */}
        <Card padding="lg">
          <h4 className="text-sm font-bold mb-4" style={{ color: "var(--text)" }}>
            Panel Efficiency
          </h4>
          <div className="space-y-4">
            {[
              { label: "Monocrystalline", value: 92 },
              { label: "Polycrystalline", value: 73 },
              { label: "Thin Film", value: 58 },
            ].map(({ label, value }) => {
              const isActive = forecastResult.meta.panel_type.toLowerCase().includes(label.split(" ")[0].toLowerCase());
              return (
                <div key={label}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className={`text-xs font-medium ${isActive ? "font-bold" : ""}`}
                      style={{ color: isActive ? "var(--accent-2)" : "var(--text-secondary)" }}>
                      {label} {isActive && "✓"}
                    </span>
                    <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>{value}%</span>
                  </div>
                  <ProgressBar value={value} max={100} color={isActive ? "var(--accent-2)" : undefined} showPct={false} />
                </div>
              );
            })}
          </div>
          <p className="text-xs mt-4" style={{ color: "var(--muted)" }}>
            Using <span className="font-semibold" style={{ color: "var(--accent-2)" }}>{forecastResult.meta.panel_type}</span>
          </p>
        </Card>

        {/* Confidence gauge */}
        <Card padding="lg">
          <h4 className="text-sm font-bold mb-4" style={{ color: "var(--text)" }}>
            Model Confidence
          </h4>
          <div className="flex flex-col items-center justify-center py-4">
            <ConfidenceGauge value={parseInt(forecastResult.confidence) || 0} />
            <p className="text-xs text-center mt-3 max-w-[160px]" style={{ color: "var(--muted)" }}>
              {parseInt(forecastResult.confidence) >= 85
                ? "High confidence — reliable forecast"
                : "Moderate — check weather inputs"}
            </p>
          </div>
          <div
            className="flex items-center gap-1.5 p-2.5 rounded-lg text-xs"
            style={{ background: "rgba(37,99,235,0.07)", color: "var(--info)" }}
          >
            <Award style={{ width: 13, height: 13, flexShrink: 0 }} />
            <span className="font-medium truncate">{forecastResult.meta.artifacts}</span>
          </div>
        </Card>
      </div>
    </div>
  );
}

function ConfidenceGauge({ value }) {
  const pct = Math.min(100, Math.max(0, value));
  const color = pct >= 85 ? "var(--success)" : pct >= 70 ? "var(--warning)" : "var(--danger)";
  const dash = pct * 0.879;
  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="14" fill="none" stroke="var(--surface-soft)" strokeWidth="3.5" />
        <circle
          cx="18" cy="18" r="14" fill="none"
          stroke={color} strokeWidth="3.5"
          strokeDasharray={`${dash} 87.9`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.8s ease" }}
        />
      </svg>
      <span className="absolute text-xl font-extrabold" style={{ color: "var(--text)" }}>
        {pct}%
      </span>
    </div>
  );
}
