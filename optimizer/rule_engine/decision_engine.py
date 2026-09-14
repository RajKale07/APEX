"""
APEX Phase 4 — Rule-Based Decision Engine
Receives a feature vector and recommends an optimization strategy.
Rules are modular and configurable — not one giant function.
"""

from dataclasses import dataclass, field
from typing import List, Callable, Dict


@dataclass
class Strategy:
    name:        str
    passes:      List[str]          # LLVM opt flags this maps to
    reasoning:   List[str]
    confidence:  str = "rule-based"
    score:       int = 0            # higher = more recommended


# ---------------------------------------------------------------------------
# Individual rules — each is a function(features) -> (triggered, reason, score)
# ---------------------------------------------------------------------------

def _rule_loop_heavy(f: dict):
    if f["loop_count"] > 0 and f["loop_density"] >= 0.2:
        return True, "High loop density detected", 30
    return False, "", 0

def _rule_arithmetic_heavy(f: dict):
    if f["arithmetic_density"] >= 0.15 or f["arithmetic_count"] > 50:
        return True, "High arithmetic operation density", 25
    return False, "", 0

def _rule_memory_heavy(f: dict):
    if f["memory_density"] >= 0.3:
        return True, "Memory operations dominate (loads + stores)", 20
    return False, "", 0

def _rule_call_heavy(f: dict):
    if f["call_density"] >= 0.15 or f["call_count"] > 20:
        return True, "High function-call density — inlining candidate", 20
    return False, "", 0

def _rule_branch_heavy(f: dict):
    if f["branch_density"] >= 0.12:
        return True, "High branch density — jump threading candidate", 15
    return False, "", 0

def _rule_vectorizable(f: dict):
    if f["loop_count"] > 0 and f["arithmetic_density"] >= 0.05 and f["memory_density"] >= 0.1:
        return True, "Loop + arithmetic + memory pattern — vectorization opportunity", 25
    return False, "", 0

def _rule_large_program(f: dict):
    if f["instruction_count"] > 500:
        return True, "Large program — aggressive inlining and DCE beneficial", 10
    return False, "", 0


RULES: List[Callable] = [
    _rule_loop_heavy,
    _rule_arithmetic_heavy,
    _rule_memory_heavy,
    _rule_call_heavy,
    _rule_branch_heavy,
    _rule_vectorizable,
    _rule_large_program,
]


# ---------------------------------------------------------------------------
# Strategy templates
# ---------------------------------------------------------------------------

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
        passes=["-O2", "-finline-functions"],
        reasoning=[],
    ),
    "memory_opt": Strategy(
        name="Memory Optimization",
        passes=["-O2", "-fstrict-aliasing"],
        reasoning=[],
    ),
    "branch_opt": Strategy(
        name="Branch Optimization",
        passes=["-O2"],
        reasoning=[],
    ),
    "balanced": Strategy(
        name="Balanced (-O2)",
        passes=["-O2"],
        reasoning=["No dominant characteristic — balanced optimization"],
    ),
}


# ---------------------------------------------------------------------------
# Rule → strategy mapping
# ---------------------------------------------------------------------------

RULE_STRATEGY_MAP = {
    _rule_loop_heavy:       "loop_optimize",
    _rule_vectorizable:     "vectorize",
    _rule_call_heavy:       "inline_heavy",
    _rule_memory_heavy:     "memory_opt",
    _rule_branch_heavy:     "branch_opt",
    _rule_arithmetic_heavy: "vectorize",
    _rule_large_program:    "inline_heavy",
}


# ---------------------------------------------------------------------------
# Engine
# ---------------------------------------------------------------------------

def decide(features: dict) -> Strategy:
    scores: Dict[str, int] = {k: 0 for k in STRATEGIES}
    triggered_reasons: Dict[str, List[str]] = {k: [] for k in STRATEGIES}

    for rule in RULES:
        triggered, reason, score = rule(features)
        if triggered:
            strat_key = RULE_STRATEGY_MAP.get(rule, "balanced")
            scores[strat_key] += score
            triggered_reasons[strat_key].append(reason)

    best_key = max(scores, key=lambda k: scores[k])

    # Fall back to balanced if nothing triggered
    if scores[best_key] == 0:
        best_key = "balanced"

    import copy
    result = copy.deepcopy(STRATEGIES[best_key])
    result.score = scores[best_key]
    result.reasoning = triggered_reasons[best_key] or STRATEGIES["balanced"].reasoning
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
    import sys, os, json
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from analyzer.ir_analyzer import analyze
    from analyzer.feature_extractor import extract

    ir_file = sys.argv[1] if len(sys.argv) > 1 else r"benchmark\programs\test_loop.ll"
    metrics  = analyze(ir_file)
    features = extract(metrics)
    strategy = decide(features)
    report(features, strategy)
