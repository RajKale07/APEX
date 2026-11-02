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

---

## Empirical Evaluation & Optimization Outcomes

The following tables document the performance, executable size, and compilation efficiency of **APEX v2** across the benchmark suite compared against standard Clang/LLVM optimization levels (`-O1`, `-O2`, `-O3`, and `-Os`).

### Benchmark Mapping:
- **Benchmark 1**: `benchmark/programs/test_loop.cpp` (Dense vector loops, memory access & data parallelism)
- **Benchmark 2**: `benchmark/programs/test_arith.cpp` (Intensive floating-point arithmetic & trigonometry)
- **Benchmark 3**: `benchmark/programs/test_branch.cpp` (Multi-way conditional classification & branch prediction stress)
- **Benchmark 4**: `benchmark/programs/test_calls.cpp` (Deeply chained arithmetic function call dispatch & inlining candidate)

---

### Table II. Execution-Time Comparison Across Optimization Configurations

| Benchmark | -O1 (s) | -O2 (s) | -O3 (s) | -Os (s) | APEX v2 (s) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Benchmark 1 | 0.1769 | 0.1008 | 0.1442 | 0.1625 | **0.0877** |
| Benchmark 2 | 1.1440 | 1.2075 | 1.2052 | 1.2420 | **1.1306** |
| Benchmark 3 | 0.0434 | 0.0485 | 0.0501 | 0.0462 | **0.0430** |
| Benchmark 4 | 0.0381 | 0.0373 | 0.0357 | 0.0395 | **0.0336** |
| **Average / Median** | **0.3506 / 0.1101** | **0.3485 / 0.0746** | **0.3588 / 0.0972** | **0.3725 / 0.1043** | **0.3237 / 0.0653** |

*Breakdown:*
- *Average: -O1: 0.3506s | -O2: 0.3485s | -O3: 0.3588s | -Os: 0.3725s | APEX v2: **0.3237s***
- *Median: -O1: 0.1101s | -O2: 0.0746s | -O3: 0.0972s | -Os: 0.1043s | APEX v2: **0.0653s***

---

### Table III. Executable-Size Comparison

| Benchmark | -O2 (bytes) | -O3 (bytes) | -Os (bytes) | APEX v2 (bytes) |
| :--- | :---: | :---: | :---: | :---: |
| Benchmark 1 | 41,984 | 41,984 | 40,960 | 41,984 |
| Benchmark 2 | 39,936 | 39,936 | 38,912 | 39,936 |
| Benchmark 3 | 39,424 | 39,424 | 38,912 | 38,912 |
| Benchmark 4 | 40,448 | 40,448 | 38,912 | 40,448 |
| **Average / Median** | **40,448 / 40,192** | **40,448 / 40,192** | **39,424 / 38,912** | **40,320 / 40,192** |

*Breakdown:*
- *Average: -O2: 40,448 B | -O3: 40,448 B | -Os: 39,424 B | APEX v2: 40,320 B*
- *Median: -O2: 40,192 B | -O3: 40,192 B | -Os: 38,912 B | APEX v2: 40,192 B*

---

### Table IV. Compilation Time and Adaptive Decision Overhead

| Benchmark | -O2 Compile Time (s) | APEX v2 Compile Time (s) | Decision Overhead (s) |
| :--- | :---: | :---: | :---: |
| Benchmark 1 | 0.6604 | 0.7182 | 0.0578 |
| Benchmark 2 | 0.6154 | 0.6582 | 0.0428 |
| Benchmark 3 | 0.5572 | 0.6056 | 0.0484 |
| Benchmark 4 | 0.5011 | 0.5486 | 0.0475 |
| **Average / Median** | **0.5835 / 0.5863** | **0.6326 / 0.6319** | **0.0491 / 0.0479** |

*Note: Decision overhead includes LLVM IR inspection, feature extraction (`feature_extractor.py`), and adaptive rule/feedback evaluation (`decision_engine.py`). Mean decision overhead is ~49.1 ms.*

---

### Table V. Relative Runtime Change Compared with -O2

| Benchmark | -O2 Runtime (s) | APEX v2 Runtime (s) | Runtime Change (%) |
| :--- | :---: | :---: | :---: |
| Benchmark 1 | 0.1008 | 0.0877 | -13.00% |
| Benchmark 2 | 1.2075 | 1.1306 | -6.37% |
| Benchmark 3 | 0.0485 | 0.0430 | -11.34% |
| Benchmark 4 | 0.0373 | 0.0336 | -9.92% |
| **Average / Median** | **0.3485 / 0.0746** | **0.3237 / 0.0653** | **-10.16% / -10.63%** |

*Note: Negative values represent runtime reductions (speedups). APEX v2 delivers an average execution time improvement of 10.16% (median 10.63%) compared to baseline -O2.*

---

## How to Run the Project

### 1. Prerequisites
- **Python 3.11+** installed and available on PATH
- **Node.js (v18+) & npm** installed
- **LLVM / Clang 23+** (`C:\Program Files\LLVM\bin\clang++.exe`)
- **MinGW GCC 6.3+** (`C:\MinGW`) — provides standard C++ runtime & headers

---

### 2. Environment Setup

#### Python Virtual Environment & Backend Dependencies:
```bash
# From the project root (APEX/)
python -m venv .venv
.venv\Scripts\activate

# Install required dependencies
pip install fastapi uvicorn pydantic
```

#### Frontend Dependencies:
```bash
cd frontend
npm install
cd ..
```

---

### 3. Running via Command-Line Interface (CLI)

The APEX CLI provides direct terminal access to the analysis, optimization, and compilation pipeline:

```bash
# 1. Full APEX optimization pipeline (Analyze IR → Decide Strategy → Compile → Execute)
python apex.py optimize benchmark/programs/test_loop.cpp

# 2. Analyze LLVM IR and display strategy recommendation & metrics only
python apex.py analyze benchmark/programs/test_loop.cpp

# 3. Compile source with custom optimization flags and execute
python apex.py compile benchmark/programs/test_loop.cpp -O3 -funroll-loops

# 4. Run multi-strategy benchmark (-O0, -O1, -O2, -O3, APEX) and report comparison
python benchmark/runner/benchmark.py benchmark/programs/test_loop.cpp
```

---

### 4. Running the Interactive Web Dashboard & API

To run the full stack web application with real-time IR inspection, feature charts, and benchmark visualization:

#### Step 1: Start the FastAPI Backend
Open a terminal in the project root:
```bash
.venv\Scripts\activate
python backend/main.py
```
> The backend server starts at **`http://127.0.0.1:8000`**  
> Interactive OpenAPI documentation is available at **`http://127.0.0.1:8000/docs`**

#### Step 2: Start the React + Vite Frontend
Open a second terminal in the `frontend/` directory:
```bash
cd frontend
npm run dev
```
> The web dashboard will be available at **`http://localhost:5173`**  
> Paste C++ code or choose preloaded benchmarks to see real-time IR generation, adaptive strategy selection, and runtime comparisons.

---

### 5. Running the Test Suite

Run automated unit and pipeline tests to verify LLVM IR emission, binary generation, and execution correctness:

```bash
python tests/test_phase1_pipeline.py
```
Or with pytest:
```bash
python -m pytest tests/test_phase1_pipeline.py -v
```

