import React, { useMemo } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler,
} from "chart.js";
import {
  Sun, DollarSign, Leaf, ShieldCheck, Zap, TrendingUp,
  ArrowRight, CloudSun, MapPin, Layers,
} from "lucide-react";
import { useForecast } from "../context/ForecastContext";
import { useTheme } from "../context/ThemeContext";
import StatCard from "../components/ui/StatCard";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import EmptyState from "../components/ui/EmptyState";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export default function Dashboard({ onNavigateToForecast }) {
  const { forecastResult, isDemo, loadDemo, extras, totalForecastCount } = useForecast();
  const { isDark } = useTheme();

  const metrics = useMemo(() => {
    if (!forecastResult) return null;
    const total = forecastResult.daily_summary.reduce((s, d) => s + (d.total_kWh || 0), 0);
    const avg = total / Math.max(forecastResult.daily_summary.length, 1);
    const best = Math.max(...forecastResult.daily_summary.map((d) => d.total_kWh));
    const bestDay = forecastResult.daily_summary.find((d) => d.total_kWh === best);
    const monthlySavings = avg * 30 * extras.tariff;
    const co2Saved = total * extras.emissionFactor;
    const capacityKwp = forecastResult.meta.panel_count * 0.55;
    return {
      total: total.toFixed(1),
      avg: avg.toFixed(1),
      monthlySavings: Math.round(monthlySavings).toLocaleString(),
      co2Saved: co2Saved.toFixed(1),
      confidence: forecastResult.confidence || "90%",
      capacityKwp: capacityKwp.toFixed(1),
      best: best.toFixed(1),
      bestDay: bestDay?.date || "",
    };
  }, [forecastResult, extras]);

  const chartData = useMemo(() => {
    if (!forecastResult) return null;
    const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";
    const tickColor = isDark ? "#8b949e" : "#6b7280";
    return {
      data: {
        labels: forecastResult.daily_summary.map((d) => {
          const dt = new Date(`${d.date}T00:00:00Z`);
          return dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
        }),
        datasets: [
          {
            label: "Daily Output (kWh)",
            data: forecastResult.daily_summary.map((d) => d.total_kWh),
            borderColor: "#f97316",
            backgroundColor: isDark ? "rgba(249,115,22,0.12)" : "rgba(249,115,22,0.08)",
            tension: 0.35,
            fill: true,
            pointBackgroundColor: "#f97316",
            pointRadius: 4,
            pointHoverRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { mode: "index", intersect: false, backgroundColor: isDark ? "#1c2330" : "#fff", titleColor: isDark ? "#e6edf3" : "#111", bodyColor: isDark ? "#8b949e" : "#374151", borderColor: isDark ? "#30363d" : "#e5e7eb", borderWidth: 1 },
        },
        scales: {
          y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: tickColor, font: { size: 11 } }, title: { display: true, text: "kWh", color: tickColor, font: { size: 11 } } },
          x: { grid: { display: false }, ticks: { color: tickColor, font: { size: 11 } } },
        },
      },
    };
  }, [forecastResult, isDark]);

  return (
    <div className="space-y-5">
      {/* Demo banner */}
      {isDemo && forecastResult && (
        <div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border"
          style={{ background: "rgba(245,158,11,0.08)", borderColor: "rgba(245,158,11,0.25)" }}
        >
          <div className="flex items-start gap-2.5">
            <CloudSun style={{ width: 18, height: 18, color: "var(--warning)", flexShrink: 0, marginTop: 2 }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--warning)" }}>
                Demo Mode Active
              </p>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                Showing sample Lahore forecast. Run a live forecast to see real-time ML predictions.
              </p>
            </div>
          </div>
          <Button variant="primary" size="sm" onClick={onNavigateToForecast}>
            Create Real Forecast
          </Button>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard
          label="Total Forecasts Run"
          value={totalForecastCount}
          sub="This session"
          icon={Zap}
          color="orange"
        />
        <StatCard
          label="Latest Forecast Output"
          value={metrics ? `${metrics.total} kWh` : "—"}
          sub={metrics ? `${forecastResult?.daily_summary.length}d window` : "No forecast yet"}
          icon={Sun}
          color="orange"
        />
        <StatCard
          label="Avg Daily Production"
          value={metrics ? `${metrics.avg} kWh/day` : "—"}
          sub={metrics ? `System: ${metrics.capacityKwp} kWp` : "Run a forecast first"}
          icon={TrendingUp}
          color="blue"
        />
        <StatCard
          label="Est. Monthly Savings"
          value={metrics ? `PKR ${metrics.monthlySavings}` : "—"}
          sub={`At PKR ${extras.tariff}/kWh`}
          icon={DollarSign}
          color="green"
        />
        <StatCard
          label="CO₂ Saved"
          value={metrics ? `${metrics.co2Saved} kg` : "—"}
          sub={`${extras.emissionFactor} kg/kWh factor`}
          icon={Leaf}
          color="emerald"
        />
        <StatCard
          label="Model Confidence"
          value={metrics ? metrics.confidence : "—"}
          sub={forecastResult ? forecastResult.meta.artifacts : "Predictive engine"}
          icon={ShieldCheck}
          color="blue"
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Chart */}
        <Card padding="lg" className="lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
            <div>
              <h3 className="text-base font-bold" style={{ color: "var(--text)" }}>
                Daily Solar Production
              </h3>
              <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                Predicted daily generation trend
              </p>
            </div>
            {forecastResult && (
              <Badge variant="accent" icon={TrendingUp}>
                {forecastResult.daily_summary.length} Days
              </Badge>
            )}
          </div>

          <div className="chart-container" style={{ height: 280 }}>
            {chartData ? (
              <Line data={chartData.data} options={chartData.options} />
            ) : (
              <EmptyState
                icon={Sun}
                title="No Forecast Data"
                description="Run a live solar forecast or load the Lahore demo to see production charts."
                primaryAction={{ label: "Run Calculator", icon: ArrowRight, onClick: onNavigateToForecast }}
                secondaryAction={{ label: "Load Demo", onClick: loadDemo }}
              />
            )}
          </div>
        </Card>

        {/* Side panel */}
        <div className="flex flex-col gap-4">
          {/* System info */}
          <Card padding="lg">
            <h4 className="text-sm font-bold mb-3" style={{ color: "var(--text)" }}>
              System Details
            </h4>
            {forecastResult ? (
              <div className="space-y-2">
                {[
                  { label: "Location", value: forecastResult.meta.location, icon: MapPin },
                  { label: "Panel Type", value: forecastResult.meta.panel_type, icon: Layers },
                  { label: "Total Panels", value: `${forecastResult.meta.panel_count} panels`, icon: Sun },
                  { label: "Avg Output", value: `${metrics?.avg} kWh/day`, icon: TrendingUp },
                  { label: "Peak Day", value: metrics ? `${metrics.best} kWh` : "—", icon: Zap },
                ].map(({ label, value, icon: Icon }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between px-3 py-2 rounded-lg text-xs"
                    style={{ background: "var(--surface-soft)", border: "1px solid var(--border)" }}
                  >
                    <span className="flex items-center gap-1.5" style={{ color: "var(--muted)" }}>
                      <Icon style={{ width: 12, height: 12 }} />
                      {label}
                    </span>
                    <span className="font-semibold" style={{ color: "var(--text)" }}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs italic text-center py-4" style={{ color: "var(--muted)" }}>
                Run a forecast to see system details.
              </p>
            )}
          </Card>

          {/* Quick actions */}
          <Card padding="md">
            <h4
              className="text-xs font-bold uppercase tracking-wider mb-3"
              style={{ color: "var(--muted)" }}
            >
              Quick Actions
            </h4>
            <div className="space-y-2">
              <Button
                variant="primary"
                fullWidth
                size="sm"
                icon={ArrowRight}
                onClick={onNavigateToForecast}
              >
                Launch Solar Calculator
              </Button>
              <Button
                variant="secondary"
                fullWidth
                size="sm"
                onClick={loadDemo}
              >
                Load Lahore Demo Data
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
