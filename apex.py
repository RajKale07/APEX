"""
APEX CLI — Adaptive Compiler Architecture
Usage:
  python apex.py analyze  <source.cpp>
  python apex.py compile  <source.cpp> [opt_level]
  python apex.py optimize <source.cpp>
  python apex.py report   <source.cpp>
"""

import sys
import os
import logging

logging.basicConfig(format="[APEX] %(message)s", level=logging.INFO)
log = logging.getLogger("apex")

# Project root on path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from compiler.pipeline import compile_to_ir, compile_to_exe, run_executable, MINGW_FLAGS
from analyzer.ir_analyzer import analyze, report as ir_report
from analyzer.feature_extractor import extract
from optimizer.rule_engine.decision_engine import decide, report as strategy_report

CLANG    = r"C:\Program Files\LLVM\bin\clang++.exe"
BUILD    = os.path.join(os.path.dirname(os.path.abspath(__file__)), "build")


def _ir_path(source: str) -> str:
    return os.path.splitext(source)[0] + ".ll"

def _exe_path(source: str) -> str:
    os.makedirs(BUILD, exist_ok=True)
    return os.path.join(BUILD, os.path.basename(os.path.splitext(source)[0]) + ".exe")


def cmd_analyze(source: str):
    ir = _ir_path(source)
    if not os.path.exists(ir):
        log.info("IR not found — generating first")
        compile_to_ir(source, ir)
    metrics = analyze(ir)
    ir_report(metrics, ir)
    features = extract(metrics)
    strategy = decide(features)
    strategy_report(features, strategy)


def cmd_compile(source: str, opt_level: str = "O2"):
    ir  = _ir_path(source)
    exe = _exe_path(source)
    compile_to_ir(source, ir)
    compile_to_exe(source, exe, opt_level)
    run_executable(exe)


def cmd_optimize(source: str):
    """Run full APEX pipeline: analyze -> decide -> compile with chosen strategy."""
    ir  = _ir_path(source)
    exe = _exe_path(source)

    log.info("Loading source: " + source)
    compile_to_ir(source, ir)

    log.info("Analyzing program")
    metrics  = analyze(ir)
    features = extract(metrics)

    log.info("Selecting optimization strategy")
    strategy = decide(features)
    strategy_report(features, strategy)

    # Translate strategy passes to a single opt level for clang
    # Strategy passes contain the primary -Ox flag as first element
    opt_flag = strategy.passes[0].lstrip("-")   # e.g. "O2", "O3"
    extra    = strategy.passes[1:]               # e.g. ["-funroll-loops"]

    log.info(f"Running LLVM optimization: {' '.join(strategy.passes)}")
    _compile_with_flags(source, exe, opt_flag, extra)

    log.info("Executing optimized binary")
    run_executable(exe)


def _compile_with_flags(source: str, exe: str, opt_level: str, extra_flags: list):
    import subprocess
    cmd = [CLANG] + MINGW_FLAGS + [f"-{opt_level}"] + extra_flags + [source, "-o", exe]
    log.info(f"Compiling: -{opt_level} {' '.join(extra_flags)}")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        log.error("Compilation failed:\n" + result.stderr)
        sys.exit(1)


def cmd_report(source: str):
    cmd_analyze(source)


COMMANDS = {
    "analyze":  lambda args: cmd_analyze(args[0]),
    "compile":  lambda args: cmd_compile(args[0], args[1] if len(args) > 1 else "O2"),
    "optimize": lambda args: cmd_optimize(args[0]),
    "report":   lambda args: cmd_report(args[0]),
}

USAGE = """
APEX — Adaptive Compiler Architecture

  python apex.py analyze  <source.cpp>       Analyze IR and show recommendation
  python apex.py compile  <source.cpp> [Ox]  Compile with given opt level
  python apex.py optimize <source.cpp>       Full APEX pipeline (analyze+decide+compile)
  python apex.py report   <source.cpp>       Alias for analyze
"""

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(USAGE)
        sys.exit(0)

    command = sys.argv[1]
    args    = sys.argv[2:]

    if command not in COMMANDS:
        print(f"[APEX] Unknown command: {command}")
        print(USAGE)
        sys.exit(1)

    if not os.path.exists(args[0]):
        log.error(f"File not found: {args[0]}")
        sys.exit(1)

    COMMANDS[command](args)
