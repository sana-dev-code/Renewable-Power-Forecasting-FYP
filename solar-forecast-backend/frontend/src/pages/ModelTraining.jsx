import React, { useEffect, useRef, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Title, Tooltip, Legend, Filler,
} from "chart.js";
import {
  Brain, Play, Square, CheckCircle2, AlertCircle,
  Clock, Activity, Database, Cpu, ChevronDown, ChevronUp,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import ProgressBar from "../components/ui/ProgressBar";
import FormField, { ThemedInput } from "../components/ui/FormField";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const STATUS_CONFIG = {
  idle:      { label: "Idle",      variant: "default",  Icon: Clock },
  training:  { label: "Training",  variant: "info",     Icon: Activity },
  completed: { label: "Completed", variant: "success",  Icon: CheckCircle2 },
  failed:    { label: "Failed",    variant: "danger",   Icon: AlertCircle },
};

const LOG_COLORS = {
  ok:    "var(--success)",
  err:   "var(--danger)",
  warn:  "var(--warning)",
  info:  "var(--info)",
  epoch: "var(--accent-2)",
};

export default function ModelTraining() {
  const { isDark } = useTheme();
  const [config, setConfig] = useState({
    location: "Lahore", days_back: 30, epochs: 5, seq_len: 24, units: 16, batch_size: 64,
  });
  const [status, setStatus] = useState("idle");
  const [logs, setLogs] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [lastMetric, setLastMetric] = useState(null);
  const [showLogs, setShowLogs] = useState(true);
  const esRef = useRef(null);
  const logsEndRef = useRef(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs, metrics]);

  const handleStart = () => {
    if (esRef.current) esRef.current.close();
    setLogs([]); setMetrics([]); setLastMetric(null); setStatus("training");

    const token = localStorage.getItem("auth_token") || "";
    const url = `${API_URL}/train?location=${encodeURIComponent(config.location)}&days_back=${config.days_back}&epochs=${config.epochs}&seq_len=${config.seq_len}&units=${config.units}&batch_size=${config.batch_size}&token=${encodeURIComponent(token)}`;

    const es = new EventSource(url);
    esRef.current = es;

    es.onmessage = (e) => {
      const raw = e.data;
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.epoch !== undefined) {
          const inner = JSON.parse(parsed.msg);
          const m = { epoch: inner.epoch, total: inner.total, loss: inner.loss, val_loss: inner.val_loss, mae: inner.mae, pct: inner.pct };
          setMetrics((prev) => [...prev, m]);
          setLastMetric(m);
        } else if (parsed?.msg === "DONE") {
          setStatus(parsed.level === "err" ? "failed" : "completed");
          es.close();
        } else {
          setLogs((prev) => [...prev, { msg: parsed.msg || raw, level: parsed.level || "info" }]);
        }
      } catch {
        if (raw === "DONE") { setStatus("completed"); es.close(); }
        else setLogs((prev) => [...prev, { msg: raw, level: "info" }]);
      }
    };

    es.onerror = () => {
      setStatus("failed");
      setLogs((prev) => [...prev, { msg: "[Connection lost. Training may still run server-side.]", level: "err" }]);
      es.close();
    };
  };

  const handleStop = () => {
    esRef.current?.close();
    setStatus("idle");
    setLogs((prev) => [...prev, { msg: "[Training stream closed by user.]", level: "warn" }]);
  };

  const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";
  const tickColor = isDark ? "#8b949e" : "#6b7280";
  const tooltipBg = isDark ? "#1c2330" : "#fff";

  const lossChartData = {
    labels: metrics.map((m) => `Ep ${m.epoch}`),
    datasets: [
      { label: "Train Loss", data: metrics.map((m) => m.loss), borderColor: "#f97316", backgroundColor: isDark ? "rgba(249,115,22,0.1)" : "rgba(249,115,22,0.07)", tension: 0.3, fill: true, pointRadius: 3 },
      { label: "Val Loss", data: metrics.map((m) => m.val_loss), borderColor: "#2563eb", backgroundColor: "transparent", tension: 0.3, pointRadius: 3 },
    ],
  };

  const lossChartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: "top", labels: { color: tickColor, font: { size: 11 }, boxWidth: 14 } },
      tooltip: { mode: "index", intersect: false, backgroundColor: tooltipBg, borderColor: isDark ? "#30363d" : "#e5e7eb", borderWidth: 1 },
    },
    scales: {
      y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: tickColor, font: { size: 11 } }, title: { display: true, text: "Loss (MSE)", color: tickColor } },
      x: { grid: { display: false }, ticks: { color: tickColor, font: { size: 11 } } },
    },
  };

  const progress = lastMetric ? lastMetric.pct : 0;
  const { label: statusLabel, variant: statusVariant, Icon: StatusIcon } = STATUS_CONFIG[status];
  const isTraining = status === "training";

  const configFields = [
    { label: "Location", key: "location", type: "text" },
    { label: "Days Back", key: "days_back", type: "number", min: 7, max: 180 },
    { label: "Epochs", key: "epochs", type: "number", min: 1, max: 50 },
    { label: "Sequence Length", key: "seq_len", type: "number", min: 12, max: 72 },
    { label: "LSTM Units", key: "units", type: "number", min: 8, max: 64 },
    { label: "Batch Size", key: "batch_size", type: "number", min: 16, max: 256 },
  ];

  return (
    <div className="space-y-5">
      {/* Config + metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Config */}
        <Card padding="lg">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Cpu style={{ width: 18, height: 18, color: "var(--accent-2)" }} />
              <h3 className="text-base font-bold" style={{ color: "var(--text)" }}>
                Training Configuration
              </h3>
            </div>
            <Badge variant={statusVariant} icon={StatusIcon}>{statusLabel}</Badge>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {configFields.map(({ label, key, type, min, max }) => (
              <FormField key={key} label={label}>
                <ThemedInput
                  type={type}
                  min={min}
                  max={max}
                  value={config[key]}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, [key]: type === "number" ? Number(e.target.value) : e.target.value }))
                  }
                  disabled={isTraining}
                />
              </FormField>
            ))}
          </div>

          <div className="flex gap-3 mt-5">
            <Button
              variant="primary"
              icon={Play}
              onClick={handleStart}
              disabled={isTraining}
              loading={isTraining}
              fullWidth
            >
              {isTraining ? "Training…" : "Start Training"}
            </Button>
            {isTraining && (
              <Button variant="danger" icon={Square} onClick={handleStop}>
                Stop
              </Button>
            )}
          </div>
        </Card>

        {/* Metrics */}
        <Card padding="lg">
          <div className="flex items-center gap-2 mb-5">
            <Activity style={{ width: 18, height: 18, color: "var(--info)" }} />
            <h3 className="text-base font-bold" style={{ color: "var(--text)" }}>
              Live Performance Metrics
            </h3>
          </div>

          <ProgressBar
            value={progress}
            max={100}
            label={lastMetric ? `Epoch ${lastMetric.epoch} / ${lastMetric.total}` : "Training Progress"}
          />

          <div className="grid grid-cols-2 gap-3 mt-5">
            {[
              { label: "Train Loss", value: lastMetric ? lastMetric.loss.toFixed(6) : "—" },
              { label: "Val Loss", value: lastMetric ? lastMetric.val_loss.toFixed(6) : "—" },
              { label: "MAE", value: lastMetric ? lastMetric.mae.toFixed(6) : "—" },
              { label: "RMSE", value: lastMetric ? Math.sqrt(lastMetric.loss).toFixed(6) : "—" },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="p-3 rounded-lg"
                style={{ background: "var(--surface-soft)", border: "1px solid var(--border)" }}
              >
                <p className="text-xs mb-0.5" style={{ color: "var(--muted)" }}>{label}</p>
                <p className="text-sm font-bold font-mono" style={{ color: "var(--text)" }}>{value}</p>
              </div>
            ))}
          </div>

          {status === "completed" && (
            <div
              className="mt-4 p-3 rounded-lg flex items-center gap-2 text-xs font-semibold"
              style={{ background: "rgba(22,163,74,0.08)", color: "var(--success)", border: "1px solid rgba(22,163,74,0.2)" }}
            >
              <CheckCircle2 style={{ width: 14, height: 14 }} />
              Training completed successfully. Model artifacts saved.
            </div>
          )}
        </Card>
      </div>

      {/* Loss chart */}
      {metrics.length > 0 && (
        <Card padding="lg">
          <h3 className="text-sm font-bold mb-4" style={{ color: "var(--text)" }}>
            Training Loss Curves
          </h3>
          <div className="chart-container" style={{ height: 220 }}>
            <Line data={lossChartData} options={lossChartOptions} />
          </div>
        </Card>
      )}

      {/* Dataset summary */}
      <Card padding="lg">
        <div className="flex items-center gap-2 mb-4">
          <Database style={{ width: 17, height: 17, color: "var(--success)" }} />
          <h3 className="text-sm font-bold" style={{ color: "var(--text)" }}>
            Dataset Summary
          </h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Feature Columns", value: "7 features" },
            { label: "Sequence Length", value: `${config.seq_len} hours` },
            { label: "Target Variable", value: "kWh / panel / hour" },
            { label: "Train / Val Split", value: "85% / 15%" },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="p-3 rounded-lg"
              style={{ background: "var(--surface-soft)", border: "1px solid var(--border)" }}
            >
              <p className="text-xs mb-0.5" style={{ color: "var(--muted)" }}>{label}</p>
              <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{value}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Log panel */}
      <Card padding="none" className="overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-5 py-3.5 transition-colors"
          style={{ borderBottom: showLogs ? "1px solid var(--border)" : "none" }}
          onClick={() => setShowLogs((v) => !v)}
        >
          <div className="flex items-center gap-2">
            <Brain style={{ width: 16, height: 16, color: "var(--muted)" }} />
            <span className="text-sm font-bold" style={{ color: "var(--text)" }}>
              Training Logs
            </span>
            <Badge variant="default">{logs.length + metrics.length} lines</Badge>
          </div>
          {showLogs
            ? <ChevronUp style={{ width: 14, height: 14, color: "var(--muted)" }} />
            : <ChevronDown style={{ width: 14, height: 14, color: "var(--muted)" }} />}
        </button>

        {showLogs && (
          <div
            className="px-4 py-3 h-56 overflow-y-auto font-mono text-xs leading-5"
            style={{ background: "#0d1117", color: "#c9d1d9" }}
          >
            {logs.length === 0 && metrics.length === 0 ? (
              <span style={{ color: "#6e7681" }}>Logs will appear when training starts…</span>
            ) : (
              <>
                {logs.map((l, i) => (
                  <div key={i} style={{ color: LOG_COLORS[l.level] || "#c9d1d9" }}>{l.msg}</div>
                ))}
                {metrics.map((m) => (
                  <div key={`ep-${m.epoch}`} style={{ color: LOG_COLORS.epoch }}>
                    [Epoch {m.epoch}/{m.total}] loss={m.loss.toFixed(6)} val_loss={m.val_loss.toFixed(6)} mae={m.mae.toFixed(6)} ({m.pct}%)
                  </div>
                ))}
              </>
            )}
            <div ref={logsEndRef} />
          </div>
        )}
      </Card>
    </div>
  );
}
