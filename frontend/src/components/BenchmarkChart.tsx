import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import type { BenchmarkEntry } from "../types";

interface Props { benchmark: BenchmarkEntry[] }

const COLORS: Record<string, string> = {
  O0:   "#6b7280",
  O1:   "#3b82f6",
  O2:   "#8b5cf6",
  O3:   "#f59e0b",
  APEX: "#10b981",
};

export default function BenchmarkChart({ benchmark }: Props) {
  const valid = benchmark.filter(b => !b.error);
  if (valid.length === 0) return null;

  const best = valid.reduce((a, b) => a.exec_time < b.exec_time ? a : b);

  return (
    <div className="card benchmark-card">
      <h2>⏱ Benchmark Results</h2>
      <p className="benchmark-subtitle">Median execution time over 3 runs — lower is better</p>

      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={valid} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
            <XAxis dataKey="strategy" tick={{ fill: "#a0a0b0" }} />
            <YAxis tick={{ fill: "#a0a0b0" }} unit="s" />
            <Tooltip
              contentStyle={{ background: "#1a1a2e", border: "1px solid #333" }}
              formatter={(v) => [`${v}s`, "Exec Time"]}
            />
            <Bar dataKey="exec_time" radius={[4, 4, 0, 0]}>
              {valid.map(entry => (
                <Cell
                  key={entry.strategy}
                  fill={COLORS[entry.strategy] ?? "#6b7280"}
                  opacity={entry.strategy === best.strategy ? 1 : 0.65}
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
          {valid.map(b => (
            <tr key={b.strategy} className={b.strategy === best.strategy ? "best-row" : ""}>
              <td>
                <span className="strat-dot" style={{ background: COLORS[b.strategy] }} />
                {b.strategy}
                {b.strategy === best.strategy && <span className="best-badge">best</span>}
              </td>
              <td className="flags-cell">{b.flags}</td>
              <td>{b.exec_time}s</td>
              <td>{b.compile_time}s</td>
              <td>{(b.binary_size / 1024).toFixed(1)} KB</td>
              <td className="output-cell">{b.output ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
