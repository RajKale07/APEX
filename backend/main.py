"""
APEX FastAPI Backend — Phase 9
Exposes the full APEX pipeline as REST API endpoints.
"""

import os
import sys
import uuid
import tempfile
import subprocess
import statistics
import time

from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

from compiler.pipeline import compile_to_ir, MINGW_FLAGS
from analyzer.ir_analyzer import analyze, report as ir_report
from analyzer.feature_extractor import extract
from optimizer.rule_engine.decision_engine import decide
from feedback.feedback_engine import record_from_benchmark, best_known_strategy

CLANG = r"C:\Program Files\LLVM\bin\clang++.exe"
BUILD = os.path.join(ROOT, "build")
RUNS  = 7

app = FastAPI(title="APEX Adaptive Compiler", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _compile_exe(source: str, exe: str, flags: list) -> float:
    cmd = [CLANG] + MINGW_FLAGS + flags + [source, "-o", exe]
    t0 = time.perf_counter()
    r  = subprocess.run(cmd, capture_output=True, text=True)
    t1 = time.perf_counter()
    if r.returncode != 0:
        raise RuntimeError(r.stderr)
    return round(t1 - t0, 4)


_TIMER_SCRIPT = os.path.join(BUILD, "_timer.py")

def _ensure_timer():
    os.makedirs(BUILD, exist_ok=True)
    with open(_TIMER_SCRIPT, "w") as f:
        f.write(
            "import subprocess,time,sys\n"
            "t0=time.perf_counter()\n"
            "subprocess.run(sys.argv[1:],capture_output=True)\n"
            "print(f'{(time.perf_counter()-t0)*1000:.2f}')\n"
        )

def _run_exe(exe: str) -> tuple[float, str]:
    _ensure_timer()
    times = []
    # Capture output separately via cmd /c (only once, not timed)
    out_r = subprocess.run(f'cmd /c "{exe}"', shell=True, capture_output=True, text=True)
    output = out_r.stdout.strip()
    for _ in range(RUNS):
        r = subprocess.run(
            [sys.executable, _TIMER_SCRIPT, exe],
            capture_output=True, text=True
        )
        try:
            times.append(float(r.stdout.strip()))
        except ValueError:
            return -1.0, output
    times.sort()
    return round(statistics.median(times[:-1]) / 1000, 4), output


def _run_pipeline(source_path: str) -> dict:
    os.makedirs(BUILD, exist_ok=True)
    base = os.path.splitext(os.path.basename(source_path))[0]
    ir_file = os.path.splitext(source_path)[0] + ".ll"

    # Step 1: Generate IR
    compile_to_ir(source_path, ir_file)

    # Step 2: Analyze
    metrics  = analyze(ir_file)
    features = extract(metrics)

    # Step 3: Decide
    strategy = decide(features)

    # Step 4: Benchmark all strategies
    strategies = {
        "O0":   ["-O0"],
        "O1":   ["-O1"],
        "O2":   ["-O2"],
        "O3":   ["-O3"],
        "APEX": strategy.passes,
    }

    benchmark_results = []
    for name, flags in strategies.items():
        exe = os.path.join(BUILD, f"{base}_{name}_{uuid.uuid4().hex[:6]}.exe")
        try:
            compile_time = _compile_exe(source_path, exe, flags)
            exec_time, output = _run_exe(exe)
            benchmark_results.append({
                "strategy":     name,
                "flags":        " ".join(flags),
                "compile_time": compile_time,
                "exec_time":    exec_time,
                "binary_size":  os.path.getsize(exe),
                "output":       output,
            })
        except Exception as e:
            benchmark_results.append({"strategy": name, "error": str(e)})

    # Step 5: Record feedback
    record_from_benchmark(source_path, features, benchmark_results)

    # Read IR content for display
    with open(ir_file, "r", errors="ignore") as f:
        ir_content = f.read()

    return {
        "metrics":   {
            "instructions":  metrics.instructions,
            "basic_blocks":  metrics.basic_blocks,
            "functions":     metrics.functions,
            "loops":         metrics.loops,
            "max_loop_depth":metrics.max_loop_depth,
            "branches":      metrics.branches,
            "loads":         metrics.loads,
            "stores":        metrics.stores,
            "arithmetic":    metrics.arithmetic,
            "calls":         metrics.calls,
            "comparisons":   metrics.comparisons,
        },
        "features":  features,
        "strategy":  {
            "name":      strategy.name,
            "passes":    strategy.passes,
            "reasoning": strategy.reasoning,
            "score":     strategy.score,
        },
        "benchmark": benchmark_results,
        "ir_snippet": ir_content[:3000],   # first 3000 chars for display
    }


@app.post("/api/analyze")
async def analyze_code(
    file: Optional[UploadFile] = File(None),
    code: Optional[str]        = Form(None),
    filename: Optional[str]    = Form("input.cpp"),
):
    """Accept either a file upload or pasted code, run full APEX pipeline."""
    if file is not None:
        content = await file.read()
        code_str = content.decode("utf-8", errors="ignore")
        fname = file.filename or filename
    elif code:
        code_str = code
        fname = filename
    else:
        return {"error": "Provide either a file or code"}

    # Write to temp file
    tmp_dir = os.path.join(ROOT, "build", "tmp")
    os.makedirs(tmp_dir, exist_ok=True)
    src_path = os.path.join(tmp_dir, f"{uuid.uuid4().hex[:8]}_{fname}")

    with open(src_path, "w") as f:
        f.write(code_str)

    try:
        result = _run_pipeline(src_path)
        result["filename"] = fname
        return result
    except Exception as e:
        return {"error": str(e)}


@app.get("/api/history")
def get_history():
    from feedback.feedback_engine import _load_history
    return _load_history()


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "1.0.0"}
