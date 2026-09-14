"""
APEX Phase 1 — Compiler Pipeline
C++ source -> Clang -> LLVM IR -> LLVM optimization -> Executable
"""

import subprocess
import sys
import os
import logging

logging.basicConfig(format="[APEX] %(message)s", level=logging.INFO)
log = logging.getLogger("apex")

CLANG    = r"C:\Program Files\LLVM\bin\clang++.exe"
MINGW    = r"C:\MinGW"
GCC_VER  = "6.3.0"
ARCH     = "mingw32"

# Flags that point clang at MinGW's C++ standard library
MINGW_FLAGS = [
    f"--target=i686-w64-mingw32",
    f"-isystem{MINGW}\\lib\\gcc\\{ARCH}\\{GCC_VER}\\include\\c++",
    f"-isystem{MINGW}\\lib\\gcc\\{ARCH}\\{GCC_VER}\\include\\c++\\{ARCH}",
    f"-isystem{MINGW}\\lib\\gcc\\{ARCH}\\{GCC_VER}\\include\\c++\\backward",
    f"-isystem{MINGW}\\lib\\gcc\\{ARCH}\\{GCC_VER}\\include",
    f"-isystem{MINGW}\\include",
    f"-L{MINGW}\\lib\\gcc\\{ARCH}\\{GCC_VER}",
    f"-L{MINGW}\\lib",
    f"-L{MINGW}\\{ARCH}\\lib",
]


def run(cmd, desc):
    log.info(desc)
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        log.error(f"FAILED: {desc}")
        log.error(result.stderr)
        sys.exit(1)
    return result


def compile_to_ir(source: str, ir_file: str):
    """Compile source to unoptimized LLVM IR (.ll text format)."""
    run(
        [CLANG] + MINGW_FLAGS + [
            "-S", "-emit-llvm", "-O0",
            "-Xclang", "-disable-O0-optnone",
            source, "-o", ir_file
        ],
        f"Generating LLVM IR -> {ir_file}"
    )


def compile_to_exe(source: str, exe_file: str, opt_level: str):
    """Compile source directly to executable with chosen opt level."""
    run(
        [CLANG] + MINGW_FLAGS + [
            f"-{opt_level}", source, "-o", exe_file
        ],
        f"Compiling -{opt_level} -> {exe_file}"
    )


def compile_pipeline(source: str, opt_level: str = "O2"):
    base     = os.path.splitext(source)[0]
    ir_file  = base + ".ll"
    # Place exe in project build dir to avoid AppLocker restrictions
    build_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "build")
    os.makedirs(build_dir, exist_ok=True)
    exe_name  = os.path.basename(base) + ".exe"
    exe_file  = os.path.join(build_dir, exe_name)

    compile_to_ir(source, ir_file)
    compile_to_exe(source, exe_file, opt_level)

    log.info(f"IR saved:   {ir_file}")
    log.info(f"Executable: {exe_file}")
    return ir_file, exe_file


def run_executable(exe_file: str):
    log.info(f"Running {exe_file}")
    result = subprocess.run([exe_file], capture_output=True, text=True)
    print(f"\n--- Program Output ---\n{result.stdout.strip()}\n----------------------\n")
    return result


if __name__ == "__main__":
    source    = sys.argv[1] if len(sys.argv) > 1 else r"benchmark\programs\test_loop.cpp"
    opt_level = sys.argv[2] if len(sys.argv) > 2 else "O2"

    if not os.path.exists(source):
        log.error(f"Source file not found: {source}")
        sys.exit(1)

    ir_file, exe_file = compile_pipeline(source, opt_level)
    run_executable(exe_file)
