import React from "react";
import { Calculator, Sun, AlertCircle, RefreshCw, Wifi } from "lucide-react";
import { useForecast } from "../context/ForecastContext";
import { ForecastForm } from "../components/ForecastForm";
import { ForecastResults } from "../components/ForecastResults";
import { SkeletonResults } from "../components/SkeletonResults";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";

export default function Forecast({ onCheckApi }) {
  const {
    forecastResult, loading, error, extras, setExtras,
    runForecast, loadDemo, retryLastForecast,
  } = useForecast();

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
      {/* Form column */}
      <div className="xl:col-span-2">
        <Card padding="lg">
          <div className="flex items-center gap-3 mb-5">
            <div
              className="p-2 rounded-lg"
              style={{ background: "rgba(249,115,22,0.1)" }}
            >
              <Calculator style={{ width: 18, height: 18, color: "var(--accent-2)" }} />
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>
                Solar Calculator
              </h2>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                Configure your system for ML forecast
              </p>
            </div>
          </div>
          <ForecastForm
            onSubmit={runForecast}
            loading={loading}
            extras={extras}
            setExtras={setExtras}
          />
        </Card>
      </div>

      {/* Results column */}
      <div className="xl:col-span-3 space-y-4">
        {/* Error */}
        {error && (
          <div
            className="p-4 rounded-xl border"
            style={{ background: "rgba(220,38,38,0.06)", borderColor: "rgba(220,38,38,0.2)" }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle style={{ width: 18, height: 18, color: "var(--danger)", flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p className="text-sm font-bold" style={{ color: "var(--danger)" }}>
                    Forecast Failed
                  </p>
                  <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                    {error}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="danger" size="sm" icon={RefreshCw} onClick={retryLastForecast}>
                  Retry
                </Button>
                <Button variant="outline" size="sm" icon={Wifi} onClick={onCheckApi}>
                  Re-check API
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && <SkeletonResults />}

        {/* Results */}
        {forecastResult && !loading && !error && (
          <ForecastResults result={forecastResult} extras={extras} />
        )}

        {/* Empty */}
        {!forecastResult && !loading && !error && (
          <EmptyState
            icon={Sun}
            title="Ready to Generate Your Forecast"
            description="Configure your solar system on the left and click Generate Solar Forecast to receive an ML-powered prediction."
            secondaryAction={{
              label: "Or load a Lahore sample",
              onClick: loadDemo,
            }}
          />
        )}
      </div>
    </div>
  );
}
