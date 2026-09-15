# APEX Phase 1 — LLVM Foundation

## What Phase 1 builds

The first real APEX compiler prototype:

```
C++ source
    ↓  clang++ (emit-llvm)
LLVM IR (.ll)
    ↓  clang++ (-O2 / -O3 / APEX flags)
Executable (.exe)
    ↓  cmd /c
stdout + stderr + exit code + timing
```

All steps use real LLVM/Clang 23. Nothing is simulated.

## Requirements

| Tool | Version | Location |
|------|---------|----------|
| Clang/LLVM | 23.1.1 | `C:\Program Files\LLVM\bin\clang++.exe` |
| MinGW GCC | 6.3.0 | `C:\MinGW` — provides C++ stdlib headers |
| Python | 3.11+ | — |

## Running the pipeline

From the project root `d:\college\Projects\Apex`:

```
# Full APEX pipeline (analyze → decide → compile → run)
python apex.py optimize benchmark\programs\test_loop.cpp

# Compile with explicit flags and run
python apex.py compile benchmark\programs\test_loop.cpp -O2
python apex.py compile benchmark\programs\test_loop.cpp -O3 -funroll-loops

# Analyze IR only (no execution)
python apex.py analyze benchmark\programs\test_loop.cpp

# Run pipeline module directly
python compiler\pipeline.py benchmark\programs\test_loop.cpp -O2
```

## Running the tests

```
python tests\test_phase1_pipeline.py
```

Or with pytest if installed:

```
python -m pytest tests\test_phase1_pipeline.py -v
```

## Module structure

```
compiler/
└── pipeline.py          Core pipeline module

    CompileResult        dataclass — result of a clang invocation
      .ok                bool
      .command           list[str]  — exact command run
      .stdout / .stderr  str
      .returncode        int
      .elapsed_sec       float

    RunResult            dataclass — result of running the executable
      .ok                bool
      .stdout / .stderr  str
      .returncode        int
      .elapsed_sec       float

    PipelineResult       dataclass — full pipeline result
      .ir_compile        CompileResult
      .exe_compile       CompileResult
      .run               RunResult
      .success           bool (property)

    compile_to_ir(source, ir_file)          -> CompileResult
    compile_to_exe(source, exe_file, flags) -> CompileResult
    run_executable(exe_file)                -> RunResult
    full_pipeline(source, opt_flags)        -> PipelineResult
    print_pipeline_result(result)           pretty-print to stdout
```

## Known limitations

- Target is 32-bit (`i686-w64-mingw32`) because MinGW 6.3.0 is 32-bit.
  Binary sizes are therefore larger than a native 64-bit build.
- `opt` and `llc` are not available in the LLVM 23 Windows installer.
  All optimization is done via `clang++` flags directly.
- Execution is wrapped in `cmd /c` to bypass Windows AppLocker policy.
- IR is generated at `-O0` with `-disable-O0-optnone` so that the IR
  remains analyzable without being fully optimized away.
