import type { Strategy } from "../types";

interface Props { strategy: Strategy }

export default function StrategyPanel({ strategy }: Props) {
  return (
    <div className="card strategy-panel">
      <h2>🧠 APEX Decision</h2>

      <div className="strategy-name">{strategy.name}</div>

      <div className="strategy-flags">
        {strategy.passes.map(p => (
          <span key={p} className="flag-badge">{p}</span>
        ))}
      </div>

      <div className="strategy-score">
        Confidence score: <strong>{strategy.score}</strong>
        <span className="confidence-tag">rule-based</span>
      </div>

      <div className="reasoning">
        <h3>Why this strategy?</h3>
        {strategy.reasoning.length > 0
          ? strategy.reasoning.map((r, i) => <p key={i} className="reason">▸ {r}</p>)
          : <p className="reason">▸ Balanced optimization — no dominant characteristic detected</p>
        }
      </div>
    </div>
  );
}
