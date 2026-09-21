import type { Metrics } from "../types";

interface Props { metrics: Metrics }

const ROWS: [keyof Metrics, string, string][] = [
  ["instructions",   "Instructions",   "Total LLVM IR instructions. Higher = more complex code."],
  ["basic_blocks",   "Basic Blocks",   "Straight-line segments with no branches. More = more control flow."],
  ["functions",      "Functions",      "Function definitions in the IR, including helpers."],
  ["loops",          "Loops",          "Loops detected via LLVM metadata. High count → loop optimization."],
  ["max_loop_depth", "Loop Depth",     "Deepest loop nesting. Deeply nested loops are vectorization targets."],
  ["branches",       "Branches",       "Conditional jumps. High count → branch prediction matters."],
  ["loads",          "Loads",          "Memory reads. High loads → memory bandwidth is a bottleneck."],
  ["stores",         "Stores",         "Memory writes. High stores → cache pressure, aliasing matters."],
  ["arithmetic",     "Arithmetic",     "Add/sub/mul/div ops. High density → vectorization helps."],
  ["calls",          "Calls",          "Call instructions. High density → inlining is a strong candidate."],
  ["comparisons",    "Comparisons",    "icmp/fcmp instructions. High count accompanies branch-heavy code."],
];

export default function MetricsPanel({ metrics }: Props) {
  const values = ROWS.map(([k]) => metrics[k] as number);
  const max    = Math.max(...values, 1);

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">
          <span className="panel-title-icon">◈</span>
          IR Analysis
        </span>
        <span className="panel-badge">{values.reduce((a, b) => a + b, 0)} total ops</span>
      </div>
      <div className="panel-body">
        <div className="metrics-grid">
          {ROWS.map(([key, label, tip]) => {
            const val = metrics[key] as number;
            const pct = Math.round((val / max) * 100);
            return (
              <div className="metric-row" key={key}>
                <span className="metric-label">{label}</span>
                <div className="metric-track">
                  <div className="metric-fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="metric-val">{val}</span>
                <div className="metric-tip">{tip}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
