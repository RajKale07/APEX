import { useState, useRef } from "react";
import axios from "axios";
import type { ApexResult } from "../types";

const API = "http://localhost:8000";

const EXAMPLES: Record<string, string> = {
  "Loop Heavy": `#include <iostream>
#include <vector>

int main() {
    const int N = 50000;
    std::vector<long long> a(N), b(N), c(N);
    for (int i = 0; i < N; i++) { a[i] = i; b[i] = N - i; }

    long long sum = 0;
    for (int iter = 0; iter < 1000; iter++) {
        for (int i = 0; i < N; i++) {
            c[i] = a[i] * b[i] + iter;
        }
        for (int i = 0; i < N; i++) {
            sum += c[i];
        }
    }
    std::cout << sum << std::endl;
    return 0;
}`,

  "Call Heavy": `#include <iostream>
int add(int a, int b) { return a + b; }
int mul(int a, int b) { return a * b; }
int chain(int n) { return add(mul(n, 3), n % 7); }
int main() {
    long long sum = 0;
    for (int i = 0; i < 2000000; i++) sum += chain(i);
    std::cout << sum << std::endl;
    return 0;
}`,

  "Branch Heavy": `#include <iostream>
int classify(int n) {
    if (n % 15 == 0) return 4;
    else if (n % 3 == 0) return 3;
    else if (n % 5 == 0) return 2;
    else if (n % 2 == 0) return 1;
    else return 0;
}
int main() {
    long long sum = 0;
    for (int i = 0; i < 2000000; i++) sum += classify(i);
    std::cout << sum << std::endl;
    return 0;
}`,

  "Matrix Mult": `#include <iostream>
#include <vector>

int main() {
    const int N = 180;
    std::vector<std::vector<double>> A(N, std::vector<double>(N, 1.5));
    std::vector<std::vector<double>> B(N, std::vector<double>(N, 2.5));
    std::vector<std::vector<double>> C(N, std::vector<double>(N, 0.0));

    for (int i = 0; i < N; i++) {
        for (int j = 0; j < N; j++) {
            for (int k = 0; k < N; k++) {
                C[i][j] += A[i][k] * B[k][j];
            }
        }
    }
    std::cout << "C[0][0]=" << C[0][0] << std::endl;
    return 0;
}`,

  "Fibonacci": `#include <iostream>

long long fib(int n) {
    if (n <= 1) return n;
    return fib(n - 1) + fib(n - 2);
}

int main() {
    long long res = fib(38);
    std::cout << "fib(38)=" << res << std::endl;
    return 0;
}`,
};

interface Props {
  onResult:  (r: ApexResult) => void;
  onError:   (msg: string) => void;
  onLoading: (v: boolean) => void;
  loading:   boolean;
}

export default function CodeInput({ onResult, onError, onLoading, loading }: Props) {
  const [code, setCode]         = useState(EXAMPLES["Loop Heavy"]);
  const [filename, setFilename] = useState("test_loop.cpp");
  const [tab, setTab]           = useState<"paste" | "upload">("paste");
  const [active, setActive]     = useState("Loop Heavy");
  const [dragOver, setDragOver] = useState(false);
  const fileRef                 = useRef<HTMLInputElement>(null);

  const lines = code.split("\n");
  const lineCount = lines.length;

  const handleFile = (f: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        setCode(content);
        setFilename(f.name);
        setTab("paste");
        setActive("");
      }
    };
    reader.readAsText(f);
  };

  const submit = async () => {
    onLoading(true);
    try {
      const form = new FormData();
      if (tab === "paste") {
        form.append("code", code);
        form.append("filename", filename);
      } else {
        const f = fileRef.current?.files?.[0];
        if (!f) { onError("No C++ file selected"); onLoading(false); return; }
        form.append("file", f);
      }

      let res;
      try {
        res = await axios.post("/api/analyze", form);
      } catch {
        res = await axios.post(`${API}/api/analyze`, form);
      }

      if (res.data.error) {
        onError(res.data.error);
      } else {
        onResult(res.data);
      }
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || "Execution failed. Check backend connection.";
      onError(msg);
    } finally {
      onLoading(false);
    }
  };

  return (
    <div className="card code-panel">
      <div className="panel-header">
        <h2 className="panel-title">C++ Source Code</h2>
        <p className="panel-desc">Paste code or upload a file. APEX compiles to LLVM IR and recommends optimization flags.</p>
      </div>

      <div className="tab-buttons">
        <button
          className={`tab-btn ${tab === "paste" ? "active" : ""}`}
          onClick={() => setTab("paste")}
        >
          Paste Code
        </button>
        <button
          className={`tab-btn ${tab === "upload" ? "active" : ""}`}
          onClick={() => setTab("upload")}
        >
          Upload File
        </button>
      </div>

      {tab === "paste" && (
        <div className="presets-container">
          <span className="presets-label">Examples:</span>
          <div className="presets-list">
            {Object.keys(EXAMPLES).map(k => (
              <button
                key={k}
                className={`preset-btn ${active === k ? "active" : ""}`}
                onClick={() => {
                  setCode(EXAMPLES[k]);
                  setFilename(k.toLowerCase().replace(" ", "_") + ".cpp");
                  setActive(k);
                }}
              >
                {k}
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === "paste" ? (
        <div className="editor-box">
          <div className="editor-header">
            <span className="editor-lang">C++ · LLVM Clang Target</span>
            <span className="editor-lines">{lineCount} lines</span>
          </div>

          <div className="editor-main">
            <div className="editor-gutter">
              {lines.map((_, i) => (
                <div key={i} className="gutter-num">{i + 1}</div>
              ))}
            </div>
            <textarea
              className="code-textarea"
              value={code}
              onChange={e => setCode(e.target.value)}
              spellCheck={false}
              wrap="off"
            />
          </div>

          <div className="editor-footer">
            <div className="file-field">
              <span className="file-label">Target:</span>
              <input
                className="file-input"
                value={filename}
                onChange={e => setFilename(e.target.value)}
                placeholder="program.cpp"
              />
            </div>
            <span className="byte-count">{new Blob([code]).size} B</span>
          </div>
        </div>
      ) : (
        <div
          className={`upload-box ${dragOver ? "drag-over" : ""}`}
          onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) handleFile(file);
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".cpp,.cc,.c,.cxx"
            style={{ display: "none" }}
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          <div className="upload-icon">📂</div>
          <div className="upload-title">Drop C++ file here</div>
          <div className="upload-desc">Supports .cpp, .cc, or .c files</div>
        </div>
      )}

      <button
        className="run-btn"
        onClick={submit}
        disabled={loading}
      >
        {loading ? (
          <div className="run-loading">
            <div className="spinner-sm" />
            <span>Running APEX pipeline…</span>
          </div>
        ) : (
          <span>⚡ Run APEX</span>
        )}
      </button>
    </div>
  );
}
