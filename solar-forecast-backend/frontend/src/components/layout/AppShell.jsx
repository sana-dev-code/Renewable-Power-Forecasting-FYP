import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { Activity } from "lucide-react";

export default function AppShell({
  activeTab,
  onNavigate,
  onLogout,
  apiStatus,
  onRefreshApi,
  isDemo,
  forecastResult,
  totalForecastCount,
  children,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div
      className="min-h-screen flex"
      style={{ background: "var(--bg)" }}
    >
      <Sidebar
        activeTab={activeTab}
        onNavigate={onNavigate}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        apiStatus={apiStatus}
        totalForecastCount={totalForecastCount}
        isDemo={isDemo}
        forecastResult={forecastResult}
      />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 main-content">
        <Topbar
          activeTab={activeTab}
          onMenuClick={() => setSidebarOpen(true)}
          onLogout={onLogout}
          apiStatus={apiStatus}
          onRefreshApi={onRefreshApi}
          isDemo={isDemo}
        />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 animate-fade-in">
          {children}
        </main>

        {/* Footer */}
        <footer
          className="px-5 py-2.5 text-xs flex items-center justify-between shrink-0 no-print"
          style={{
            borderTop: "1px solid var(--border)",
            background: "var(--surface)",
            color: "var(--muted)",
          }}
        >
          <span>SolarCast Pro · Final Year Project · ML-Powered Solar Forecasting</span>
          <span className="hidden sm:flex items-center gap-1.5">
            <Activity style={{ width: 12, height: 12, color: "var(--accent)" }} />
            LSTM + Physics Ensemble · OpenWeatherMap
          </span>
        </footer>
      </div>
    </div>
  );
}
