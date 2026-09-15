"""
APEX — compiler/pipeline.py
Phase 1: C++ source -> Clang -> LLVM IR -> LLVM optimization -> Executable -> Run

Public API
----------
compile_to_ir(source, ir_file)          -> CompileResult
compile_to_exe(source, exe_file, flags) -> CompileResult
run_executable(exe_file)                -> RunResult
full_pipeline(source, opt_flags)        -> PipelineResult
"""

import os
import subprocess
import time
import logging
from dataclasses import dataclass, field
from typing import List

log = logging.getLogger("apex.pipeline")

# ── Tool paths ────────────────────────────────────────────────────────────────

CLANG   = r"C:\Program Files\LLVM\bin\clang++.exe"
MINGW   = r"C:\MinGW"
_GCC    = "6.3.0"
_ARCH   = "mingw32"

# Flags that point Clang at MinGW's C++ standard library headers
MINGW_FLAGS: List[str] = [
    "--target=i686-w64-mingw32",
    f"-isystem{MINGW}\\lib\\gcc\\{_ARCH}\\{_GCC}\\include\\c++",
    f"-isystem{MINGW}\\lib\\gcc\\{_ARCH}\\{_GCC}\\include\\c++\\{_ARCH}",
    f"-isystem{MINGW}\\lib\\gcc\\{_ARCH}\\{_GCC}\\include\\c++\\backward",
    f"-isystem{MINGW}\\lib\\gcc\\{_ARCH}\\{_GCC}\\include",
    f"-isystem{MINGW}\\include",
    f"-L{MINGW}\\lib\\gcc\\{_ARCH}\\{_GCC}",
    f"-L{MINGW}\\lib",
    f"-L{MINGW}\\{_ARCH}\\lib",
]

# ── Result dataclasses ────────────────────────────────────────────────────────

@dataclass
class CompileResult:
    ok:           bool
    command:      List[str]
    stdout:       str
    stderr:       str
    returncode:   int
    elapsed_sec:  float          # wall-clock compile time


@dataclass
class RunResult:
    ok:           bool
    stdout:       str
    stderr:       str
    returncode:   int
    elapsed_sec:  float          # wall-clock execution time


@dataclass
class PipelineResult:
    source:       str
    ir_file:      str
    exe_file:     str
    opt_flags:    List[str]
    ir_compile:   CompileResult
    exe_compile:  CompileResult
    run:          RunResult

    @property
    def success(self) -> bool:
        return self.ir_compile.ok and self.exe_compile.ok and self.run.ok


# ── Core functions ────────────────────────────────────────────────────────────

def compile_to_ir(source: str, ir_file: str) -> CompileResult:
    """
    Compile C++ source to unoptimized LLVM IR text (.ll).
    -disable-O0-optnone ensures passes can still be applied later.
    """
    cmd = [CLANG] + MINGW_FLAGS + [
        "-S", "-emit-llvm", "-O0",
        "-Xclang", "-disable-O0-optnone",
        source, "-o", ir_file,
    ]
    log.info(f"Generating LLVM IR  {source} -> {ir_file}")
    return _run_cmd(cmd)


def compile_to_exe(source: str, exe_file: str, flags: List[str]) -> CompileResult:
    """
    Compile C++ source to executable using the given LLVM/Clang flags.
    flags example: ["-O2", "-funroll-loops"]
    """
    cmd = [CLANG] + MINGW_FLAGS + flags + [source, "-o", exe_file]
    log.info(f"Compiling {' '.join(flags)}  {source} -> {exe_file}")
    return _run_cmd(cmd)


def run_executable(exe_file: str) -> RunResult:
    """
    Execute a compiled binary via cmd /c (bypasses Windows AppLocker).
    Returns stdout, stderr, exit code, and wall-clock time.
    """
    log.info(f"Running {exe_file}")
    t0 = time.perf_counter()
    r  = subprocess.run(
        f'cmd /c "{exe_file}"',
        shell=True, capture_output=True, text=True,
    )
    elapsed = round(time.perf_counter() - t0, 4)
    return RunResult(
        ok          = r.returncode == 0,
        stdout      = r.stdout,
        stderr      = r.stderr,
        returncode  = r.returncode,
        elapsed_sec = elapsed,
    )


