import { useEffect, useState } from "react";
import axios from "axios";
import type { HistoryEntry } from "../types";

const API = "http://localhost:8000";

export default function HistoryView() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [filter, setFilter]   = useState<string>("ALL");

  const fetchHistory = async () => {
    setLoading(true);
    try {
      let res;
      try {
        res = await axios.get("/api/history");
      } catch {
        res = await axios.get(`${API}/api/history`);
      }
      setHistory(Array.isArray(res.data) ? res.data : []);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const sources = ["ALL", ...Array.from(new Set(history.map(h => h.source)))];
  const filtered = filter === "ALL" ? history : history.filter(h => h.source === filter);

  const totalRuns = history.length;
  const uniquePrograms = new Set(history.map(h => h.source)).size;
  const strategiesUsed = Array.from(new Set(history.map(h => h.strategy)));

  return (
    <div className="history-page">
      <div className="page-header">
        <h2 className="page-title">Feedback History Archive</h2>
        <p className="page-desc">
          APEX logs every multi-strategy benchmark into <code>history.json</code>. When similar code profiles are submitted,
          the decision engine chooses the historically fastest flags.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Total Benchmarks</span>
          <span className="kpi-num">{totalRuns}</span>
          <span className="kpi-sub">Multi-level runs</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Tested Programs</span>
          <span className="kpi-num">{uniquePrograms}</span>
          <span className="kpi-sub">Distinct source profiles</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Logged Strategies</span>
          <span className="kpi-num">{strategiesUsed.length}</span>
          <span className="kpi-sub">{strategiesUsed.join(", ") || "O1, O2, O3, APEX"}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Matching Threshold</span>
          <span className="kpi-num">&lt; 0.15</span>
          <span className="kpi-sub">Euclidean vector distance</span>
        </div>
      </div>

      {/* Filter and Refresh */}
      <div className="filter-row">
        <div className="filter-group">
          <span className="filter-title">Filter by file:</span>
          {sources.map(src => (
            <button
              key={src}
              className={`filter-btn ${filter === src ? "active" : ""}`}
              onClick={() => setFilter(src)}
            >
              {src}
            </button>
          ))}
        </div>
        <button className="small-btn" onClick={fetchHistory} disabled={loading}>
          {loading ? "Loading…" : "↻ Refresh"}
        </button>
      </div>

      {loading && (
        <div className="loading-state">
          <div className="spinner-sm" />
          <span>Loading historical benchmarks…</span>
        </div>
      )}

      {error && (
        <div className="error-card">
          <div className="error-title">Error</div>
          <div className="error-text">{error}</div>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="empty-card">
          <p>No benchmarks found in history. Run your first analysis in the Analyze tab.</p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Timestamp</th>
                <th>Source</th>
                <th>Strategy</th>
                <th>Flags</th>
                <th>Exec Time</th>
                <th>Compile Time</th>
                <th>Binary Size</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, idx) => (
                <tr key={`${item.timestamp}-${idx}`} className={item.strategy === "APEX" ? "row-highlight" : ""}>
                  <td className="dim-text">{(idx + 1).toString().padStart(2, "0")}</td>
                  <td className="dim-text">{item.timestamp?.replace("T", " ") ?? "—"}</td>
                  <td><strong>{item.source}</strong></td>
                  <td>
                    <span className={`pill ${item.strategy === "APEX" ? "pill-white" : ""}`}>
                      {item.strategy}
                    </span>
                  </td>
                  <td>
                    <code className="code-tag">
                      {Array.isArray(item.flags) ? item.flags.join(" ") : String(item.flags)}
                    </code>
                  </td>
                  <td><strong>{item.exec_time}s</strong></td>
                  <td>{item.compile_time}s</td>
                  <td>{(item.binary_size / 1024).toFixed(1)} KB</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
