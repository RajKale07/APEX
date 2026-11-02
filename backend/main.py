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

from fastapi import FastAPI, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

from compiler.pipeline import compile_to_ir, MINGW_FLAGS, CLANG
from analyzer.ir_analyzer import analyze, report as ir_report
from analyzer.feature_extractor import extract
from optimizer.rule_engine.decision_engine import decide
from feedback.feedback_engine import record_from_benchmark, best_known_strategy

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
    compiler = CLANG
    cmd_flags = flags
    if not os.path.exists(compiler):
        # Fallback to MinGW GCC if available
        gpp = r"C:\MinGW\bin\g++.exe"
        if os.path.exists(gpp):
            compiler = gpp
            cmd_flags = [f for f in flags if not f.startswith("-Xclang")]
        else:
            raise RuntimeError(
                f"Compiler not found at '{CLANG}'. Please install LLVM (run 'winget install LLVM.LLVM')."
            )

    cmd = [compiler] + MINGW_FLAGS + cmd_flags + [source, "-o", exe]
    t0 = time.perf_counter()
    try:
        r  = subprocess.run(cmd, capture_output=True, text=True, timeout=25)
    except FileNotFoundError:
        raise RuntimeError(f"Compiler executable '{compiler}' was not found.")
    t1 = time.perf_counter()
    if r.returncode != 0:
        raise RuntimeError(r.stderr.strip())
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
    output = ""
    # Capture output separately via cmd /c (only once, not timed)
    try:
        out_r = subprocess.run(f'cmd /c "{exe}"', shell=True, capture_output=True, text=True, timeout=10)
        output = out_r.stdout.strip()
    except subprocess.TimeoutExpired:
        return -1.0, "Execution timed out (>10s)"
    except Exception as e:
        output = str(e)

    for _ in range(RUNS):
        try:
            r = subprocess.run(
                [sys.executable, _TIMER_SCRIPT, exe],
                capture_output=True, text=True, timeout=10
            )
            times.append(float(r.stdout.strip()))
        except Exception:
            return -1.0, output

    if not times:
        return -1.0, output
    times.sort()
    chosen = times[:-1] if len(times) > 1 else times
    return round(statistics.median(chosen) / 1000, 4), output


def _run_pipeline(source_path: str) -> dict:
    os.makedirs(BUILD, exist_ok=True)
    base = os.path.splitext(os.path.basename(source_path))[0]
    ir_file = os.path.splitext(source_path)[0] + ".ll"

    # Step 1: Generate IR
    ir_res = compile_to_ir(source_path, ir_file)
    if not ir_res.ok:
        err_msg = ir_res.stderr.strip() or "Failed to compile source to LLVM IR"
        raise RuntimeError(f"LLVM IR Generation Failed:\n{err_msg}")

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
                "binary_size":  os.path.getsize(exe) if os.path.exists(exe) else 0,
                "output":       output,
            })
        except Exception as e:
            benchmark_results.append({"strategy": name, "error": str(e)})

    # Step 5: Record feedback
    record_from_benchmark(source_path, features, benchmark_results)

    # Read IR content for display
    ir_content = ""
    if os.path.exists(ir_file):
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
    request: Request,
    file: Optional[UploadFile] = File(None),
    code: Optional[str]        = Form(None),
    filename: Optional[str]    = Form(None),
):
    """Accept either a file upload, form data, or JSON body, run full APEX pipeline."""
    code_str = ""
    fname = filename or "input.cpp"

    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        try:
            body = await request.json()
            code_str = body.get("code", "")
            fname = body.get("filename", fname)
        except Exception:
            pass

    if not code_str:
        if file is not None:
            content = await file.read()
            code_str = content.decode("utf-8", errors="ignore")
            fname = file.filename or fname
        elif code:
            code_str = code

    if not code_str or not code_str.strip():
        return {"error": "Please provide C++ code to analyze (via code string or file upload)"}

    # Write to temp file
    tmp_dir = os.path.join(ROOT, "build", "tmp")
    os.makedirs(tmp_dir, exist_ok=True)
    safe_fname = os.path.basename(fname).replace(" ", "_")
    src_path = os.path.join(tmp_dir, f"{uuid.uuid4().hex[:8]}_{safe_fname}")

    with open(src_path, "w", encoding="utf-8") as f:
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
