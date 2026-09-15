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

  const handleResult = (data: ApexResult) => {
    setResult(data);
    setError(null);
  };

  const handleError = (msg: string) => {
    setError(msg);
    setResult(null);
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <span className="logo">⚡ APEX</span>
          <span className="tagline">Adaptive Compiler Architecture</span>
        </div>
      </header>

      <main className="main">
        <CodeInput
          onResult={handleResult}
          onError={handleError}
          onLoading={setLoading}
        />

        {loading && (
          <div className="loading">
            <div className="spinner" />
            <p>Running APEX pipeline — compiling, analyzing, benchmarking…</p>
          </div>
        )}

        {error && <div className="error-box">⚠ {error}</div>}

        {result && !loading && (
          <div className="results">
            <div className="results-top">
              <MetricsPanel metrics={result.metrics} />
              <StrategyPanel strategy={result.strategy} />
            </div>
            <BenchmarkChart benchmark={result.benchmark} />
            <IRViewer ir={result.ir_snippet} />
          </div>
        )}
      </main>
    </div>
  );
}
