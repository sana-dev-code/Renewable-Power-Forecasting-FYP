// ForecastForm.tsx — Themed Solar Calculator Form (light + dark)
import React, { useEffect, useMemo, useState } from "react";
import { ForecastInput } from "../services/api";
import { MapPin, Sun, Calendar, DollarSign, Loader2 } from "lucide-react";

interface ForecastFormProps {
  onSubmit: (input: ForecastInput) => void;
  loading: boolean;
  extras: { tariff: number; emissionFactor: number };
  setExtras: (e: { tariff: number; emissionFactor: number }) => void;
}

export const RECOMMENDED_EF: Record<string, number> = {
  // Punjab
  Lahore: 0.55, Rawalpindi: 0.52, Islamabad: 0.50, Faisalabad: 0.55,
  Multan: 0.55, Gujranwala: 0.55, Sialkot: 0.54, Gujrat: 0.54,
  Sahiwal: 0.55, Bahawalpur: 0.56, "Rahim Yar Khan": 0.56,
  Sheikhupura: 0.55, Okara: 0.55, Jhang: 0.55, Kasur: 0.55,
  Mianwali: 0.54, Attock: 0.53,
  // Sindh
  Karachi: 0.60, Hyderabad: 0.58, Sukkur: 0.57, Larkana: 0.57,
  Nawabshah: 0.57, Mirpurkhas: 0.58, Thatta: 0.58, Badin: 0.58,
  // KPK
  Peshawar: 0.55, Mardan: 0.54, Abbottabad: 0.52, Swat: 0.51,
  Mansehra: 0.52, Kohat: 0.54, "Dera Ismail Khan": 0.55, Nowshera: 0.54,
  // Balochistan
  Quetta: 0.60, Gwadar: 0.59, Turbat: 0.59, Khuzdar: 0.58, Chaman: 0.60,
  // AJK & GB
  Muzaffarabad: 0.50, Mirpur: 0.51, Gilgit: 0.48, Skardu: 0.48,
};

const DEFAULT_EF = 0.55;
const norm = (s: string) => (s || "").trim().toLowerCase().replace(/\s+/g, " ");

// ── Section wrapper ──────────────────────────────────────
function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span style={{ color: "var(--accent-2)" }}>{icon}</span>
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
          {title}
        </span>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function FieldLabel({ children, helper }: { children: React.ReactNode; helper?: string }) {
  return (
    <div className="mb-1.5">
      <label className="block text-sm font-semibold" style={{ color: "var(--text)" }}>
        {children}
      </label>
      {helper && (
        <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
          {helper}
        </p>
      )}
    </div>
  );
}