def full_pipeline(source: str, opt_flags: List[str] = None) -> PipelineResult:
    """
    Run the complete Phase 1 pipeline:
      source -> IR -> exe -> run
    opt_flags defaults to ["-O2"].
    """
    if opt_flags is None:
        opt_flags = ["-O2"]

    root      = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    build_dir = os.path.join(root, "build")
    os.makedirs(build_dir, exist_ok=True)

    base     = os.path.splitext(source)[0]
    ir_file  = base + ".ll"
    exe_name = os.path.basename(base) + ".exe"
    exe_file = os.path.join(build_dir, exe_name)

    ir_result  = compile_to_ir(source, ir_file)
    if not ir_result.ok:
        # Return early — no point compiling if IR failed
        dummy = CompileResult(False, [], "", "", -1, 0.0)
        dummy_run = RunResult(False, "", "", -1, 0.0)
        return PipelineResult(source, ir_file, exe_file, opt_flags,
                              ir_result, dummy, dummy_run)

    exe_result = compile_to_exe(source, exe_file, opt_flags)
    if not exe_result.ok:
        dummy_run = RunResult(False, "", "", -1, 0.0)
        return PipelineResult(source, ir_file, exe_file, opt_flags,
                              ir_result, exe_result, dummy_run)

    run_result = run_executable(exe_file)
    return PipelineResult(source, ir_file, exe_file, opt_flags,
                          ir_result, exe_result, run_result)


def print_pipeline_result(r: PipelineResult):
    """Pretty-print a PipelineResult to stdout."""
    print(f"\n{'='*55}")
    print(f"  APEX PHASE 1 — PIPELINE RESULT")
    print(f"{'='*55}")
    print(f"  Source      : {r.source}")
    print(f"  IR file     : {r.ir_file}")
    print(f"  Executable  : {r.exe_file}")
    print(f"  Opt flags   : {' '.join(r.opt_flags)}")
    print(f"  IR compile  : {'OK' if r.ir_compile.ok else 'FAILED'}  "
          f"({r.ir_compile.elapsed_sec}s)")
    print(f"  Exe compile : {'OK' if r.exe_compile.ok else 'FAILED'}  "
          f"({r.exe_compile.elapsed_sec}s)")
    if r.exe_compile.ok:
        size_kb = os.path.getsize(r.exe_file) / 1024
        print(f"  Binary size : {size_kb:.1f} KB")
    print(f"  Run         : {'OK' if r.run.ok else 'FAILED'}  "
          f"({r.run.elapsed_sec}s)  exit={r.run.returncode}")
    print(f"  Output      : {r.run.stdout.strip()}")
    if r.run.stderr.strip():
        print(f"  Stderr      : {r.run.stderr.strip()}")
    if not r.ir_compile.ok:
        print(f"\n  IR ERROR:\n{r.ir_compile.stderr}")
    if not r.exe_compile.ok:
        print(f"\n  COMPILE ERROR:\n{r.exe_compile.stderr}")
    print(f"{'='*55}\n")


# ── Internal helper ───────────────────────────────────────────────────────────

def _run_cmd(cmd: List[str]) -> CompileResult:
    t0 = time.perf_counter()
    r  = subprocess.run(cmd, capture_output=True, text=True)
    elapsed = round(time.perf_counter() - t0, 4)
    ok = r.returncode == 0
    if not ok:
        log.error(f"Command failed (exit {r.returncode}):\n{r.stderr.strip()}")
    return CompileResult(
        ok          = ok,
        command     = cmd,
        stdout      = r.stdout,
        stderr      = r.stderr,
        returncode  = r.returncode,
        elapsed_sec = elapsed,
    )


# ── CLI entry point ───────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys
    logging.basicConfig(format="[APEX] %(message)s", level=logging.INFO)

    source    = sys.argv[1] if len(sys.argv) > 1 else r"benchmark\programs\test_loop.cpp"
    opt_flags = sys.argv[2:] if len(sys.argv) > 2 else ["-O2"]

    if not os.path.exists(source):
        log.error(f"Source file not found: {source}")
        sys.exit(1)

    result = full_pipeline(source, opt_flags)
    print_pipeline_result(result)
    sys.exit(0 if result.success else 1)
