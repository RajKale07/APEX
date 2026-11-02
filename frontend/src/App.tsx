import { useState, useEffect } from "react";
import axios from "axios";
import CodeInput from "./components/CodeInput";
import MetricsPanel from "./components/MetricsPanel";
import StrategyPanel from "./components/StrategyPanel";
import BenchmarkChart from "./components/BenchmarkChart";
import IRViewer from "./components/IRViewer";
import HistoryView from "./components/HistoryView";
import PipelineDocs from "./components/PipelineDocs";
import type { ApexResult } from "./types";
import "./App.css";

const API = "http://localhost:8000";

type ActiveTab = "analyze" | "history" | "docs";

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("analyze");
  const [result, setResult]       = useState<ApexResult | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [backendLive, setBackendLive] = useState<boolean | null>(null);
  const [pipelineStage, setPipelineStage] = useState(0);

  const checkHealth = async () => {
    try {
      let res;
      try {
        res = await axios.get("/api/health", { timeout: 2500 });
      } catch {
        res = await axios.get(`${API}/api/health`, { timeout: 2500 });
      }
      setBackendLive(res.data?.status === "ok");
    } catch {
      setBackendLive(false);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!loading) return;
    const stageInterval = setInterval(() => {
      setPipelineStage(prev => (prev < 3 ? prev + 1 : prev));
    }, 3500);
    return () => clearInterval(stageInterval);
  }, [loading]);

  const handleLoadingChange = (isLoading: boolean) => {
    if (isLoading) {
      setPipelineStage(0);
    }
    setLoading(isLoading);
  };

  const handleResult = (data: ApexResult) => {
    setResult(data);
    setError(null);
  };

  const handleError = (msg: string) => {
    setError(msg);
    setResult(null);
  };

  return (
    <div className="app-container">
      {/* Clean Topbar */}
      <header className="topbar">
        <div className="topbar-brand">
          <div className="brand-logo">⚡</div>
          <div className="brand-info">
            <span className="brand-name">APEX</span>
            <span className="brand-tag">Adaptive Compiler Architecture</span>
          </div>
        </div>

        <nav className="topbar-nav">
          <button
            className={`nav-tab ${activeTab === "analyze" ? "active" : ""}`}
            onClick={() => setActiveTab("analyze")}
          >
            Analyze
          </button>
          <button
            className={`nav-tab ${activeTab === "history" ? "active" : ""}`}
            onClick={() => setActiveTab("history")}
          >
            History
          </button>
          <button
            className={`nav-tab ${activeTab === "docs" ? "active" : ""}`}
            onClick={() => setActiveTab("docs")}
          >
            Docs
          </button>
        </nav>

        <div className="topbar-status">
          <div className={`status-pill ${backendLive ? "online" : "offline"}`}>
            <span className="status-dot" />
            <span>
              {backendLive === null
                ? "Checking backend..."
                : backendLive
                ? "Backend live"
                : "Backend offline"}
            </span>
          </div>
        </div>
      </header>

      {/* Offline Alert if Backend is Down */}
      {backendLive === false && (
        <div className="offline-banner">
          <span>⚠️ Backend offline at <code>localhost:8000</code>. Run <code>python backend/main.py</code> to enable compilation.</span>
          <button className="offline-retry-btn" onClick={checkHealth}>Retry</button>
        </div>
      )}

      {/* Main Views */}
      {activeTab === "history" && (
        <main className="tab-container">
          <HistoryView />
        </main>
      )}

      {activeTab === "docs" && (
        <main className="tab-container">
          <PipelineDocs />
        </main>
      )}

      {activeTab === "analyze" && (
        <div className="workspace">
          {/* Left Column: Code Editor */}
          <aside className="workspace-left">
            <CodeInput
              onResult={handleResult}
              onError={handleError}
              onLoading={handleLoadingChange}
              loading={loading}
            />
          </aside>

          {/* Right Column: Execution & Results */}
          <main className="workspace-right">
            {/* Simple Clean Loading State */}
            {loading && (
              <div className="loading-card">
                <div className="spinner" />
                <h3 className="loading-title">Running APEX pipeline…</h3>
                <p className="loading-sub">Compiling C++ to LLVM IR, analyzing metrics, and benchmarking strategies.</p>

                <div className="stages-list">
                  {[
                    "Compiling source to LLVM IR (.ll)",
                    "Extracting IR metrics and densities",
                    "Selecting optimal strategy via decision engine",
                    "Benchmarking optimization levels (O0, O1, O2, O3, APEX)",
                  ].map((label, idx) => {
                    const isDone = pipelineStage > idx;
                    const isCurrent = pipelineStage === idx;
                    return (
                      <div
                        key={idx}
                        className={`stage-item ${isDone ? "done" : ""} ${isCurrent ? "current" : ""}`}
                      >
                        <span className="stage-icon">
                          {isDone ? "✓" : isCurrent ? "●" : "○"}
                        </span>
                        <span className="stage-label">{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Error Banner */}
            {error && !loading && (
              <div className="error-card">
                <div className="error-title">⚠️ Compilation Error</div>
                <pre className="error-text">{error}</pre>
              </div>
            )}

            {/* Empty State */}
            {!result && !loading && !error && (
              <div className="empty-card">
                <div className="empty-icon">⚡</div>
                <h3 className="empty-title">Submit C++ code to begin</h3>
                <p className="empty-sub">
                  APEX analyzes program characteristics directly from LLVM Intermediate Representation,
                  recommends tailored optimization passes, and benchmarks all levels side by side.
                </p>

                <div className="empty-steps">
                  <div className="empty-step">
                    <span className="step-num">1</span>
                    <div>
                      <strong>Select or paste code</strong>
                      <p>Choose a benchmark preset on the left or paste your C++ function.</p>
                    </div>
                  </div>
                  <div className="empty-step">
                    <span className="step-num">2</span>
                    <div>
                      <strong>Run APEX</strong>
                      <p>Click "Run APEX" to generate IR and evaluate optimization passes.</p>
                    </div>
                  </div>
                  <div className="empty-step">
                    <span className="step-num">3</span>
                    <div>
                      <strong>Compare &amp; Learn</strong>
                      <p>Inspect IR metrics, compare benchmark execution times, and save feedback.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Results Dashboard */}
            {result && !loading && (
              <div className="results-wrapper">
                <div className="results-header">
                  <div className="results-title">
                    <span>Analyzed:</span>
                    <strong>{result.filename}</strong>
                  </div>
                  <div className="results-meta">
                    <span>Instructions: <strong>{result.metrics.instructions}</strong></span>
                    <span>Strategy: <strong>{result.strategy.name}</strong></span>
                  </div>
                </div>

                <div className="results-grid">
                  <MetricsPanel metrics={result.metrics} features={result.features} />
                  <StrategyPanel strategy={result.strategy} />
                </div>

                <BenchmarkChart benchmark={result.benchmark} />

                <IRViewer ir={result.ir_snippet} />
              </div>
            )}
          </main>
        </div>
      )}

      {/* Clean Minimalist Footer */}
      <footer className="footer">
        <span>APEX — Adaptive Compiler Architecture</span>
        <span>LLVM &amp; Clang Optimization Engine</span>
      </footer>
    </div>
  );
}
