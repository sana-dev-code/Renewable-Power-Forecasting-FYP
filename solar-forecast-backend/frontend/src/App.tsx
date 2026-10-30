// App.tsx — SolarCast Pro · Refactored SaaS Shell
import React, { useEffect, useState } from "react";
import "./index.css";

// ── Context providers ──────────────────────────────────────
import { ThemeProvider } from "./context/ThemeContext";
import { ForecastProvider, useForecast } from "./context/ForecastContext";

// ── Auth screens ───────────────────────────────────────────
import { Login, Signup } from "./pages/AuthScreens";

// ── Layout shell ───────────────────────────────────────────
import AppShell from "./components/layout/AppShell";

// ── Pages ──────────────────────────────────────────────────
import Dashboard      from "./pages/Dashboard";
import Forecast       from "./pages/Forecast";
import Analytics      from "./pages/Analytics";
import History        from "./pages/History";
import ModelTraining  from "./pages/ModelTraining";
import DatasetBuilder from "./pages/DatasetBuilder";
import Settings       from "./pages/Settings";

// ── Services ───────────────────────────────────────────────
import { apiService } from "./services/api";

type Tab = "dashboard" | "forecast" | "analytics" | "history" | "training" | "dataset" | "settings";

// ─────────────────────────────────────────────────────────
// Inner app — has access to ForecastContext
// ─────────────────────────────────────────────────────────
function InnerApp() {
  const { forecastResult, isDemo, totalForecastCount } = useForecast();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authScreen, setAuthScreen] = useState<"login" | "signup">("login");
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [apiStatus, setApiStatus] = useState<"checking" | "online" | "offline">("checking");

  // Auth check on mount
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    setIsAuthenticated(!!token);
  }, []);

  // API health check
  useEffect(() => {
    (async () => {
      try {
        const ok = await apiService.ping();
        setApiStatus(ok ? "online" : "offline");
      } catch {
        setApiStatus("offline");
      }
    })();
  }, []);

  const checkApi = async () => {
    setApiStatus("checking");
    try {
      const ok = await apiService.ping();
      setApiStatus(ok ? "online" : "offline");
    } catch {
      setApiStatus("offline");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    setIsAuthenticated(false);
  };

  // ── Auth gate ───────────────────────────────────────────
  if (!isAuthenticated) {
    return authScreen === "login" ? (
      <Login
        onLoginSuccess={() => setIsAuthenticated(true)}
        onSwitchToSignup={() => setAuthScreen("signup")}
      />
    ) : (
      <Signup
        onSignupSuccess={() => setIsAuthenticated(true)}
        onSwitchToLogin={() => setAuthScreen("login")}
      />
    );
  }

  // ── Main shell ──────────────────────────────────────────
  return (
    <AppShell
      activeTab={activeTab}
      onNavigate={(tab: Tab) => setActiveTab(tab)}
      onLogout={handleLogout}
      apiStatus={apiStatus}
      onRefreshApi={checkApi}
      isDemo={isDemo}
      forecastResult={forecastResult}
      totalForecastCount={totalForecastCount}
    >
      {activeTab === "dashboard" && (
        <Dashboard onNavigateToForecast={() => setActiveTab("forecast")} />
      )}
      {activeTab === "forecast" && (
        <Forecast onCheckApi={checkApi} />
      )}
      {activeTab === "analytics" && (
        <Analytics onNavigateToForecast={() => setActiveTab("forecast")} />
      )}
      {activeTab === "history" && (
        <History onNavigateToForecast={() => setActiveTab("forecast")} />
      )}
      {activeTab === "training" && <ModelTraining />}
      {activeTab === "dataset"  && <DatasetBuilder />}
      {activeTab === "settings" && <Settings />}
    </AppShell>
  );
}

// ─────────────────────────────────────────────────────────
// Root — wraps providers
// ─────────────────────────────────────────────────────────
export default function App() {
  return (
    <ThemeProvider>
      <ForecastProvider>
        <InnerApp />
      </ForecastProvider>
    </ThemeProvider>
  );
}
