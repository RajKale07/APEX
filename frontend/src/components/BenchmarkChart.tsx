import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";
import type { BenchmarkEntry } from "../types";

interface Props { benchmark: BenchmarkEntry[] }

// ── Human-readable names shown on chart ──────────────────────────────────────
const DISPLAY_NAME: Record<string, string> = {
  O0:   "No Opt",
  O1:   "Light",
  O2:   "Standard",
  O3:   "Aggressive",
  APEX: "APEX",
};

// ── What each level means in plain English ────────────────────────────────────
const LEVEL_MEANING: Record<string, { title: string; what: string; when: string }> = {
  O0: {
    title: "No Optimization  (-O0)",
    what:  "The compiler translates your code almost word-for-word. No tricks, no shortcuts. Every variable is stored in memory exactly as you wrote it.",
    when:  "Used for debugging — the code behaves exactly as written so you can step through it line by line.",
  },
  O1: {
    title: "Light Optimization  (-O1)",
    what:  "Removes dead code, simplifies obvious expressions, keeps frequently-used values in CPU registers instead of RAM.",
    when:  "Good for fast compile cycles during development. Noticeably faster than O0 with minimal compile cost.",
  },
  O2: {
    title: "Standard Optimization  (-O2)",
    what:  "The industry default. Enables loop optimizations, function inlining, instruction combining, and branch prediction hints. Safe and well-tested.",
    when:  "What most production software ships with. A solid choice when you don't know the program's characteristics.",
  },
  O3: {
    title: "Aggressive Optimization  (-O3)",
    what:  "Everything in O2 plus full auto-vectorization (SIMD — processes 4–8 values per CPU instruction), aggressive inlining, and loop unrolling. Can sometimes make code slower by increasing binary size and cache pressure.",
    when:  "Best for compute-heavy programs with regular data patterns. Can backfire on branch-heavy or irregular code.",
  },
  APEX: {
    title: "APEX Adaptive Strategy",
    what:  "APEX analyzed your program's LLVM IR — counted loops, branches, memory ops, function calls — and selected the specific combination of flags most likely to win for this program's characteristics.",
    when:  "The strategy is backed by real benchmark history. Every run makes the prediction more accurate.",
  },
};

const COLORS: Record<string, string> = {
  O0:   "#94a3b8",
  O1:   "#60a5fa",
  O2:   "#a78bfa",
  O3:   "#fb923c",
  APEX: "#34d399",
};

// ── Custom tooltip ────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d    = payload[0].payload as BenchmarkEntry & { _best: boolean; _bestTime: number };
  const info = LEVEL_MEANING[d.strategy];
  const diff = d._best ? 0 : Math.round(((d.exec_time - d._bestTime) / d._bestTime) * 100);

  return (
    <div className="custom-tooltip">
      <div className="tooltip-strategy">
        <span className="tooltip-dot" style={{ background: COLORS[d.strategy] }} />
        {info?.title ?? d.strategy}
        {d._best && <span className="best-badge">fastest</span>}
      </div>

      <div className="tooltip-explain" style={{ marginTop: "0.4rem", marginBottom: "0.6rem" }}>
        {info?.what}
      </div>

      <div className="tooltip-row">
        <span>Run time</span>
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
        <span>Compiler flags</span>
        <strong style={{ fontFamily: "monospace", fontSize: "0.78rem" }}>{d.flags}</strong>
      </div>

      {d._best && <div className="tooltip-best">✓ Fastest for this program</div>}
      {!d._best && (
        <div className="tooltip-explain" style={{ color: "#dc2626", marginTop: "0.5rem" }}>
          {diff}% slower than the fastest strategy
        </div>
      )}
    </div>
  );
}

