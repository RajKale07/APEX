import type { Strategy } from "../types";

interface Props {
  strategy: Strategy;
}

const FLAG_TIPS: Record<string, string> = {
  "-O0": "No optimization. Compiles immediately, executes slowest. Preserves exact line-by-line instructions for debugging.",
  "-O1": "Basic optimization. Enables dead code removal and simple inlining without inflating compile time.",
  "-O2": "Standard production balance. Enables instruction scheduling, loop unrolling, and vectorization hints.",
  "-O3": "Aggressive maximum speed. Forces full auto-vectorization and loop transforms.",
  "-funroll-loops": "Unrolls loop bodies to amortize branch evaluations and expose instruction parallelism.",
  "-fvectorize": "Enables LLVM Loop Vectorizer to convert scalar operations into SIMD instructions.",
  "-fslp-vectorize": "Enables Superword-Level Parallelism vectorizer for straight-line code outside loops.",
  "-finline-functions": "Inlines function bodies to eliminate call-overhead and stack framing.",
  "-fstrict-aliasing": "Assumes pointers of differing types do not alias, enabling aggressive register caching.",
};

export default function StrategyPanel({ strategy }: Props) {
  const isFeedback = strategy.confidence === "feedback-driven" || strategy.reasoning.some(r => r.includes("past benchmarks"));

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">APEX Strategy Decision</span>
        <span className="badge">score {strategy.score}</span>
      </div>

      <div className="card-body">
        <div className="decision-banner">
          <div className="strategy-name">{strategy.name}</div>
          <div className="strategy-meta">
            Confidence: <span className="meta-pill">{isFeedback ? "feedback-driven" : "rule-based heuristic"}</span>
          </div>
        </div>

        <div className="flags-section">
          <span className="section-label">Compiler Flags</span>
          <div className="flags-wrap">
            {strategy.passes.map(p => (
              <span key={p} className="flag-pill" title={FLAG_TIPS[p] ?? p}>
                {p}
              </span>
            ))}
          </div>
        </div>

        <div className="reasoning-section">
          <span className="section-label">Selection Rationale</span>
          <div className="reasoning-list">
            {strategy.reasoning.length > 0 ? (
              strategy.reasoning.map((r, i) => (
                <div key={i} className="reason-item">
                  <span className="reason-bullet">▸</span>
                  <span>{r}</span>
                </div>
              ))
            ) : (
              <div className="reason-item">
                <span className="reason-bullet">▸</span>
                <span>Balanced profile detected — standard -O2 applied as default.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
