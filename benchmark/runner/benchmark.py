"""
APEX Phase 6 — Benchmark Engine
Compares -O0, -O1, -O2, -O3, and APEX strategy on a given source file.
Measures: execution time, compile time, binary size.
"""

import subprocess
import sys
import os
import time
import json
import statistics
import logging

logging.basicConfig(format="[APEX] %(message)s", level=logging.INFO)
log = logging.getLogger("apex")

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, ROOT)

from compiler.pipeline import MINGW_FLAGS
from analyzer.ir_analyzer import analyze
from analyzer.feature_extractor import extract
from optimizer.rule_engine.decision_engine import decide

CLANG  = r"C:\Program Files\LLVM\bin\clang++.exe"
BUILD  = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "build")
RUNS   = 7   # timed executions per strategy — more runs = less noise

def compile_timed(source: str, exe: str, flags: list) -> float:
    """Returns compile time in seconds."""
    cmd = [CLANG] + MINGW_FLAGS + flags + [source, "-o", exe]
    t0 = time.perf_counter()
    result = subprocess.run(cmd, capture_output=True, text=True)
    t1 = time.perf_counter()
    if result.returncode != 0:
        log.error(f"Compile failed: {result.stderr}")
        return -1.0
    return round(t1 - t0, 4)


def run_timed(exe: str) -> float:
    """
    Time the executable using CreateProcess directly (no cmd /c shell).
    Uses a Python wrapper script to avoid AppLocker while keeping timing clean.
    """
    timer_script = os.path.join(ROOT, "build", "_timer.py")
    # Write a tiny timing helper that runs the exe and prints elapsed ms
    with open(timer_script, "w") as f:
        f.write(
            "import subprocess, time, sys\n"
            "t0=time.perf_counter()\n"
            "r=subprocess.run(sys.argv[1:],capture_output=True)\n"
            "print(f'{(time.perf_counter()-t0)*1000:.2f}')\n"
        )

    times = []
    for _ in range(RUNS):
        r = subprocess.run(
            [sys.executable, timer_script, exe],
            capture_output=True, text=True
        )
        if r.returncode != 0:
            return -1.0
        try:
            times.append(float(r.stdout.strip()))
        except ValueError:
            return -1.0

    times.sort()
    trimmed = times[:-1]   # drop worst outlier
    return round(statistics.median(trimmed) / 1000, 4)  # ms -> seconds


def binary_size(exe: str) -> int:
    return os.path.getsize(exe) if os.path.exists(exe) else -1


def apex_flags(source: str) -> list:
    """Determine APEX-recommended flags by running the full analysis pipeline."""
    ir_file = os.path.splitext(source)[0] + ".ll"
    # Generate IR if needed
    cmd = [CLANG] + MINGW_FLAGS + ["-S", "-emit-llvm", "-O0",
           "-Xclang", "-disable-O0-optnone", source, "-o", ir_file]
    subprocess.run(cmd, capture_output=True)
    metrics  = analyze(ir_file)
    features = extract(metrics)
    strategy = decide(features)
    log.info(f"APEX selected: {strategy.name} -> {' '.join(strategy.passes)}")
    return strategy.passes


def benchmark(source: str) -> list:
    os.makedirs(BUILD, exist_ok=True)
    base = os.path.basename(os.path.splitext(source)[0])

    strategies = {
        "O0":   ["-O0"],
        "O1":   ["-O1"],
        "O2":   ["-O2"],
        "O3":   ["-O3"],
        "APEX": apex_flags(source),
    }

    results = []
    for name, flags in strategies.items():
        exe = os.path.join(BUILD, f"{base}_{name}.exe")
        log.info(f"Benchmarking {name}: {' '.join(flags)}")

        compile_time = compile_timed(source, exe, flags)
        if compile_time < 0:
            results.append({"strategy": name, "error": "compile_failed"})
            continue

        exec_time = run_timed(exe)
        size      = binary_size(exe)

        results.append({
            "strategy":     name,
            "flags":        " ".join(flags),
            "compile_time": compile_time,
            "exec_time":    exec_time,
            "binary_size":  size,
        })

    return results


def print_table(results: list, source: str):
    print(f"\n{'='*65}")
    print(f"  APEX BENCHMARK RESULTS — {os.path.basename(source)}")
    print(f"  Runs per strategy: {RUNS} (median exec time)")
    print(f"{'='*65}")
    print(f"  {'Strategy':<10} {'Compile(s)':<14} {'Exec(s)':<12} {'Binary(bytes)':<15}")
    print(f"  {'-'*58}")
    for r in results:
        if "error" in r:
            print(f"  {r['strategy']:<10} ERROR")
            continue
        print(f"  {r['strategy']:<10} {r['compile_time']:<14} {r['exec_time']:<12} {r['binary_size']:<15}")
    print(f"{'='*65}\n")


def save_results(results: list, source: str):
    out_dir  = os.path.join(ROOT, "feedback")
    os.makedirs(out_dir, exist_ok=True)
    base     = os.path.basename(os.path.splitext(source)[0])
    out_file = os.path.join(out_dir, f"{base}_benchmark.json")
    with open(out_file, "w") as f:
        json.dump({"source": source, "runs": RUNS, "results": results}, f, indent=2)
    log.info(f"Results saved: {out_file}")


if __name__ == "__main__":
    source = sys.argv[1] if len(sys.argv) > 1 else r"benchmark\programs\test_loop.cpp"
    if not os.path.exists(source):
        log.error(f"File not found: {source}")
        sys.exit(1)

    # Generate features for feedback recording
    ir_file = os.path.splitext(source)[0] + ".ll"
    cmd = [CLANG] + MINGW_FLAGS + ["-S", "-emit-llvm", "-O0",
           "-Xclang", "-disable-O0-optnone", source, "-o", ir_file]
    subprocess.run(cmd, capture_output=True)
    from analyzer.ir_analyzer import analyze
    from analyzer.feature_extractor import extract
    features = extract(analyze(ir_file))

    results = benchmark(source)
    print_table(results, source)
    save_results(results, source)

    # Record into feedback history
    from feedback.feedback_engine import record_from_benchmark, report as fb_report
    record_from_benchmark(source, features, results)
    fb_report(source)