// ── Main form ────────────────────────────────────────────
export function ForecastForm({ onSubmit, loading, extras, setExtras }: ForecastFormProps) {
  const [form, setForm] = useState<ForecastInput & { other_city?: string }>({
    location: "Lahore",
    panel_type: "Mono",
    number_of_panels: 6,
    forecast_days: 7,
    other_city: "",
  });

  const [locationError, setLocationError] = useState("");
  const [panelError, setPanelError] = useState("");
  const [daysError, setDaysError] = useState("");
  const [autoPickEF, setAutoPickEF] = useState(true);
  const [userTypedEF, setUserTypedEF] = useState(false);

  const EF_BY_NORM = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(RECOMMENDED_EF)) out[norm(k)] = v;
    return out;
  }, []);

  const resolvedLocation = form.location === "Other" ? form.other_city || "" : form.location;
  const recommendedEF = EF_BY_NORM[norm(resolvedLocation)] ?? DEFAULT_EF;

  useEffect(() => {
    if (autoPickEF && !userTypedEF && (!extras.emissionFactor || extras.emissionFactor <= 0)) {
      setExtras({ ...extras, emissionFactor: recommendedEF });
    }
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (autoPickEF && !userTypedEF) {
      setExtras({ ...extras, emissionFactor: recommendedEF });
    }
    // eslint-disable-next-line
  }, [form.location, form.other_city, autoPickEF]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "location") setLocationError("");
    if (name === "number_of_panels") setPanelError("");
    if (name === "forecast_days") setDaysError("");
    const nums = ["number_of_panels", "forecast_days"];
    setForm({ ...form, [name]: nums.includes(name) ? Number(value) : value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let valid = true;
    const payload: ForecastInput = {
      location: resolvedLocation.trim(),
      panel_type: form.panel_type,
      number_of_panels: form.number_of_panels,
      forecast_days: form.forecast_days,
    };

    if (form.location === "Other") {
      if (!payload.location) { setLocationError("Please type a city name."); valid = false; }
      else if (!EF_BY_NORM[norm(payload.location)]) { setLocationError("City not in supported list."); valid = false; }
    } else if (!RECOMMENDED_EF[payload.location]) {
      setLocationError("Invalid city selected."); valid = false;
    }
    if (form.number_of_panels < 1 || form.number_of_panels > 100) {
      setPanelError("Panels must be between 1 and 100."); valid = false;
    }
    if (form.forecast_days < 1 || form.forecast_days > 30) {
      setDaysError("Forecast days must be between 1 and 30."); valid = false;
    }
    if (!valid) return;
    onSubmit(payload);
  };

  const systemKwp = (form.number_of_panels * 0.55).toFixed(2);

  const divider = (
    <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Location */}
      <Section title="Location & Weather" icon={<MapPin style={{ width: 14, height: 14 }} />}>
        <div>
          <FieldLabel helper="City for real-time weather via OpenWeatherMap">Location</FieldLabel>
          <select
            name="location"
            value={form.location}
            onChange={handleChange}
            className="input-base"
          >
            {Object.keys(RECOMMENDED_EF).map((city) => (
              <option key={city} value={city}>{city}</option>
            ))}
            <option value="Other">Other (type below)</option>
          </select>
          {form.location === "Other" && (
            <input
              type="text"
              value={form.other_city || ""}
              onChange={(e) => { setLocationError(""); setForm({ ...form, other_city: e.target.value }); }}
              placeholder="Type your city"
              className="input-base mt-2"
            />
          )}
          {locationError
            ? <p className="text-xs mt-1.5 font-medium" style={{ color: "var(--danger)" }}>{locationError}</p>
            : <p className="text-xs mt-1.5" style={{ color: "var(--muted)" }}>
                CO₂ factor: <strong>{recommendedEF.toFixed(2)}</strong> kg/kWh
              </p>
          }
        </div>
      </Section>

      {divider}

      {/* Panel setup */}
      <Section title="Solar System Setup" icon={<Sun style={{ width: 14, height: 14 }} />}>
        <div>
          <FieldLabel helper="Solar PV technology type">Panel Technology</FieldLabel>
          <select name="panel_type" value={form.panel_type} onChange={handleChange} className="input-base">
            <option value="Mono">Monocrystalline — 18–22% efficiency</option>
            <option value="Poly">Polycrystalline — 15–17% efficiency</option>
            <option value="Thin-Film">Thin Film — 10–13% efficiency</option>
          </select>
        </div>
        <div>
          <FieldLabel helper="Total panels on your rooftop">Number of Panels</FieldLabel>
          <input
            type="number"
            name="number_of_panels"
            min={1} max={100}
            value={form.number_of_panels}
            onChange={handleChange}
            className="input-base"
          />
          {panelError
            ? <p className="text-xs mt-1.5 font-medium" style={{ color: "var(--danger)" }}>{panelError}</p>
            : <p className="text-xs mt-1.5" style={{ color: "var(--muted)" }}>
                System capacity: <strong>{systemKwp} kWp</strong> (at 550W/panel)
              </p>
          }
        </div>
      </Section>

      {divider}

      {/* Forecast days */}
      <Section title="Forecast Duration" icon={<Calendar style={{ width: 14, height: 14 }} />}>
        <div>
          <FieldLabel helper="Number of days to predict (1–30)">Forecast Days</FieldLabel>
          <input
            type="number"
            name="forecast_days"
            min={1} max={30}
            value={form.forecast_days}
            onChange={handleChange}
            className="input-base"
          />
          {daysError && (
            <p className="text-xs mt-1.5 font-medium" style={{ color: "var(--danger)" }}>{daysError}</p>
          )}
        </div>
      </Section>

      {divider}

      {/* Electricity pricing */}
      <Section title="Electricity Pricing" icon={<DollarSign style={{ width: 14, height: 14 }} />}>
        <div>
          <FieldLabel helper="Your WAPDA / utility tariff">Tariff (PKR/kWh)</FieldLabel>
          <input
            type="number" min={0} step="0.01"
            value={extras.tariff}
            onChange={(e) => setExtras({ ...extras, tariff: Number(e.target.value) })}
            placeholder="e.g. 55"
            className="input-base"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              CO₂ Factor (kg/kWh)
            </label>
            <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none" style={{ color: "var(--muted)" }}>
              <input
                type="checkbox"
                checked={autoPickEF}
                onChange={(e) => setAutoPickEF(e.target.checked)}
                style={{ accentColor: "var(--accent-2)" }}
              />
              Auto
            </label>
          </div>
          <input
            type="number" min={0} step="0.01"
            value={extras.emissionFactor}
            onChange={(e) => { setUserTypedEF(true); setExtras({ ...extras, emissionFactor: Number(e.target.value) }); }}
            placeholder={`e.g. ${recommendedEF.toFixed(2)}`}
            className="input-base"
          />
          <p className="text-xs mt-1.5" style={{ color: "var(--muted)" }}>
            Keep <strong>Auto</strong> on for city-specific emission data.
          </p>
        </div>
      </Section>

      {/* Submit button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 font-bold py-3 px-6 rounded-xl text-sm transition-all"
        style={{
          background: loading ? "var(--muted)" : "var(--accent-2)",
          color: "#fff",
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? (
          <>
            <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" />
            Generating Forecast…
          </>
        ) : (
          "Generate Solar Forecast"
        )}
      </button>
    </form>
  );
}
