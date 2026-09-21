import type { Metrics } from "../types";

interface Props { metrics: Metrics }

const ROWS: [keyof Metrics, string, string][] = [
  ["instructions",   "Instructions",    "Total number of LLVM IR instructions in the program. Higher = more complex code."],
  ["basic_blocks",   "Basic Blocks",    "Straight-line code segments with no branches. More blocks = more control flow."],
  ["functions",      "Functions",       "Number of function definitions found in the IR, including helper functions."],
  ["loops",          "Loops",           "Number of loops detected via LLVM loop metadata. High loop count → loop optimization."],
  ["max_loop_depth", "Max Loop Depth",  "Deepest nesting level of loops. Deeply nested loops are prime vectorization targets."],
  ["branches",       "Branches",        "Conditional jumps (if/else, switch). High branch count → branch prediction matters."],
  ["loads",          "Loads",           "Memory read operations. High loads → memory bandwidth is a bottleneck."],
  ["stores",         "Stores",          "Memory write operations. High stores → cache pressure, aliasing matters."],
  ["arithmetic",     "Arithmetic Ops",  "Add, sub, mul, div etc. High density → vectorization and instruction combining help."],
  ["calls",          "Function Calls",  "Call/invoke instructions. High call density → inlining is a strong candidate."],
  ["comparisons",    "Comparisons",     "icmp/fcmp instructions. High comparisons often accompany branch-heavy code."],
];

export default function MetricsPanel({ metrics }: Props) {
  const values = ROWS.map(([k]) => metrics[k] as number);
  const max    = Math.max(...values, 1);

  return (
    <div className="card metrics-panel">
      <h2>📊 IR Analysis</h2>
      {ROWS.map(([key, label, tip], i) => {
        const val = metrics[key] as number;
        const pct = Math.round((val / max) * 100);
        return (
          <div className="metric-row" key={key} style={{ animationDelay: `${i * 0.04}s` }}>
            <span className="metric-label">{label}</span>
            <div className="metric-bar-wrap">
              <div className="metric-bar" style={{ width: `${pct}%` }} />
            </div>
            <span className="metric-value">{val}</span>
            <div className="metric-tooltip">{tip}</div>
          </div>
        );
      })}
    </div>
  );
}
