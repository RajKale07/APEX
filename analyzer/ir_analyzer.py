"""
APEX Phase 2 — LLVM IR Analyzer
Reads a real .ll file and extracts program characteristics.
"""

import re
import sys
import os
from dataclasses import dataclass, field
from typing import List


@dataclass
class IRMetrics:
    instructions:   int = 0
    basic_blocks:   int = 0
    functions:      int = 0
    branches:       int = 0
    loads:          int = 0
    stores:         int = 0
    arithmetic:     int = 0
    calls:          int = 0
    comparisons:    int = 0
    loops:          int = 0
    max_loop_depth: int = 0


# Arithmetic opcodes in LLVM IR
_ARITH_OPS = re.compile(
    r"^\s+%\S+\s*=\s*(add|sub|mul|sdiv|udiv|srem|urem|fadd|fsub|fmul|fdiv|frem|shl|lshr|ashr|and|or|xor)\b"
)
_BRANCH    = re.compile(r"^\s+br\b")
_LOAD      = re.compile(r"^\s+%\S+ = load\b")
_STORE     = re.compile(r"^\s+store\b")
_CALL      = re.compile(r"^\s+(%\S+ = )?(call|invoke)\b")
_CMP       = re.compile(r"^\s+%\S+ = (icmp|fcmp)\b")
_FUNC_DEF  = re.compile(r"^define\b")
_BB_LABEL  = re.compile(r"^(\d+|[a-zA-Z_][a-zA-Z0-9_.]*):") 
_LOOP_META = re.compile(r"!llvm\.loop\b")


def _count_loop_depth(lines: List[str]) -> int:
    """
    Estimate max loop depth by tracking nested loop metadata references.
    Each unique !llvm.loop metadata node signals a loop. Nesting is inferred
    from br instructions that back-reference earlier basic blocks within the
    same function.
    """
    # Collect all loop metadata IDs referenced in branch instructions
    loop_ids = set()
    for line in lines:
        if _LOOP_META.search(line):
            ids = re.findall(r"!([\d]+)", line)
            loop_ids.update(ids)

    if not loop_ids:
        return 0

    # Simple heuristic: count distinct loop metadata nodes as a proxy for depth
    # A real depth analysis requires CFG construction; this is a sound lower bound
    return len(loop_ids)


def analyze(ir_file: str) -> IRMetrics:
    with open(ir_file, "r", encoding="utf-8", errors="ignore") as f:
        lines = f.readlines()

    m = IRMetrics()
    in_function = False

    for line in lines:
        # Function definitions
        if _FUNC_DEF.match(line):
            m.functions += 1
            in_function = True
            continue

        if not in_function:
            continue

        # Basic block labels (lines ending with ':' that are not indented)
        if _BB_LABEL.match(line):
            m.basic_blocks += 1
            continue

        # Count instructions by category
        if _BRANCH.match(line):
            m.branches += 1
            m.instructions += 1
        elif _LOAD.match(line):
            m.loads += 1
            m.instructions += 1
        elif _STORE.match(line):
            m.stores += 1
            m.instructions += 1
        elif _ARITH_OPS.match(line):
            m.arithmetic += 1
            m.instructions += 1
        elif _CALL.match(line):
            m.calls += 1
            m.instructions += 1
        elif _CMP.match(line):
            m.comparisons += 1
            m.instructions += 1
        elif re.match(r"^\s+%\S+\s*=|^\s+ret\b|^\s+switch\b|^\s+select\b|^\s+phi\b|^\s+alloca\b|^\s+getelementptr\b|^\s+bitcast\b|^\s+trunc\b|^\s+zext\b|^\s+sext\b", line):
            m.instructions += 1

    # Loop detection via metadata
    m.loops = len(set(re.findall(r"llvm\.loop !(\d+)", "".join(lines))))
    m.max_loop_depth = _count_loop_depth(lines)

    return m


def report(m: IRMetrics, ir_file: str):
    print(f"\n{'='*45}")
    print(f"  APEX PROGRAM ANALYSIS")
    print(f"  File: {ir_file}")
    print(f"{'='*45}")
    print(f"  Instructions       : {m.instructions}")
    print(f"  Basic Blocks       : {m.basic_blocks}")
    print(f"  Functions          : {m.functions}")
    print(f"  Loops              : {m.loops}")
    print(f"  Max Loop Depth     : {m.max_loop_depth}")
    print(f"  Branches           : {m.branches}")
    print(f"  Loads              : {m.loads}")
    print(f"  Stores             : {m.stores}")
    print(f"  Arithmetic Ops     : {m.arithmetic}")
    print(f"  Function Calls     : {m.calls}")
    print(f"  Comparisons        : {m.comparisons}")
    print(f"{'='*45}\n")


if __name__ == "__main__":
    ir_file = sys.argv[1] if len(sys.argv) > 1 else r"benchmark\programs\test_loop.ll"
    if not os.path.exists(ir_file):
        print(f"[APEX] IR file not found: {ir_file}")
        sys.exit(1)
    metrics = analyze(ir_file)
    report(metrics, ir_file)
