import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";
import type { BenchmarkEntry } from "../types";

interface Props { benchmark: BenchmarkEntry[] }

const COLORS: Record<string, string> = {
  O0:   "#94a3b8",
  O1:   "#60a5fa",
  O2:   "#a78bfa",
  O3:   "#fb923c",
  APEX: "#34d399",
};

const STRATEGY_EXPLAIN: Record<string, string> = {
  O0:   "No optimization. Clang emits code as-is. Useful as a baseline to see how much optimization helps.",
  O1:   "Light optimization. Removes dead code, does basic inlining. Good for fast iteration.",
  O2:   "Standard optimization. The default for production builds. Balances compile time and runtime.",
  O3:   "Aggressive optimization. Full vectorization and inlining. Best for compute-heavy workloads.",
  APEX: "APEX-selected strategy. Chosen based on your program's specific characteristics from IR analysis.",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d    = payload[0].payload as BenchmarkEntry & { _best: boolean; _bestTime: number };
  const diff = d._best ? 0 : Math.round(((d.exec_time - d._bestTime) / d._bestTime) * 100);

  return (
    <div className="custom-tooltip">
      <div className="tooltip-strategy">
        <span className="tooltip-dot" style={{ background: COLORS[d.strategy] }} />
        {d.strategy}
        {d._best && <span className="best-badge">best</span>}
      </div>
      <div className="tooltip-row">
        <span>Exec time</span>
        <strong className={d._best ? "time-best" : ""}>{d.exec_time}s</strong>
      </div>
      <div className="tooltip-row">
        <span>Compile time</span>
        <strong>{d.compile_time}s</strong>
      </div>
      <div className="tooltip-row">
        <span>Binary size</span>
        <strong>{(d.binary_size / 1024).toFixed(1)} KB</strong>
      </div>
      <div className="tooltip-row">
        <span>Flags</span>
        <strong style={{ fontFamily: "monospace", fontSize: "0.78rem" }}>{d.flags}</strong>
      </div>
      <div className="tooltip-explain">{STRATEGY_EXPLAIN[d.strategy]}</div>
      {!d._best && (
        <div className="tooltip-explain" style={{ color: "#dc2626" }}>
          +{diff}% slower than the best strategy
        </div>
      )}
      {d._best && (
        <div className="tooltip-best">✓ Fastest execution time</div>
      )}
    </div>
  );
}

export default function BenchmarkChart({ benchmark }: Props) {
  const valid = benchmark.filter(b => !b.error);
  if (valid.length === 0) return null;

  const best     = valid.reduce((a, b) => a.exec_time < b.exec_time ? a : b);
  const bestTime = best.exec_time;

  const data = valid.map(b => ({
    ...b,
    _best:     b.strategy === best.strategy,
    _bestTime: bestTime,
  }));

  return (
    <div className="card benchmark-card">
      <h2>⏱ Benchmark Results</h2>
      <p className="benchmark-subtitle">
        Median execution time over 3 runs — lower is better.
        Hover any bar for a full explanation.
      </p>

      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
            barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e0d8" vertical={false} />
            <XAxis
              dataKey="strategy"
              tick={{ fill: "#6b6b80", fontSize: 13, fontWeight: 600 }}
              axisLine={false} tickLine={false}
            />
            <YAxis
              tick={{ fill: "#9999aa", fontSize: 11 }}
              axisLine={false} tickLine={false}
              unit="s"
              width={45}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99,102,241,0.06)" }} />
            <ReferenceLine
              y={bestTime}
              stroke={COLORS["APEX"]}
              strokeDasharray="4 3"
              strokeWidth={1.5}
              label={{ value: "best", position: "right", fill: "#34d399", fontSize: 11 }}
            />
            <Bar dataKey="exec_time" radius={[6, 6, 0, 0]} maxBarSize={64}>
              {data.map(entry => (
                <Cell
                  key={entry.strategy}
                  fill={COLORS[entry.strategy] ?? "#94a3b8"}
                  opacity={entry._best ? 1 : 0.6}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <table className="bench-table">
        <thead>
          <tr>
            <th>Strategy</th>
            <th>Flags</th>
            <th>Exec (s)</th>
            <th>Compile (s)</th>
            <th>Binary</th>
            <th>Output</th>
          </tr>
        </thead>
        <tbody>
          {data.map(b => (
            <tr key={b.strategy} className={b._best ? "best-row" : ""}>
              <td>
                <span className="strat-dot" style={{ background: COLORS[b.strategy] }} />
                {b.strategy}
                {b._best && <span className="best-badge">best</span>}
              </td>
              <td className="flags-cell">{b.flags}</td>
              <td className={`time-cell ${b._best ? "time-best" : ""}`}>{b.exec_time}s</td>
              <td className="time-cell">{b.compile_time}s</td>
              <td>{(b.binary_size / 1024).toFixed(1)} KB</td>
              <td className="output-cell">{b.output ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
