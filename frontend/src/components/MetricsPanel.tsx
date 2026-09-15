import type { Metrics } from "../types";

interface Props { metrics: Metrics }

const ROWS: [keyof Metrics, string][] = [
  ["instructions",   "Instructions"],
  ["basic_blocks",   "Basic Blocks"],
  ["functions",      "Functions"],
  ["loops",          "Loops"],
  ["max_loop_depth", "Max Loop Depth"],
  ["branches",       "Branches"],
  ["loads",          "Loads"],
  ["stores",         "Stores"],
  ["arithmetic",     "Arithmetic Ops"],
  ["calls",          "Function Calls"],
  ["comparisons",    "Comparisons"],
];

export default function MetricsPanel({ metrics }: Props) {
  return (
    <div className="card metrics-panel">
      <h2>📊 IR Analysis</h2>
      <table className="metrics-table">
        <tbody>
          {ROWS.map(([key, label]) => (
            <tr key={key}>
              <td className="metric-label">{label}</td>
              <td className="metric-value">{metrics[key]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
