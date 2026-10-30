import React, { useState } from "react";
import {
  Server, Cloud, Cpu, DollarSign, Sliders, Save,
  CheckCircle2, RefreshCw, Palette,
} from "lucide-react";
import { apiService } from "../services/api";
import { useTheme } from "../context/ThemeContext";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Toggle from "../components/ui/Toggle";
import FormField, { ThemedInput } from "../components/ui/FormField";

function Section({ icon: Icon, title, subtitle, children }) {
  return (
    <Card padding="none" className="overflow-hidden">
      <div
        className="px-5 py-4 flex items-center gap-3"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <Icon style={{ width: 17, height: 17, color: "var(--accent-2)" }} />
        <div>
          <h3 className="text-sm font-bold" style={{ color: "var(--text)" }}>{title}</h3>
          {subtitle && <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{subtitle}</p>}
        </div>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </Card>
  );
}

const load = (key, def) => localStorage.getItem(key) ?? def;

export default function Settings() {
  const { theme, toggleTheme, isDark } = useTheme();

  const [apiUrl, setApiUrl] = useState(load("setting_api_url", "http://localhost:8000"));
  const [defaultLocation, setDefaultLocation] = useState(load("setting_default_location", "Lahore"));
  const [defaultTz, setDefaultTz] = useState(load("setting_default_tz", "Asia/Karachi"));
  const [pkrRate, setPkrRate] = useState(load("setting_pkr_rate", "55"));
  const [co2Factor, setCo2Factor] = useState(load("setting_co2_factor", "0.55"));
  const [ensemble, setEnsemble] = useState(load("setting_ensemble", "true") === "true");
  const [zeroGuard, setZeroGuard] = useState(load("setting_zero_guard", "true") === "true");
  const [debugLogging, setDebugLogging] = useState(load("setting_debug_logging", "false") === "true");
  const [apiStatus, setApiStatus] = useState("idle");
  const [apiTesting, setApiTesting] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem("setting_api_url", apiUrl);
    localStorage.setItem("setting_default_location", defaultLocation);
    localStorage.setItem("setting_default_tz", defaultTz);
    localStorage.setItem("setting_pkr_rate", pkrRate);
    localStorage.setItem("setting_co2_factor", co2Factor);
    localStorage.setItem("setting_ensemble", String(ensemble));
    localStorage.setItem("setting_zero_guard", String(zeroGuard));
    localStorage.setItem("setting_debug_logging", String(debugLogging));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleTestApi = async () => {
    setApiTesting(true);
    setApiStatus("idle");
    try {
      const ok = await apiService.ping();
      setApiStatus(ok ? "ok" : "fail");
    } catch {
      setApiStatus("fail");
    } finally {
      setApiTesting(false);
    }
  };

  const handleReset = () => {
    ["setting_api_url", "setting_default_location", "setting_default_tz",
      "setting_pkr_rate", "setting_co2_factor", "setting_ensemble",
      "setting_zero_guard", "setting_debug_logging"].forEach((k) => localStorage.removeItem(k));
    window.location.reload();
  };

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>
            Application Settings
          </h2>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
            Manage API, ML options, and forecasting defaults
          </p>
        </div>
        <Button
          variant={saved ? "success" : "primary"}
          icon={saved ? CheckCircle2 : Save}
          onClick={handleSave}
        >
          {saved ? "Saved!" : "Save Settings"}
        </Button>
      </div>

      {/* API Connection */}
      <Section icon={Server} title="API Connection" subtitle="Backend server configuration">
        <FormField label="Backend API URL" helper="FastAPI server that powers forecasting.">
          <ThemedInput
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder="http://localhost:8000"
          />
        </FormField>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            loading={apiTesting}
            onClick={handleTestApi}
          >
            {apiTesting ? "Testing…" : "Test Connection"}
          </Button>
          {apiStatus === "ok" && (
            <span className="text-sm font-semibold flex items-center gap-1" style={{ color: "var(--success)" }}>
              <CheckCircle2 style={{ width: 14, height: 14 }} /> Connected
            </span>
          )}
          {apiStatus === "fail" && (
            <span className="text-sm font-semibold" style={{ color: "var(--danger)" }}>
              Connection failed
            </span>
          )}
        </div>
      </Section>

      {/* Weather Provider */}
      <Section icon={Cloud} title="Weather Provider" subtitle="OpenWeatherMap & forecast defaults">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Default Location">
            <ThemedInput
              value={defaultLocation}
              onChange={(e) => setDefaultLocation(e.target.value)}
              placeholder="e.g. Lahore"
            />
          </FormField>
          <FormField label="Default Timezone" helper="IANA timezone string">
            <ThemedInput
              value={defaultTz}
              onChange={(e) => setDefaultTz(e.target.value)}
              placeholder="Asia/Karachi"
            />
          </FormField>
        </div>
      </Section>

      {/* ML Engine */}
      <Section icon={Cpu} title="ML Engine" subtitle="LSTM model and prediction pipeline">
        <div style={{ borderBottom: "1px solid var(--border)" }}>
          <Toggle
            label="Ensemble Mode"
            description="Blend ML model with physics-based baseline for improved accuracy."
            checked={ensemble}
            onChange={setEnsemble}
          />
        </div>
        <div style={{ borderBottom: "1px solid var(--border)" }}>
          <Toggle
            label="Zero Guard"
            description="Clamp night-time predictions to 0 kWh (prevents negative outputs)."
            checked={zeroGuard}
            onChange={setZeroGuard}
          />
        </div>
        <Toggle
          label="Debug Logging"
          description="Enable verbose server-side logging for forecast and training."
          checked={debugLogging}
          onChange={setDebugLogging}
        />
      </Section>

      {/* Electricity Pricing */}
      <Section icon={DollarSign} title="Electricity Pricing" subtitle="Used for savings and CO₂ calculations">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="PKR Rate per kWh" helper="Your electricity tariff in Pakistani Rupees.">
            <ThemedInput
              type="number"
              value={pkrRate}
              onChange={(e) => setPkrRate(e.target.value)}
              placeholder="e.g. 55"
            />
          </FormField>
          <FormField label="CO₂ Emission Factor (kg/kWh)" helper="Grid carbon intensity for your region.">
            <ThemedInput
              type="number"
              value={co2Factor}
              onChange={(e) => setCo2Factor(e.target.value)}
              placeholder="e.g. 0.55"
            />
          </FormField>
        </div>
        <p className="text-xs p-3 rounded-lg" style={{ background: "rgba(37,99,235,0.07)", color: "var(--info)" }}>
          These values are stored locally in your browser and used for savings and carbon calculations.
        </p>
      </Section>

      {/* Theme */}
      <Section icon={Palette} title="Theme" subtitle="Light and dark mode preference">
        <Toggle
          label="Dark Mode"
          description="Switch between light and dark theme. Saved automatically."
          checked={isDark}
          onChange={toggleTheme}
        />
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          Current theme: <span className="font-semibold" style={{ color: "var(--text)" }}>{theme}</span>
        </p>
      </Section>

      {/* App Preferences */}
      <Section icon={Sliders} title="App Preferences" subtitle="Reset and maintenance">
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
              Reset All Settings
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
              Clear all saved settings and reload the page.
            </p>
          </div>
          <Button variant="danger" size="sm" onClick={handleReset}>
            Reset
          </Button>
        </div>
      </Section>

      {/* Footer save */}
      <div className="flex justify-end pb-2">
        <Button
          variant={saved ? "success" : "primary"}
          icon={saved ? CheckCircle2 : Save}
          onClick={handleSave}
        >
          {saved ? "Saved!" : "Save All Settings"}
        </Button>
      </div>
    </div>
  );
}
