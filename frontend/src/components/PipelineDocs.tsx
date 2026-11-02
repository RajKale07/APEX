export default function PipelineDocs() {
  const steps = [
    {
      step: "01",
      title: "CLANG → LLVM IR (.ll)",
      badge: "SOURCE PARSING",
      desc: "APEX compiles the C++ source using Clang++ with -O0 -Xclang -disable-O0-optnone. This produces clean, unoptimized LLVM Intermediate Representation without optnone attributes, allowing downstream passes to be applied freely.",
      command: "clang++ -S -emit-llvm -O0 -Xclang -disable-O0-optnone input.cpp -o input.ll",
      highlights: ["Preserves exact program logic", "Removes optnone inhibitor", "Generates human-readable .ll text"]
    },
    {
      step: "02",
      title: "IR METRIC EXTRACTION",
      badge: "SYNTACTIC AUDIT",
      desc: "The analyzer reads the LLVM IR and parses 11 core characteristics across all functions and basic blocks: loop nesting depth, memory loads/stores, branch jumps, arithmetic instructions, and function call instructions.",
      command: "python analyzer/ir_analyzer.py input.ll",
      highlights: ["Loop count & loop depth", "Memory ops (load/store)", "Branch density & jumps", "Call instructions count"]
    },
    {
      step: "03",
      title: "FEATURE VECTOR ENCODING",
      badge: "NORMALIZATION",
      desc: "Raw instruction counts are normalized by total instructions and basic blocks to derive scale-invariant density ratios (loop density, memory density, arithmetic density, call density, branch density).",
      command: "python analyzer/feature_extractor.py input.ll",
      highlights: ["16-dimensional feature vector", "Scale-independent ratios", "Euclidean distance metric ready"]
    },
    {
      step: "04",
      title: "DUAL DECISION ENGINE",
      badge: "INTELLIGENT SELECTION",
      desc: "Feedback-first selection checks history.json for similar past benchmarks within Euclidean distance < 0.15. If reliable historical data exists, the proven fastest flag combination is chosen. Otherwise, heuristic expert rules fire.",
      command: "python optimizer/rule_engine/decision_engine.py",
      highlights: ["Priority 1: Feedback history search", "Priority 2: Rule-based heuristic scores", "Flags: -funroll-loops, -fvectorize, -finline-functions"]
    },
    {
      step: "05",
      title: "REAL LLVM COMPILATION",
      badge: "CODE GENERATION",
      desc: "Clang compiles the binary with the selected APEX optimization flags alongside standard levels (O0, O1, O2, O3) using MinGW standard library targeting Windows x86/x64.",
      command: "clang++ -O2 -funroll-loops input.cpp -o input.exe",
      highlights: ["Native binary generation", "Targeted LLVM transform passes", "Automated executable packaging"]
    },
    {
      step: "06",
      title: "BENCHMARK & FEEDBACK LOOP",
      badge: "ADAPTIVE EVOLUTION",
      desc: "Each binary is executed 7 times with sub-millisecond precision timing to discard outlier noise. Execution time, compile time, and binary sizes are recorded into history.json, ensuring APEX becomes progressively smarter.",
      command: "python benchmark/runner/benchmark.py input.cpp",
      highlights: ["7 runs with median filtering", "Sub-millisecond resolution", "Feedback learning loop update"]
    }
  ];

  return (
    <div className="pipeline-docs">
      {/* 2D Storyboard Header */}
      <div className="comic-panel-header">
        <div className="comic-title-badge">ARCHITECTURE // BLUEPRINT</div>
        <h2 className="comic-display-title">HOW APEX ADAPTS TO PROGRAM GEOMETRY</h2>
        <p className="comic-subtitle">
          Traditional compilers blindly apply fixed flags like <code>-O3</code>. APEX inspects the internal LLVM IR,
          calculates the program's structural density, and selects tailored optimization passes.
        </p>
      </div>

      {/* 2D Interactive Flowchart Banner */}
      <div className="comic-flow-banner">
        <div className="flow-badge">2D PIPELINE TOPOLOGY</div>
        <div className="flow-track">
          <div className="flow-node">
            <span className="node-num">01</span>
            <span className="node-title">C++ CODE</span>
          </div>
          <div className="flow-connector">──▶</div>
          <div className="flow-node">
            <span className="node-num">02</span>
            <span className="node-title">LLVM IR</span>
          </div>
          <div className="flow-connector">──▶</div>
          <div className="flow-node">
            <span className="node-num">03</span>
            <span className="node-title">IR ANALYZER</span>
          </div>
          <div className="flow-connector">──▶</div>
          <div className="flow-node">
            <span className="node-num">04</span>
            <span className="node-title">DECISION ENGINE</span>
          </div>
          <div className="flow-connector">──▶</div>
          <div className="flow-node highlight">
            <span className="node-num">05</span>
            <span className="node-title">APEX PASSES</span>
          </div>
          <div className="flow-connector">──▶</div>
          <div className="flow-node">
            <span className="node-num">06</span>
            <span className="node-title">FEEDBACK</span>
          </div>
        </div>
      </div>

      {/* 2D Comic Storyboard Grid */}
      <div className="storyboard-grid">
        {steps.map(s => (
          <div className="storyboard-card" key={s.step}>
            <div className="card-top-row">
              <span className="card-step-tag">STAGE {s.step}</span>
              <span className="card-badge">{s.badge}</span>
            </div>
            <h3 className="card-title">{s.title}</h3>
            <p className="card-desc">{s.desc}</p>
            <div className="card-command-box">
              <span className="cli-prefix">&gt;</span>
              <code>{s.command}</code>
            </div>
            <div className="card-highlights">
              {s.highlights.map((h, i) => (
                <div className="highlight-item" key={i}>
                  <span className="highlight-bullet">■</span>
                  <span>{h}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Strategy Catalogue Section */}
      <div className="catalogue-section">
        <div className="comic-title-badge">PASS CATALOGUE // STRATEGIES</div>
        <h3 className="catalogue-title">PRE-CONFIGURED OPTIMIZATION PASSES</h3>
        <div className="catalogue-grid">
          <div className="catalogue-card">
            <div className="cat-header">
              <span className="cat-name">LOOP OPTIMIZATION</span>
              <code className="cat-flags">-O2 -funroll-loops</code>
            </div>
            <p className="cat-desc">
              Triggered when loop density &ge; 0.20. Unrolls inner loop bodies to minimize branch instruction overhead and expose instruction-level parallelism to CPU pipelines.
            </p>
          </div>
          <div className="catalogue-card">
            <div className="cat-header">
              <span className="cat-name">VECTORIZATION (SIMD)</span>
              <code className="cat-flags">-O3 -fvectorize -fslp-vectorize</code>
            </div>
            <p className="cat-desc">
              Triggered when arithmetic density &ge; 0.15 or arithmetic &gt; 50 ops. Emits AVX/SSE vector instructions that compute 4 to 8 float/int operations simultaneously per CPU cycle.
            </p>
          </div>
          <div className="catalogue-card">
            <div className="cat-header">
              <span className="cat-name">AGGRESSIVE INLINING</span>
              <code className="cat-flags">-O3 -finline-functions</code>
            </div>
            <p className="cat-desc">
              Triggered when call density &ge; 0.15 or call count &gt; 20. Completely removes call stack frame overhead by expanding function bodies inline at call sites.
            </p>
          </div>
          <div className="catalogue-card">
            <div className="cat-header">
              <span className="cat-name">MEMORY OPTIMIZATION</span>
              <code className="cat-flags">-O2 -fstrict-aliasing</code>
            </div>
            <p className="cat-desc">
              Triggered when memory density (loads + stores) &ge; 0.35. Assumes pointers of differing types do not overlap in cache, allowing aggressive register caching and store reordering.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
