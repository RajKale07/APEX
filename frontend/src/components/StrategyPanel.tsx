import type { Strategy } from "../types";

interface Props { strategy: Strategy }

const FLAG_TIPS: Record<string, string> = {
  "-O0": "No optimization. Fastest compile, slowest runtime. Used for debugging.",
  "-O1": "Basic optimizations: dead code removal, simple inlining. Good balance for small programs.",
  "-O2": "Standard optimizations: loop unrolling, inlining, vectorization hints. Default production level.",
  "-O3": "Aggressive optimizations: full vectorization, aggressive inlining. Best for compute-heavy code.",
  "-funroll-loops": "Unrolls loop bodies to reduce branch overhead and expose more instruction-level parallelism.",
  "-fvectorize": "Enables auto-vectorization: processes multiple data elements per CPU instruction (SIMD).",
  "-fslp-vectorize": "Superword-Level Parallelism vectorization — vectorizes straight-line code outside loops.",
  "-finline-functions": "Aggressively inlines function calls to eliminate call overhead.",
  "-fstrict-aliasing": "Assumes pointers of different types don't alias, enabling more aggressive memory optimizations.",
};

export default function StrategyPanel({ strategy }: Props) {
  return (
    <div className="card strategy-panel">
      <h2>🧠 APEX Decision</h2>

      <div className="strategy-name">{strategy.name}</div>

      <div className="strategy-flags">
        {strategy.passes.map(p => (
          <span key={p} className="flag-badge" title={FLAG_TIPS[p] ?? p}>{p}</span>
        ))}
      </div>

      <div className="strategy-score">
        Confidence score: <strong>{strategy.score}</strong>
        <span className="confidence-tag">rule-based heuristic</span>
      </div>

      <div className="reasoning">
        <h3>Why this strategy?</h3>
        {strategy.reasoning.length > 0
          ? strategy.reasoning.map((r, i) => <p key={i} className="reason">▸ {r}</p>)
          : <p className="reason">▸ No dominant characteristic — balanced -O2 applied</p>
        }
      </div>
    </div>
  );
}
