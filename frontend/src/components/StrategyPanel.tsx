import type { Strategy } from "../types";

interface Props { strategy: Strategy }

const FLAG_TIPS: Record<string, string> = {
  "-O0": "No optimization. Fastest compile, slowest runtime. Used for debugging — code behaves exactly as written.",
  "-O1": "Basic optimizations: dead code removal, simple inlining. Good balance for fast dev builds.",
  "-O2": "Standard: loop unrolling, inlining, vectorization hints. The industry default for production.",
  "-O3": "Aggressive: full vectorization, aggressive inlining. Best for compute-heavy code, can backfire on irregular code.",
  "-funroll-loops": "Unrolls loop bodies to reduce branch overhead and expose more instruction-level parallelism.",
  "-fvectorize": "Auto-vectorization: processes multiple data elements per CPU instruction (SIMD).",
  "-fslp-vectorize": "Superword-Level Parallelism — vectorizes straight-line code outside of loops.",
  "-finline-functions": "Aggressively inlines function calls to eliminate call overhead at the cost of binary size.",
  "-fstrict-aliasing": "Assumes pointers of different types don't alias — enables more aggressive memory optimizations.",
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
        <div className="strategy-name">{strategy.name}</div>
        <div className="strategy-meta">
          Confidence: <span className="strategy-score-pill">rule-based heuristic</span>
        </div>

        <div className="flags-section-label">Compiler flags</div>
        <div className="flags-row">
          {strategy.passes.map(p => (
            <span key={p} className="flag-tag">
              {p}
              <div className="flag-tip">{FLAG_TIPS[p] ?? p}</div>
            </span>
          ))}
        </div>

        <div className="reasoning-label">Why this strategy?</div>
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
                  <span>No dominant characteristic detected — balanced -O2 applied as default.</span>
                </div>
              )
          }
        </div>
      </div>
    </div>
  );
}
