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
      <header className="header">
        <div className="header-inner">
          <span className="logo">⚡ APEX</span>
          <span className="tagline">Adaptive Compiler Architecture</span>
        </div>
      </header>

      <main className="main">
        <div className="fade-up">
          <CodeInput onResult={handleResult} onError={handleError} onLoading={setLoading} />
        </div>

        {loading && (
          <div className="loading">
            <div className="spinner" />
            <p>Running APEX pipeline…</p>
            <div className="loading-steps">
              <span className="loading-step">⚙ Compiling to IR</span>
              <span className="loading-step">🔍 Analyzing</span>
              <span className="loading-step">🧠 Deciding strategy</span>
              <span className="loading-step">📊 Benchmarking</span>
            </div>
          </div>
        )}

        {error && <div className="error-box">⚠ {error}</div>}

        {result && !loading && (
          <div className="results">
            <div className="results-top">
              <div className="fade-up fade-up-1"><MetricsPanel metrics={result.metrics} /></div>
              <div className="fade-up fade-up-2"><StrategyPanel strategy={result.strategy} /></div>
            </div>
            <div className="fade-up fade-up-3"><BenchmarkChart benchmark={result.benchmark} /></div>
            <div className="fade-up fade-up-4"><IRViewer ir={result.ir_snippet} /></div>
          </div>
        )}
      </main>
    </div>
  );
}
