import React from "react";
import {
  Menu,
  LogOut,
  Sun,
  Moon,
  Wifi,
  WifiOff,
  Loader2,
  FlaskConical,
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import Badge from "../ui/Badge";

const PAGE_META = {
  dashboard: { title: "Dashboard",        subtitle: "System overview and solar production metrics" },
  forecast:  { title: "Solar Forecast",   subtitle: "Generate ML-powered solar energy predictions" },
  analytics: { title: "Analytics",        subtitle: "Deep-dive into production trends and efficiency" },
  history:   { title: "Forecast History", subtitle: "Browse and export all saved forecast sessions" },
  training:  { title: "Model Training",   subtitle: "Train the LSTM neural network on historical data" },
  dataset:   { title: "Dataset Builder",  subtitle: "Inspect and preview the ML training dataset" },
  settings:  { title: "Settings",         subtitle: "Configure API, weather provider, and preferences" },
};

export default function Topbar({
  activeTab,
  onMenuClick,
  onLogout,
  apiStatus,
  onRefreshApi,
  isDemo,
}) {
  const { isDark, toggleTheme } = useTheme();
  const meta = PAGE_META[activeTab] || PAGE_META.dashboard;

  return (
    <header
      className="h-14 flex items-center px-4 gap-3 sticky top-0 z-10 shrink-0"
      style={{
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* Hamburger (mobile) */}
      <button
        className="lg:hidden p-1.5 rounded-md focus:outline-none"
        style={{ color: "var(--muted)" }}
        onClick={onMenuClick}
        aria-label="Open navigation"
      >
        <Menu style={{ width: 18, height: 18 }} />
      </button>

      {/* Page title */}
      <div className="min-w-0 flex-1">
        <h1
          className="text-sm font-bold leading-tight truncate"
          style={{ color: "var(--text)" }}
        >
          {meta.title}
        </h1>
        <p
          className="text-xs leading-tight truncate hidden sm:block"
          style={{ color: "var(--muted)" }}
        >
          {meta.subtitle}
        </p>
      </div>

      {/* Demo badge */}
      {isDemo && (
        <Badge variant="demo" icon={FlaskConical} className="hidden sm:inline-flex">
          Demo Data
        </Badge>
      )}

      {/* API status pill */}
      <button
        onClick={onRefreshApi}
        title="Click to re-check API status"
        className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border focus:outline-none transition-all"
        style={{
          background:
            apiStatus === "online"
              ? "rgba(22,163,74,0.08)"
              : apiStatus === "offline"
              ? "rgba(220,38,38,0.08)"
              : "rgba(217,119,6,0.08)",
          color:
            apiStatus === "online"
              ? "var(--success)"
              : apiStatus === "offline"
              ? "var(--danger)"
              : "var(--warning)",
          borderColor:
            apiStatus === "online"
              ? "rgba(22,163,74,0.25)"
              : apiStatus === "offline"
              ? "rgba(220,38,38,0.25)"
              : "rgba(217,119,6,0.25)",
        }}
      >
        {apiStatus === "online" ? (
          <Wifi style={{ width: 12, height: 12 }} />
        ) : apiStatus === "offline" ? (
          <WifiOff style={{ width: 12, height: 12 }} />
        ) : (
          <Loader2 style={{ width: 12, height: 12 }} className="animate-spin" />
        )}
        {apiStatus === "online" ? "Online" : apiStatus === "offline" ? "Offline" : "…"}
      </button>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        className="p-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-2)] transition-colors"
        style={{
          background: "var(--surface-soft)",
          color: "var(--text-secondary)",
        }}
        aria-label="Toggle theme"
      >
        {isDark ? (
          <Sun style={{ width: 16, height: 16 }} />
        ) : (
          <Moon style={{ width: 16, height: 16 }} />
        )}
      </button>

      {/* Logout */}
      <button
        onClick={onLogout}
        title="Logout"
        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger)] transition-colors"
        style={{ color: "var(--muted)", background: "transparent" }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "var(--danger)";
          e.currentTarget.style.background = "var(--surface-soft)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "var(--muted)";
          e.currentTarget.style.background = "transparent";
        }}
      >
        <LogOut style={{ width: 14, height: 14 }} />
        <span className="hidden sm:inline">Logout</span>
      </button>
    </header>
  );
}