// ── APEX result explanation panel ─────────────────────────────────────────────
function ApexExplanation({ data }: { data: (BenchmarkEntry & { _best: boolean; _bestTime: number })[] }) {
  const apex    = data.find(d => d.strategy === "APEX");
  const best    = data.find(d => d._best);
  if (!apex || !best) return null;

  const diff    = Math.abs(Math.round(((apex.exec_time - best.exec_time) / best.exec_time) * 100));
  const faster  = apex.exec_time <= best.exec_time;

  return (
    <div className={`apex-explain-box ${faster ? "apex-won" : "apex-lost"}`}>
      <div className="apex-explain-title">
        {faster ? "⚡ Why APEX is faster" : "🔍 Why APEX isn't the fastest here"}
      </div>

      {faster ? (
        <p>
          APEX analyzed this program's characteristics and selected <code>{apex.flags}</code> instead
          of the generic standard level. By matching the optimization strategy to what this specific
          program actually does, it ran <strong>{diff}% faster</strong> than the next best option.
        </p>
      ) : (
        <p>
          APEX selected <code>{apex.flags}</code> based on the program's IR analysis, but{" "}
          <strong>{DISPLAY_NAME[best.strategy]} ({best.flags})</strong> turned out to be{" "}
          <strong>{diff}% faster</strong> on this run.
          {" "}This is exactly why the feedback loop exists — APEX records this result and will
          prefer <code>{best.flags}</code> next time it sees a program with the same characteristics.
          The more programs APEX benchmarks, the more accurate its predictions become.
        </p>
      )}

      <div className="apex-explain-stats">
        <div className="apex-stat">
          <span>APEX ran in</span>
          <strong style={{ color: faster ? "#059669" : "#dc2626" }}>{apex.exec_time}s</strong>
        </div>
        {!faster && (
          <div className="apex-stat">
            <span>Best was</span>
            <strong style={{ color: "#059669" }}>{best.exec_time}s ({DISPLAY_NAME[best.strategy]})</strong>
          </div>
        )}
        <div className="apex-stat">
          <span>APEX flags</span>
          <code>{apex.flags}</code>
        </div>
        <div className="apex-stat">
          <span>Confidence</span>
          <strong>feedback-driven after enough runs</strong>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function BenchmarkChart({ benchmark }: Props) {
  const valid = benchmark.filter(b => !b.error && b.exec_time > 0);
  if (valid.length === 0) return null;

  const best     = valid.reduce((a, b) => a.exec_time < b.exec_time ? a : b);
  const bestTime = best.exec_time;

  const data = valid.map(b => ({
    ...b,
    _displayName: DISPLAY_NAME[b.strategy] ?? b.strategy,
    _best:        b.strategy === best.strategy,
    _bestTime:    bestTime,
  }));

  return (
    <div className="card benchmark-card">
      <h2>⏱ Benchmark Results</h2>
      <p className="benchmark-subtitle">
        How fast does your program run under each optimization strategy? Lower bar = faster = better.
        Hover any bar to understand what that strategy does.
      </p>

      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart
            data={data}
            margin={{ top: 10, right: 30, left: 0, bottom: 40 }}
            barCategoryGap="30%"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e0d8" vertical={false} />
            <XAxis
              dataKey="_displayName"
              tick={{ fill: "#4a4a6a", fontSize: 12, fontWeight: 700 }}
              axisLine={false}
              tickLine={false}
              interval={0}
            />
            <YAxis
              tick={{ fill: "#9999aa", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              unit="s"
              width={48}
              label={{ value: "Execution time (seconds)", angle: -90, position: "insideLeft",
                       offset: 10, style: { fill: "#9999aa", fontSize: 11 } }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99,102,241,0.06)" }} />
            <ReferenceLine
              y={bestTime}
              stroke="#34d399"
              strokeDasharray="5 3"
              strokeWidth={1.5}
              label={{ value: "fastest", position: "right", fill: "#059669", fontSize: 11, fontWeight: 600 }}
            />
            <Bar dataKey="exec_time" radius={[6, 6, 0, 0]} maxBarSize={72}>
              {data.map(entry => (
                <Cell
                  key={entry.strategy}
                  fill={COLORS[entry.strategy] ?? "#94a3b8"}
                  opacity={entry._best ? 1 : 0.55}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* APEX explanation panel */}
      <ApexExplanation data={data as any} />

      {/* Detail table */}
      <table className="bench-table" style={{ marginTop: "1.5rem" }}>
        <thead>
          <tr>
            <th>Strategy</th>
            <th>What it means</th>
            <th>Flags used</th>
            <th>Run time</th>
            <th>Compile time</th>
            <th>Binary size</th>
          </tr>
        </thead>
        <tbody>
          {data.map(b => (
            <tr key={b.strategy} className={b._best ? "best-row" : ""}>
              <td>
                <span className="strat-dot" style={{ background: COLORS[b.strategy] }} />
                <strong>{b._displayName}</strong>
                {b._best && <span className="best-badge">fastest</span>}
              </td>
              <td style={{ fontSize: "0.8rem", color: "var(--text-secondary)", maxWidth: "220px" }}>
                {LEVEL_MEANING[b.strategy]?.when ?? "—"}
              </td>
              <td className="flags-cell">{b.flags}</td>
              <td className={`time-cell ${b._best ? "time-best" : ""}`}>{b.exec_time}s</td>
              <td className="time-cell">{b.compile_time}s</td>
              <td>{(b.binary_size / 1024).toFixed(1)} KB</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
