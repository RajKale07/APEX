import type { Strategy } from "../types";

interface Props { strategy: Strategy }

const FLAG_TIPS: Record<string, string> = {
  "-O0": "No optimization. Fastest compile, slowest runtime. Used for debugging.",
  "-O1": "Basic optimizations: dead code removal, simple inlining.",
  "-O2": "Standard: loop unrolling, inlining, vectorization hints. Default production level.",
  "-O3": "Aggressive: full vectorization, aggressive inlining. Best for compute-heavy code.",
  "-funroll-loops": "Unrolls loop bodies to reduce branch overhead and expose instruction-level parallelism.",
  "-fvectorize": "Auto-vectorization: processes multiple data elements per CPU instruction (SIMD).",
  "-fslp-vectorize": "Superword-Level Parallelism — vectorizes straight-line code outside loops.",
  "-finline-functions": "Aggressively inlines function calls to eliminate call overhead.",
  "-fstrict-aliasing": "Assumes pointers of different types don't alias — enables more aggressive memory opts.",
};

export default function StrategyPanel({ strategy }: Props) {
  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">
          <span className="panel-title-icon">◆</span>
          APEX Decision
        </span>
        <span className="panel-badge">score {strategy.score}</span>
      </div>
      <div className="panel-body">
        <div className="strategy-header">
          <div className="strategy-name">{strategy.name}</div>
          <span className="strategy-score-pill">rule-based</span>
        </div>

        <div className="flags-row">
          {strategy.passes.map(p => (
            <span key={p} className="flag-tag">
              {p}
              <div className="flag-tip">{FLAG_TIPS[p] ?? p}</div>
            </span>
          ))}
        </div>

        <div className="reasoning-list">
          {strategy.reasoning.length > 0
            ? strategy.reasoning.map((r, i) => (
                <div key={i} className="reason-item">
                  <span className="reason-arrow">▸</span>
                  <span>{r}</span>
                </div>
              ))
            : (
                <div className="reason-item">
                  <span className="reason-arrow">▸</span>
                  <span>No dominant characteristic — balanced -O2 applied</span>
                </div>
              )
          }
        </div>
      </div>
    </div>
  );
}
