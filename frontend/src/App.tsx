import { useState } from "react";
import CodeInput from "./components/CodeInput";
import MetricsPanel from "./components/MetricsPanel";
import StrategyPanel from "./components/StrategyPanel";
import BenchmarkChart from "./components/BenchmarkChart";
import IRViewer from "./components/IRViewer";
import type { ApexResult } from "./types";
import "./App.css";

export default function App() {
  const [result, setResult]   = useState<ApexResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const handleResult = (data: ApexResult) => { setResult(data); setError(null); };
  const handleError  = (msg: string)       => { setError(msg);  setResult(null); };

  return (
    <div className="app">
      {/* ── Top bar ── */}
      <header className="topbar">
        <div className="topbar-logo">
          <div className="logo-icon">⚡</div>
          <span className="logo-text">APEX</span>
          <span className="logo-sub">Adaptive Compiler Architecture</span>
        </div>
        <nav className="topbar-nav">
          <button className="nav-link active">Analyze</button>
          <button className="nav-link">History</button>
          <button className="nav-link">Docs</button>
        </nav>
        <div className="status-dot" title="Backend online" />
      </header>

      {/* ── Workspace ── */}
      <div className="workspace">
        {/* Left: code input */}
        <aside className="left-pane">
          <CodeInput
            onResult={handleResult}
            onError={handleError}
            onLoading={setLoading}
            loading={loading}
          />
        </aside>

        {/* Right: results */}
        <main className="right-pane">
          {loading && (
            <div className="loading-overlay">
              <div className="spinner" />
              <span className="loading-label">Running APEX pipeline…</span>
              <div className="pipeline-steps">
                {[
                  ["⚙", "Compiling to LLVM IR"],
                  ["🔍", "Analyzing IR metrics"],
                  ["🧠", "Selecting strategy"],
                  ["📊", "Benchmarking all levels"],
                ].map(([icon, label]) => (
                  <div className="pipeline-step" key={label}>
                    <span className="step-icon">{icon}</span>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="error-banner">
              <span>⚠</span>
              <span>{error}</span>
            </div>
          )}

          {!result && !loading && !error && (
            <div className="empty-state">
              <div className="empty-icon">⚡</div>
              <div className="empty-title">Submit C++ code to begin</div>
              <div className="empty-sub">
                APEX will compile it to LLVM IR, analyze its characteristics,
                pick the best optimization strategy, and benchmark all levels.
              </div>
            </div>
          )}

          {result && !loading && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
                <MetricsPanel metrics={result.metrics} />
                <StrategyPanel strategy={result.strategy} />
              </div>
              <BenchmarkChart benchmark={result.benchmark} />
              <IRViewer ir={result.ir_snippet} />
            </>
          )}
        </main>
      </div>
    </div>
  );
}
