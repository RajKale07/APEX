import type { BenchmarkEntry } from "../types";

interface Props { benchmark: BenchmarkEntry[] }

const DISPLAY: Record<string, string> = {
  O0: "No Opt", O1: "Light", O2: "Standard", O3: "Aggressive", APEX: "APEX",
};

const COLORS: Record<string, string> = {
  O0: "#475569", O1: "#3b82f6", O2: "#8b5cf6", O3: "#f97316", APEX: "#22c55e",
};

const LEVEL_WHEN: Record<string, string> = {
  O0:   "Debugging — exact code behavior, no tricks",
  O1:   "Dev builds — fast compile, decent speed",
  O2:   "Production default — safe, well-tested",
  O3:   "Compute-heavy — aggressive, can backfire",
  APEX: "Adaptive — matched to this program's profile",
};

function ApexBox({ data }: { data: (BenchmarkEntry & { _best: boolean; _bestTime: number })[] }) {
  const apex = data.find(d => d.strategy === "APEX");
  const best = data.find(d => d._best);
  if (!apex || !best) return null;

  const diff   = Math.abs(Math.round(((apex.exec_time - best.exec_time) / best.exec_time) * 100));
  const won    = apex.exec_time <= best.exec_time;

  return (
    <div className={`apex-box ${won ? "won" : "lost"}`}>
      <div className="apex-box-title">
        {won ? "⚡ Why APEX is faster" : "🔍 Why APEX isn't fastest here"}
      </div>
      {won ? (
        <p>
          APEX matched <code>{apex.flags}</code> to this program's IR profile and ran{" "}
          <strong style={{ color: "var(--green)" }}>{diff}% faster</strong> than the next best option.
        </p>
      ) : (
        <p>
          APEX chose <code>{apex.flags}</code> but <strong>{DISPLAY[best.strategy]} ({best.flags})</strong> was{" "}
          <strong style={{ color: "var(--amber)" }}>{diff}% faster</strong>. This result is recorded —
          next time APEX sees a similar profile it will prefer <code>{best.flags}</code>.
        </p>
      )}
      <div className="apex-stats">
        <div className="apex-stat">
          <span className="apex-stat-label">APEX time</span>
          <span className="apex-stat-val" style={{ color: won ? "var(--green)" : "var(--red)" }}>
            {apex.exec_time}s
          </span>
        </div>
        {!won && (
          <div className="apex-stat">
            <span className="apex-stat-label">Best time</span>
            <span className="apex-stat-val" style={{ color: "var(--green)" }}>
              {best.exec_time}s ({DISPLAY[best.strategy]})
            </span>
          </div>
        )}
        <div className="apex-stat">
          <span className="apex-stat-label">Flags used</span>
          <span className="apex-stat-val"><code>{apex.flags}</code></span>
        </div>
      </div>
    </div>
  );
}

export default function BenchmarkChart({ benchmark }: Props) {
  const valid = benchmark.filter(b => !b.error && b.exec_time > 0);
  if (valid.length === 0) return null;

  const best     = valid.reduce((a, b) => a.exec_time < b.exec_time ? a : b);
  const maxTime  = Math.max(...valid.map(b => b.exec_time));

  const data = valid.map(b => ({
    ...b,
    _best:     b.strategy === best.strategy,
    _bestTime: best.exec_time,
  }));

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">
          <span className="panel-title-icon">▣</span>
          Benchmark Results
        </span>
        <span className="panel-badge">{valid.length} strategies</span>
      </div>

      {/* Horizontal bar chart */}
      <div className="chart-area">
        <div className="chart-subtitle">Execution time — lower is faster</div>
        <div className="hbar-list">
          {data.map(b => {
            const pct  = (b.exec_time / maxTime) * 100;
            const diff = b._best ? 0 : Math.round(((b.exec_time - b._bestTime) / b._bestTime) * 100);
            return (
              <div className="hbar-row" key={b.strategy}>
                <span className="hbar-label">{DISPLAY[b.strategy] ?? b.strategy}</span>
                <div className="hbar-track">
                  <div
                    className="hbar-fill"
                    style={{
                      width: `${pct}%`,
                      background: COLORS[b.strategy] ?? "#475569",
                      opacity: b._best ? 1 : 0.55,
                    }}
                  >
                    <span className="hbar-time">{b.exec_time}s</span>
                    {b._best && <span className="hbar-badge">fastest</span>}
                    {!b._best && diff > 0 && <span className="hbar-badge">+{diff}%</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* APEX explanation */}
      <ApexBox data={data as any} />

      {/* Detail table */}
      <div className="bench-table-wrap">
        <table className="bench-table">
          <thead>
            <tr>
              <th>Strategy</th>
              <th>Use case</th>
              <th>Flags</th>
              <th>Run time</th>
              <th>Compile</th>
              <th>Binary</th>
            </tr>
          </thead>
          <tbody>
            {data.map(b => (
              <tr key={b.strategy} className={b._best ? "best-row" : ""}>
                <td>
                  <div className="strat-cell">
                    <span className="strat-dot" style={{ background: COLORS[b.strategy] }} />
                    <span className="strat-name">{DISPLAY[b.strategy] ?? b.strategy}</span>
                    {b._best && <span className="best-pill">fastest</span>}
                  </div>
                </td>
                <td style={{ fontSize: "0.72rem", color: "var(--text-3)", maxWidth: 180 }}>
                  {LEVEL_WHEN[b.strategy] ?? "—"}
                </td>
                <td><span className="mono">{b.flags}</span></td>
                <td><span className={`time-val ${b._best ? "time-best" : ""}`}>{b.exec_time}s</span></td>
                <td><span className="time-val">{b.compile_time}s</span></td>
                <td style={{ color: "var(--text-3)" }}>{(b.binary_size / 1024).toFixed(1)} KB</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
