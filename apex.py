"""
APEX CLI — Adaptive Compiler Architecture
Usage:
  python apex.py analyze  <source.cpp>
  python apex.py compile  <source.cpp> [flags...]
  python apex.py optimize <source.cpp>
  python apex.py report   <source.cpp>
"""

import sys
import os
import logging

logging.basicConfig(format="[APEX] %(message)s", level=logging.INFO)
log = logging.getLogger("apex")

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ROOT)

from compiler.pipeline import (
    full_pipeline, compile_to_ir, run_executable,
    print_pipeline_result, MINGW_FLAGS, CLANG,
)
from analyzer.ir_analyzer import analyze, report as ir_report
from analyzer.feature_extractor import extract
from optimizer.rule_engine.decision_engine import decide, report as strategy_report

BUILD = os.path.join(ROOT, "build")


def _ir_path(source: str) -> str:
    return os.path.splitext(source)[0] + ".ll"

def _exe_path(source: str) -> str:
    os.makedirs(BUILD, exist_ok=True)
    return os.path.join(BUILD, os.path.basename(os.path.splitext(source)[0]) + ".exe")


def cmd_analyze(source: str):
    """Generate IR if needed, then show metrics + strategy recommendation."""
    ir = _ir_path(source)
    if not os.path.exists(ir):
        log.info("IR not found — generating")
        r = compile_to_ir(source, ir)
        if not r.ok:
            log.error("IR generation failed:\n" + r.stderr)
            sys.exit(1)
    metrics  = analyze(ir)
    ir_report(metrics, ir)
    features = extract(metrics)
    strategy = decide(features)
    strategy_report(features, strategy)


def cmd_compile(source: str, flags: list):
    """Compile with explicit flags and run."""
    if not flags:
        flags = ["-O2"]
    result = full_pipeline(source, flags)
    print_pipeline_result(result)
    sys.exit(0 if result.success else 1)


def cmd_optimize(source: str):
    """Full APEX pipeline: analyze -> decide -> compile with chosen strategy -> run."""
    log.info(f"Loading source: {source}")

    # Step 1: IR
    ir = _ir_path(source)
    r  = compile_to_ir(source, ir)
    if not r.ok:
        log.error("IR generation failed:\n" + r.stderr)
        sys.exit(1)

    # Step 2: Analyze + decide
    log.info("Analyzing program")
    metrics  = analyze(ir)
    features = extract(metrics)

    log.info("Selecting optimization strategy")
    strategy = decide(features)
    strategy_report(features, strategy)

    # Step 3: Compile + run with chosen strategy
    log.info(f"Running LLVM optimization: {' '.join(strategy.passes)}")
    result = full_pipeline(source, strategy.passes)
    print_pipeline_result(result)
    sys.exit(0 if result.success else 1)


def cmd_report(source: str):
    cmd_analyze(source)


COMMANDS = {
    "analyze":  lambda args: cmd_analyze(args[0]),
    "compile":  lambda args: cmd_compile(args[0], args[1:]),
    "optimize": lambda args: cmd_optimize(args[0]),
    "report":   lambda args: cmd_report(args[0]),
}

USAGE = """
APEX — Adaptive Compiler Architecture

  python apex.py analyze  <source.cpp>            Analyze IR, show recommendation
  python apex.py compile  <source.cpp> [flags...]  Compile with given flags and run
  python apex.py optimize <source.cpp>            Full APEX pipeline
  python apex.py report   <source.cpp>            Alias for analyze

Examples:
  python apex.py optimize benchmark\\programs\\test_loop.cpp
  python apex.py compile  benchmark\\programs\\test_loop.cpp -O3 -funroll-loops
  python apex.py analyze  benchmark\\programs\\test_loop.cpp
"""

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(USAGE)
        sys.exit(0)

    command = sys.argv[1]
    args    = sys.argv[2:]

    if command not in COMMANDS:
        log.error(f"Unknown command: {command}")
        print(USAGE)
        sys.exit(1)

    if not os.path.exists(args[0]):
        log.error(f"File not found: {args[0]}")
        sys.exit(1)

    COMMANDS[command](args)
