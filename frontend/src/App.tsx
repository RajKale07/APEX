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
      <header className="topbar">
        <div className="topbar-logo">
          <div className="logo-icon">⚡</div>
          <span>APEX</span>
          <span className="logo-sub">Adaptive Compiler Architecture</span>
        </div>
        <nav className="topbar-nav">
          <button className="nav-link active">Analyze</button>
          <button className="nav-link">History</button>
          <button className="nav-link">Docs</button>
          <div className="status-pill">
            <div className="status-dot" />
            Backend live
          </div>
        </nav>
      </header>

      <div className="workspace">
        <aside className="left-pane">
          <CodeInput
            onResult={handleResult}
            onError={handleError}
            onLoading={setLoading}
            loading={loading}
          />
        </aside>

        <main className="right-pane">
          {loading && (
            <div className="loading-overlay">
              <div className="spinner-amber" />
              <div className="loading-title">Running APEX pipeline…</div>
              <div className="loading-sub">This takes 10–30 seconds</div>
              <div className="pipeline-steps">
                {[
                  ["⚙️", "Compiling to LLVM IR"],
                  ["🔍", "Analyzing IR metrics"],
                  ["🧠", "Selecting strategy"],
                  ["📊", "Benchmarking all levels"],
                ].map(([icon, label]) => (
                  <div className="pipeline-step" key={label as string}>
                    <span>{icon}</span>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="error-banner">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {!result && !loading && !error && (
            <div className="empty-state">
              <div className="empty-icon">⚡</div>
              <div className="empty-title">Submit C++ code to begin</div>
              <div className="empty-sub">
                APEX compiles your code, analyzes the LLVM IR, picks the best
                optimization strategy, and benchmarks all levels side by side.
              </div>
              <div className="empty-steps">
                {[
                  "Paste or upload a C++ file on the left",
                  "Click Run APEX — pipeline runs automatically",
                  "See IR metrics, chosen strategy, and benchmark results",
                  "APEX learns from each run to improve future picks",
                ].map((s, i) => (
                  <div className="empty-step" key={i}>
                    <div className="empty-step-num">{i + 1}</div>
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result && !loading && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.75rem" }}>
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
