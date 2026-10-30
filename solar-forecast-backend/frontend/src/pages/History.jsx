import React, { useEffect, useMemo, useState } from "react";
import {
  Search, Filter, Download, Trash2, History as HistoryIcon,
  ArrowUpDown, ChevronUp, ChevronDown, ArrowRight,
  CalendarDays, MapPin,
} from "lucide-react";
import { apiService } from "../services/api";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import EmptyState from "../components/ui/EmptyState";

function totalKwh(fc) {
  if (!fc.daily_json) return 0;
  return fc.daily_json.reduce((s, d) => s + (d.total_kWh || 0), 0);
}
function confNum(c) {
  return parseFloat((c || "0").replace("%", "")) || 0;
}
function confVariant(c) {
  const n = confNum(c);
  if (n >= 85) return "success";
  if (n >= 70) return "warning";
  return "danger";
}

export default function History({ onNavigateToForecast }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [filterPanel, setFilterPanel] = useState("all");
  const [filterConf, setFilterConf] = useState("all");
  const [sortKey, setSortKey] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiService.getHistoricalForecasts(50);
        setRecords(data);
      } catch {
        setError("Could not load forecast history. Make sure the backend is running.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const panelTypes = useMemo(() => [...new Set(records.map((r) => r.panel_type))], [records]);

  const filtered = useMemo(() => {
    let data = [...records];
    if (search) {
      const q = search.toLowerCase();
      data = data.filter((r) => r.location.toLowerCase().includes(q));
    }
    if (filterPanel !== "all") data = data.filter((r) => r.panel_type === filterPanel);
    if (filterConf !== "all") {
      data = data.filter((r) => {
        const n = confNum(r.confidence || "0");
        if (filterConf === "high") return n >= 85;
        if (filterConf === "medium") return n >= 70 && n < 85;
        return n < 70;
      });
    }
    data.sort((a, b) => {
      let av, bv;
      if (sortKey === "created_at") { av = a.created_at; bv = b.created_at; }
      else if (sortKey === "location") { av = a.location; bv = b.location; }
      else if (sortKey === "total_kWh") { av = totalKwh(a); bv = totalKwh(b); }
      else { av = confNum(a.confidence); bv = confNum(b.confidence); }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return data;
  }, [records, search, filterPanel, filterConf, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <ArrowUpDown style={{ width: 12, height: 12, display: "inline", marginLeft: 3, color: "var(--muted)" }} />;
    return sortDir === "asc"
      ? <ChevronUp style={{ width: 12, height: 12, display: "inline", marginLeft: 3, color: "var(--accent-2)" }} />
      : <ChevronDown style={{ width: 12, height: 12, display: "inline", marginLeft: 3, color: "var(--accent-2)" }} />;
  };

  const handleExportCSV = () => {
    const header = ["Date", "Location", "Panel Type", "Panels", "Days", "Total kWh", "Avg/day kWh", "Confidence"];
    const rows = filtered.map((r) => {
      const total = totalKwh(r).toFixed(2);
      const avg = (totalKwh(r) / Math.max(r.forecast_days, 1)).toFixed(2);
      return [new Date(r.created_at).toLocaleDateString(), r.location, r.panel_type, r.panel_count, r.forecast_days, total, avg, r.confidence || "—"].join(",");
    });
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `solarcast_history_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    if (window.confirm("Clear locally cached history? Backend records remain.")) setRecords([]);
  };

  const selectStyle = {
    background: "var(--surface)",
    color: "var(--text)",
    borderColor: "var(--border)",
    borderRadius: "0.5rem",
    padding: "0.4rem 0.75rem",
    fontSize: "0.8125rem",
    outline: "none",
    border: "1px solid var(--border)",
  };

  if (loading) {
    return (
      <Card padding="lg" className="flex flex-col items-center justify-center py-16">
        <div className="w-10 h-10 rounded-full border-4 border-[var(--accent-2)] border-t-transparent animate-spin mx-auto mb-4" />
        <p className="text-sm" style={{ color: "var(--muted)" }}>Fetching forecast history…</p>
      </Card>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={HistoryIcon}
        title="Could Not Load History"
        description={error}
      />
    );
  }

  if (records.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="No Forecast History"
        description="Your saved forecasts will appear here once you run a forecast with a database-connected backend."
        primaryAction={{ label: "Run First Forecast", icon: ArrowRight, onClick: onNavigateToForecast }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <Card padding="md">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-grow min-w-[180px]">
            <Search
              style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "var(--muted)" }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by location…"
              className="input-base"
              style={{ paddingLeft: 30 }}
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter style={{ width: 14, height: 14, color: "var(--muted)" }} />
            <select value={filterPanel} onChange={(e) => setFilterPanel(e.target.value)} style={selectStyle}>
              <option value="all">All Panel Types</option>
              {panelTypes.map((pt) => <option key={pt} value={pt}>{pt}</option>)}
            </select>
          </div>

          <select value={filterConf} onChange={(e) => setFilterConf(e.target.value)} style={selectStyle}>
            <option value="all">All Confidence</option>
            <option value="high">High (≥ 85%)</option>
            <option value="medium">Medium (70–84%)</option>
            <option value="low">Low (&lt; 70%)</option>
          </select>

          <div className="flex-grow" />

          <Button variant="success" size="sm" icon={Download} onClick={handleExportCSV}>
            Export CSV
          </Button>
          <Button variant="danger" size="sm" icon={Trash2} onClick={handleClear}>
            Clear
          </Button>
        </div>
        <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
          Showing {filtered.length} of {records.length} records
        </p>
      </Card>

      {/* Table */}
      <Card padding="none" className="overflow-hidden">
        <div className="table-wrap">
          <table>
            <thead>
              <tr style={{ background: "var(--surface-soft)", borderBottom: "1px solid var(--border)" }}>
                {[
                  { key: "created_at", label: "Date" },
                  { key: "location", label: "Location" },
                  { key: null, label: "System" },
                  { key: null, label: "Panel Type" },
                  { key: null, label: "Days" },
                  { key: "total_kWh", label: "Total kWh" },
                  { key: null, label: "Avg/Day" },
                  { key: "confidence", label: "Confidence" },
                ].map(({ key, label }) => (
                  <th
                    key={label}
                    onClick={() => key && toggleSort(key)}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                    style={{ color: "var(--muted)", cursor: key ? "pointer" : "default" }}
                  >
                    {label}{key && <SortIcon col={key} />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((fc) => {
                const total = totalKwh(fc);
                const avg = total / Math.max(fc.forecast_days, 1);
                return (
                  <tr
                    key={fc.id}
                    className="transition-colors"
                    style={{ borderBottom: "1px solid var(--border)" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--surface-hover)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: "var(--muted)" }}>
                      {new Date(fc.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold whitespace-nowrap" style={{ color: "var(--text)" }}>
                      <span className="flex items-center gap-1.5">
                        <MapPin style={{ width: 12, height: 12, color: "var(--accent-2)" }} />
                        {fc.location}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>
                      {fc.panel_count}× · {(fc.panel_count * 0.55).toFixed(1)} kWp
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="info">{fc.panel_type}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--text-secondary)" }}>
                      {fc.forecast_days}d
                    </td>
                    <td className="px-4 py-3 text-sm font-bold whitespace-nowrap" style={{ color: "var(--accent-2)" }}>
                      {total.toFixed(1)} kWh
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>
                      {avg.toFixed(1)} kWh/d
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge variant={confVariant(fc.confidence || "0")}>
                        {fc.confidence || "—"}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-10" style={{ color: "var(--muted)" }}>
              <Search style={{ width: 28, height: 28, margin: "0 auto 8px" }} />
              <p className="text-sm">No records match your filters.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
