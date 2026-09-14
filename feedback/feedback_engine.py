"""
APEX Phase 7 — Feedback Engine
Records benchmark results, evaluates strategy performance,
and adapts future decisions based on observed outcomes.
"""

import json
import os
import sys
import time
from typing import Optional

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

FEEDBACK_DIR = os.path.join(ROOT, "feedback")
HISTORY_FILE = os.path.join(FEEDBACK_DIR, "history.json")


def _load_history() -> list:
    if not os.path.exists(HISTORY_FILE):
        return []
    with open(HISTORY_FILE, "r") as f:
        return json.load(f)


def _save_history(history: list):
    os.makedirs(FEEDBACK_DIR, exist_ok=True)
    with open(HISTORY_FILE, "w") as f:
        json.dump(history, f, indent=2)


def record(
    source: str,
    features: dict,
    strategy_name: str,
    flags: list,
    exec_time: float,
    compile_time: float,
    binary_size: int,
):
    """Store one benchmark result in the feedback history."""
    entry = {
        "timestamp":    time.strftime("%Y-%m-%dT%H:%M:%S"),
        "source":       os.path.basename(source),
        "features":     features,
        "strategy":     strategy_name,
        "flags":        flags,
        "exec_time":    exec_time,
        "compile_time": compile_time,
        "binary_size":  binary_size,
    }
    history = _load_history()
    history.append(entry)
    _save_history(history)
    return entry


def best_known_strategy(source: str, history: Optional[list] = None) -> Optional[dict]:
    """
    Return the strategy with the lowest median exec_time for this source file.
    Returns None if no history exists for this file.
    """
    if history is None:
        history = _load_history()

    base = os.path.basename(source)
    relevant = [e for e in history if e["source"] == base and e["exec_time"] > 0]
    if not relevant:
        return None

    # Group by strategy name, compute median exec time
    from collections import defaultdict
    import statistics
    groups = defaultdict(list)
    for e in relevant:
        groups[e["strategy"]].append(e["exec_time"])

    best = min(groups.items(), key=lambda kv: statistics.median(kv[1]))
    return {
        "strategy":       best[0],
        "median_exec":    round(statistics.median(groups[best[0]]), 4),
        "sample_count":   len(groups[best[0]]),
        "all_strategies": {k: round(statistics.median(v), 4) for k, v in groups.items()},
    }


def record_from_benchmark(source: str, features: dict, benchmark_results: list):
    """Convenience: record all strategies from a benchmark run."""
    for r in benchmark_results:
        if "error" in r:
            continue
        record(
            source       = source,
            features     = features,
            strategy_name= r["strategy"],
            flags        = r["flags"].split(),
            exec_time    = r["exec_time"],
            compile_time = r["compile_time"],
            binary_size  = r["binary_size"],
        )


def report(source: str):
    best = best_known_strategy(source)
    if best is None:
        print(f"[APEX Feedback] No history for {os.path.basename(source)}")
        return

    print(f"\n{'='*50}")
    print(f"  APEX FEEDBACK — {os.path.basename(source)}")
    print(f"{'='*50}")
    print(f"  Best strategy : {best['strategy']}")
    print(f"  Median exec   : {best['median_exec']}s  ({best['sample_count']} samples)")
    print(f"\n  All strategies (median exec time):")
    for strat, t in sorted(best["all_strategies"].items(), key=lambda x: x[1]):
        marker = " <-- best" if strat == best["strategy"] else ""
        print(f"    {strat:<12} {t}s{marker}")
    print(f"{'='*50}\n")


if __name__ == "__main__":
    source = sys.argv[1] if len(sys.argv) > 1 else r"benchmark\programs\test_loop.cpp"
    report(source)
