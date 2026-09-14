# APEX — Adaptive Compiler Architecture

> "Don't make every program fit the compiler. Make the compiler adapt to the program."

## What is APEX

APEX is a real adaptive compiler optimization framework built on LLVM/Clang.

Instead of applying a fixed optimization level to every program, APEX:

1. Compiles the source to LLVM IR
2. Analyzes the IR to extract program characteristics
3. Selects an optimization strategy based on those characteristics
4. Compiles with the chosen strategy
5. Benchmarks the result
6. Records feedback for future adaptation

## Pipeline

```
C++ Source
    ↓
  Clang  →  LLVM IR (.ll)
    ↓
IR Analyzer  →  Feature Vector
    ↓
Decision Engine  →  Optimization Strategy
    ↓
Clang + LLVM Optimization
    ↓
Executable
    ↓
Benchmark (O0/O1/O2/O3/APEX)
    ↓
Feedback Engine  →  history.json
```

## Requirements

- LLVM/Clang 23+ (`C:\Program Files\LLVM\bin`)
- MinGW GCC 6.3+ (`C:\MinGW`) — provides C++ standard library headers
- Python 3.11+
- CMake 4+ (for future C++ pass development)

## Usage

```
# Full APEX pipeline: analyze → decide → compile → run
python apex.py optimize benchmark/programs/test_loop.cpp

# Analyze IR and show recommendation only
python apex.py analyze benchmark/programs/test_loop.cpp

# Compile with a specific opt level
python apex.py compile benchmark/programs/test_loop.cpp O3

# Benchmark all strategies (O0/O1/O2/O3/APEX)
python benchmark/runner/benchmark.py benchmark/programs/test_loop.cpp
```

## Project Structure

```
APEX/
├── apex.py                          # CLI entry point
├── compiler/
│   └── pipeline.py                  # Clang compilation pipeline
├── analyzer/
│   ├── ir_analyzer.py               # LLVM IR parser and metrics extractor
│   └── feature_extractor.py         # Feature vector builder
├── optimizer/
│   └── rule_engine/
│       └── decision_engine.py       # Rule-based strategy selector
├── benchmark/
│   ├── programs/                    # Test programs (loop/arith/branch/memory/calls)
│   └── runner/
│       └── benchmark.py             # Multi-strategy benchmark runner
├── feedback/
│   ├── feedback_engine.py           # Result recorder and strategy evaluator
│   └── history.json                 # Accumulated benchmark history
└── build/                           # Compiled executables (git-ignored)
```

## Phases Completed

| Phase | Description | Status |
|-------|-------------|--------|
| 0 | Environment inspection | ✅ |
| 1 | Clang → LLVM IR → Executable | ✅ |
| 2 | LLVM IR Analyzer | ✅ |
| 3 | Feature Vector Extraction | ✅ |
| 4 | Rule-Based Decision Engine | ✅ |
| 5 | Real LLVM Optimization Integration | ✅ |
| 6 | Benchmark Engine | ✅ |
| 7 | Feedback Engine | ✅ |
| 8 | ML-Based Prediction | 🔜 |
| 9 | FastAPI Backend | 🔜 |
| 10 | React Dashboard | 🔜 |

## Benchmark Results (sample)

`test_calls.cpp` — function-call-heavy:
```
Strategy   Exec(s)
O0         0.0495
O1         0.0381
O2         0.0373
O3         0.0357
APEX       0.0336  ← best
```

`test_branch.cpp` — branch-heavy:
```
Strategy   Exec(s)
O0         0.0507
O1         0.0434
O2         0.0485
O3         0.0501
APEX       0.0430  ← best
```
