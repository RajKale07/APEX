"""
APEX Phase 3 — Feature Extractor
Converts IRMetrics into a structured feature vector for the decision engine.
"""

import json
import sys
import os
from dataclasses import asdict

# Allow running from project root
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from analyzer.ir_analyzer import IRMetrics


def extract(m: IRMetrics) -> dict:
    total = max(m.instructions, 1)

    return {
        # Raw counts
        "instruction_count":  m.instructions,
        "basic_block_count":  m.basic_blocks,
        "function_count":     m.functions,
        "loop_count":         m.loops,
        "max_loop_depth":     m.max_loop_depth,
        "branch_count":       m.branches,
        "load_count":         m.loads,
        "store_count":        m.stores,
        "arithmetic_count":   m.arithmetic,
        "call_count":         m.calls,
        "comparison_count":   m.comparisons,

        # Derived ratios (useful for ML and rule engine)
        "loop_density":       round(m.loops / max(m.basic_blocks, 1), 4),
        "branch_density":     round(m.branches / total, 4),
        "memory_density":     round((m.loads + m.stores) / total, 4),
        "arithmetic_density": round(m.arithmetic / total, 4),
        "call_density":       round(m.calls / total, 4),
    }


def to_vector(features: dict) -> list:
    """Ordered numerical vector for ML models."""
    keys = [
        "instruction_count", "basic_block_count", "function_count",
        "loop_count", "max_loop_depth", "branch_count",
        "load_count", "store_count", "arithmetic_count",
        "call_count", "comparison_count",
        "loop_density", "branch_density", "memory_density",
        "arithmetic_density", "call_density",
    ]
    return [features[k] for k in keys]


if __name__ == "__main__":
    from analyzer.ir_analyzer import analyze

    ir_file = sys.argv[1] if len(sys.argv) > 1 else r"benchmark\programs\test_loop.ll"
    if not os.path.exists(ir_file):
        print(f"[APEX] IR file not found: {ir_file}")
        sys.exit(1)

    metrics  = analyze(ir_file)
    features = extract(metrics)
    vector   = to_vector(features)

    print("\n--- APEX Feature Vector ---")
    print(json.dumps(features, indent=2))
    print(f"\nNumerical vector ({len(vector)} dims):")
    print(vector)
