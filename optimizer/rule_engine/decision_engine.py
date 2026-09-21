"""
APEX — optimizer/rule_engine/decision_engine.py
Decision engine: feedback-first, rules as fallback.

Priority:
  1. If history has data for this feature profile → pick the proven best strategy
  2. Otherwise → apply rule-based heuristics
"""

import copy
import os
import sys
import statistics
from dataclasses import dataclass
from typing import List, Callable, Dict, Optional

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


@dataclass
class Strategy:
    name:       str
    passes:     List[str]
    reasoning:  List[str]
    confidence: str = "rule-based"
    score:      int = 0


# ── Strategy catalogue ────────────────────────────────────────────────────────

STRATEGIES: Dict[str, Strategy] = {
    "loop_optimize": Strategy(
        name="Loop Optimization",
        passes=["-O2", "-funroll-loops"],
        reasoning=[],
    ),
    "vectorize": Strategy(
        name="Vectorization",
        passes=["-O3", "-fvectorize", "-fslp-vectorize"],
        reasoning=[],
    ),
    "inline_heavy": Strategy(
        name="Aggressive Inlining",
        passes=["-O3", "-finline-functions"],
        reasoning=[],
    ),
    "memory_opt": Strategy(
        name="Memory Optimization",
        passes=["-O2", "-fstrict-aliasing"],
        reasoning=[],
    ),
    "branch_opt": Strategy(
        name="Branch Optimization",
        passes=["-O1"],
        reasoning=[],
    ),
    "balanced": Strategy(
        name="Balanced (-O2)",
        passes=["-O2"],
        reasoning=["No dominant characteristic — balanced optimization"],
    ),
}

# Map standard benchmark strategy names → catalogue keys
_BENCH_TO_KEY = {
    "O0":   None,   # never pick O0 as APEX strategy
    "O1":   "branch_opt",
    "O2":   "balanced",
    "O3":   "vectorize",
    "APEX": None,   # the previous APEX pick — handled separately
}

# Map catalogue key → passes (for feedback lookup)
_KEY_PASSES: Dict[str, List[str]] = {k: v.passes for k, v in STRATEGIES.items()}


# ── Rules ─────────────────────────────────────────────────────────────────────

def _rule_loop_heavy(f: dict):
    if f["loop_count"] > 0 and f["loop_density"] >= 0.2:
        return True, "High loop density detected", "loop_optimize", 30
    return False, "", "", 0

def _rule_arithmetic_heavy(f: dict):
    if f["arithmetic_density"] >= 0.15 or f["arithmetic_count"] > 50:
        return True, "High arithmetic operation density", "vectorize", 25
    return False, "", "", 0

def _rule_memory_heavy(f: dict):
    if f["memory_density"] >= 0.35:
        return True, "Memory operations dominate (loads + stores)", "memory_opt", 20
    return False, "", "", 0

def _rule_call_heavy(f: dict):
    if f["call_density"] >= 0.15 or f["call_count"] > 20:
        return True, "High function-call density — inlining candidate", "inline_heavy", 20
    return False, "", "", 0

def _rule_branch_heavy(f: dict):
    if f["branch_density"] >= 0.18:
        return True, "High branch density — jump threading candidate", "branch_opt", 15
    return False, "", "", 0

def _rule_vectorizable(f: dict):
    if f["loop_count"] > 0 and f["arithmetic_density"] >= 0.08 and f["memory_density"] >= 0.15:
        return True, "Loop + arithmetic + memory — vectorization opportunity", "vectorize", 25
    return False, "", "", 0

def _rule_large_program(f: dict):
    if f["instruction_count"] > 500:
        return True, "Large program — aggressive inlining beneficial", "inline_heavy", 10
    return False, "", "", 0


RULES: List[Callable] = [
    _rule_loop_heavy,
    _rule_arithmetic_heavy,
    _rule_memory_heavy,
    _rule_call_heavy,
    _rule_branch_heavy,
    _rule_vectorizable,
    _rule_large_program,
]


# ── Feedback lookup ───────────────────────────────────────────────────────────

def _feature_distance(a: dict, b: dict) -> float:
    """Euclidean distance on normalised density features."""
    keys = ["loop_density", "branch_density", "memory_density",
            "arithmetic_density", "call_density"]
    return sum((a.get(k, 0) - b.get(k, 0)) ** 2 for k in keys) ** 0.5


