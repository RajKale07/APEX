import type { Metrics } from "../types";

interface Props {
  metrics: Metrics;
  features?: Record<string, number>;
}

const ROWS: [keyof Metrics, string, string][] = [
  ["instructions",   "Instructions",   "Total LLVM IR instructions parsed."],
  ["basic_blocks",   "Basic Blocks",   "Straight-line code sequences with no jumps."],
  ["functions",      "Functions",      "Function definitions in LLVM IR."],
  ["loops",          "Loops",          "Loop metadata count. Candidates for unrolling & vectorization."],
  ["max_loop_depth", "Max Loop Depth", "Deepest nested loop hierarchy."],
  ["branches",       "Branches",       "Conditional and unconditional control flow jumps."],
  ["loads",          "Memory Loads",   "Memory read operations."],
  ["stores",         "Memory Stores",  "Memory write operations."],
  ["arithmetic",     "Arithmetic Ops", "Math operations (add, mul, sub, div, etc.)."],
  ["calls",          "Function Calls", "Function call instructions."],
  ["comparisons",    "Comparisons",    "Comparison instructions (icmp, fcmp)."],
];

export default function MetricsPanel({ metrics, features }: Props) {
  const values = ROWS.map(([k]) => metrics[k] as number);
  const max = Math.max(...values, 1);

  const loopDensity   = features?.["loop_density"]   ?? ((metrics.loops / Math.max(metrics.basic_blocks, 1)));
  const memDensity    = features?.["memory_density"]  ?? (((metrics.loads + metrics.stores) / Math.max(metrics.instructions, 1)));
  const arithDensity  = features?.["arithmetic_density"] ?? ((metrics.arithmetic / Math.max(metrics.instructions, 1)));
  const callDensity   = features?.["call_density"]   ?? ((metrics.calls / Math.max(metrics.instructions, 1)));
  const branchDensity = features?.["branch_density"] ?? ((metrics.branches / Math.max(metrics.instructions, 1)));

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">LLVM IR Metrics</span>
        <span className="badge">{metrics.instructions} ops</span>
      </div>

      <div className="card-body">
        {/* Density strip */}
        <div className="densities-row">
          <div className="density-col">
            <span className="density-label">Loops</span>
            <span className="density-value">{(loopDensity * 100).toFixed(1)}%</span>
          </div>
          <div className="density-col">
            <span className="density-label">Memory</span>
            <span className="density-value">{(memDensity * 100).toFixed(1)}%</span>
          </div>
          <div className="density-col">
            <span className="density-label">Arithmetic</span>
            <span className="density-value">{(arithDensity * 100).toFixed(1)}%</span>
          </div>
          <div className="density-col">
            <span className="density-label">Calls</span>
            <span className="density-value">{(callDensity * 100).toFixed(1)}%</span>
          </div>
          <div className="density-col">
            <span className="density-label">Branches</span>
            <span className="density-value">{(branchDensity * 100).toFixed(1)}%</span>
          </div>
        </div>

        {/* Metrics List */}
        <div className="metrics-list">
          {ROWS.map(([key, label, tip]) => {
            const val = metrics[key] as number;
            const pct = Math.max(Math.round((val / max) * 100), val > 0 ? 2 : 0);

            return (
              <div className="metric-row" key={key} title={tip}>
                <div className="metric-labels">
                  <span className="metric-name">{label}</span>
                  <span className="metric-val">{val}</span>
                </div>
                <div className="metric-track">
                  <div className="metric-fill" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
