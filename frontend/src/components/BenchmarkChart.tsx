import { useState } from "react";
import type { BenchmarkEntry } from "../types";

interface Props {
  benchmark: BenchmarkEntry[];
}

const STRAT_LABELS: Record<string, string> = {
  O0:   "No Optimization (-O0)",
  O1:   "Light (-O1)",
  O2:   "Standard (-O2)",
  O3:   "Aggressive (-O3)",
  APEX: "APEX (Adaptive)",
};

export default function BenchmarkChart({ benchmark }: Props) {
  const [copied, setCopied] = useState(false);

  const valid = benchmark.filter(b => !b.error && b.exec_time > 0);
  if (valid.length === 0) return null;

  const best = valid.reduce((a, b) => a.exec_time < b.exec_time ? a : b);
  const maxTime = Math.max(...valid.map(b => b.exec_time));

  const apex = valid.find(b => b.strategy === "APEX");
  const isApexWinner = apex && apex.strategy === best.strategy;

  let comparisonStrategy = best;
  let diffPercent = 0;

  if (isApexWinner) {
    const nonApex = valid.filter(b => b.strategy !== "APEX");
    if (nonApex.length > 0) {
      const runnerUp = nonApex.reduce((a, b) => a.exec_time < b.exec_time ? a : b);
      comparisonStrategy = runnerUp;
      diffPercent = Math.abs(Math.round(((runnerUp.exec_time - apex.exec_time) / runnerUp.exec_time) * 100));
    }
  } else if (apex) {
    diffPercent = Math.abs(Math.round(((apex.exec_time - best.exec_time) / best.exec_time) * 100));
  }

  const stdoutOutput = valid.find(b => b.output)?.output ?? "";

  const copyOutput = () => {
    if (stdoutOutput) {
      navigator.clipboard.writeText(stdoutOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Benchmark Results</span>
        <span className="badge">{valid.length} strategies tested</span>
      </div>

      <div className="card-body">
        {/* Horizontal Bars Section */}
        <div className="bars-section">
          <div className="bars-header">
            <span className="bars-desc">Execution time (seconds) — shorter bar is faster</span>
            {isApexWinner && (
              <span className="winner-tag">
                ⚡ APEX is {diffPercent}% faster than {comparisonStrategy.strategy}
              </span>
            )}
          </div>

          <div className="bars-container">
            {valid.map(item => {
              const pct = Math.max(Math.round((item.exec_time / maxTime) * 100), 14);
              const isBest = item.strategy === best.strategy;
              const isApex = item.strategy === "APEX";

              return (
                <div key={item.strategy} className={`bar-row ${isBest ? "best-bar-row" : ""}`}>
                  <div className="bar-label-area">
                    <span className="bar-name">{item.strategy}</span>
                    <span className="bar-sub">{STRAT_LABELS[item.strategy] ?? item.strategy}</span>
                  </div>

                  <div className="bar-track">
                    <div
                      className={`bar-fill ${isApex ? "fill-apex" : "fill-std"}`}
                      style={{
                        width: `${pct}%`,
                        opacity: isBest ? 1 : isApex ? 0.9 : 0.6,
                      }}
                    >
                      <span className="bar-value">{item.exec_time}s</span>
                      {isBest && <span className="fastest-badge">fastest</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Verdict Callout */}
        <div className={`verdict-box ${isApexWinner ? "verdict-win" : ""}`}>
          <div className="verdict-title">
            {isApexWinner ? "⚡ Why APEX is faster" : "🔍 Strategy Feedback"}
          </div>
          <div className="verdict-body">
            {isApexWinner ? (
              <p>
                APEX tailored <code>{apex?.flags}</code> to this program's IR profile and completed{" "}
                <strong>{diffPercent}% faster</strong> than the next best compiler level ({comparisonStrategy.strategy} @ {comparisonStrategy.exec_time}s).
              </p>
            ) : (
              <p>
                APEX used <code>{apex?.flags}</code> ({apex?.exec_time}s), while <strong>{best.strategy}</strong> ({best.flags}) ran in <strong>{best.exec_time}s</strong>.
                This outcome is recorded into <code>history.json</code> to improve future picks for similar programs.
              </p>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Strategy</th>
                <th>Flags</th>
                <th>Runtime</th>
                <th>Compile</th>
                <th>Binary Size</th>
              </tr>
            </thead>
            <tbody>
              {valid.map(item => {
                const isBest = item.strategy === best.strategy;
                return (
                  <tr key={item.strategy} className={isBest ? "row-highlight" : ""}>
                    <td>
                      <div className="strategy-cell">
                        <strong>{item.strategy}</strong>
                        {isBest && <span className="fastest-pill">fastest</span>}
                      </div>
                    </td>
                    <td><code className="code-tag">{item.flags}</code></td>
                    <td><strong>{item.exec_time}s</strong></td>
                    <td>{item.compile_time}s</td>
                    <td>{(item.binary_size / 1024).toFixed(1)} KB</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Stdout Output Console */}
        {stdoutOutput && (
          <div className="stdout-wrapper">
            <div className="stdout-top">
              <span className="stdout-label">Program Output (stdout)</span>
              <button className="copy-btn" onClick={copyOutput}>
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="stdout-content">{stdoutOutput}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