def _best_from_history(features: dict) -> Optional[Strategy]:
    """
    Find the best-performing non-O0 strategy from history for programs
    with a similar feature profile (distance < 0.15).
    Returns a Strategy if confident, None otherwise.
    """
    try:
        import json
        history_file = os.path.join(ROOT, "feedback", "history.json")
        if not os.path.exists(history_file):
            return None
        with open(history_file) as f:
            history = json.load(f)
    except Exception:
        return None

    # Collect entries with similar feature profiles, excluding O0
    similar = [
        e for e in history
        if e.get("strategy") not in ("O0",)
        and e.get("exec_time", 999) > 0
        and _feature_distance(features, e.get("features", {})) < 0.15
    ]

    if len(similar) < 3:   # not enough data to be confident
        return None

    # Group by flags string, compute median exec time
    from collections import defaultdict
    groups: Dict[str, List[float]] = defaultdict(list)
    flags_map: Dict[str, List[str]] = {}
    for e in similar:
        key = " ".join(e.get("flags", []))
        groups[key].append(e["exec_time"])
        flags_map[key] = e.get("flags", [])

    # Need at least 2 samples per group to trust it
    reliable = {k: v for k, v in groups.items() if len(v) >= 2}
    if not reliable:
        return None

    best_flags_str = min(reliable, key=lambda k: statistics.median(reliable[k]))
    best_flags     = flags_map[best_flags_str]
    best_time      = round(statistics.median(reliable[best_flags_str]), 4)

    # Find matching strategy name
    name = "Feedback-Optimized"
    for strat in STRATEGIES.values():
        if strat.passes == best_flags:
            name = strat.name
            break

    return Strategy(
        name      = name,
        passes    = best_flags,
        reasoning = [
            f"Chosen from {len(similar)} similar past benchmarks",
            f"Median exec time for this profile: {best_time}s",
            f"Flags proven fastest: {best_flags_str}",
        ],
        confidence = "feedback-driven",
        score      = len(similar),
    )


# ── Main decide function ──────────────────────────────────────────────────────

def decide(features: dict) -> Strategy:
    # 1. Try feedback history first
    feedback_strategy = _best_from_history(features)
    if feedback_strategy is not None:
        return feedback_strategy

    # 2. Fall back to rules
    scores:   Dict[str, int]        = {k: 0 for k in STRATEGIES}
    reasons:  Dict[str, List[str]]  = {k: [] for k in STRATEGIES}

    for rule in RULES:
        triggered, reason, strat_key, score = rule(features)
        if triggered and strat_key in scores:
            scores[strat_key]  += score
            reasons[strat_key].append(reason)

    best_key = max(scores, key=lambda k: scores[k])
    if scores[best_key] == 0:
        best_key = "balanced"

    result           = copy.deepcopy(STRATEGIES[best_key])
    result.score     = scores[best_key]
    result.reasoning = reasons[best_key] or STRATEGIES["balanced"].reasoning
    return result


def report(features: dict, strategy: Strategy):
    print(f"\n{'='*50}")
    print(f"  APEX OPTIMIZATION RECOMMENDATION")
    print(f"{'='*50}")
    print(f"  Selected Strategy : {strategy.name}")
    print(f"  LLVM Flags        : {' '.join(strategy.passes)}")
    print(f"  Confidence        : {strategy.confidence}")
    print(f"  Score             : {strategy.score}")
    print(f"\n  Reasoning:")
    for r in strategy.reasoning:
        print(f"    * {r}")
    print(f"\n  Program Characteristics:")
    print(f"    loops={features['loop_count']}  loop_density={features['loop_density']}")
    print(f"    arithmetic_density={features['arithmetic_density']}")
    print(f"    memory_density={features['memory_density']}")
    print(f"    call_density={features['call_density']}")
    print(f"    branch_density={features['branch_density']}")
    print(f"{'='*50}\n")


if __name__ == "__main__":
    sys.path.insert(0, ROOT)
    from analyzer.ir_analyzer import analyze
    from analyzer.feature_extractor import extract

    ir_file = sys.argv[1] if len(sys.argv) > 1 else r"benchmark\programs\test_loop.ll"
    metrics  = analyze(ir_file)
    features = extract(metrics)
    strategy = decide(features)
    report(features, strategy)
