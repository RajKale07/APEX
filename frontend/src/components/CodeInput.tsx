import { useState, useRef } from "react";
import axios from "axios";
import type { ApexResult } from "../types";

const API = "http://localhost:8000";

const EXAMPLES: Record<string, string> = {
  "Loop": `#include <iostream>
int main() {
    long long sum = 0;
    for (int i = 0; i < 1000000; i++) sum += i;
    std::cout << sum << std::endl;
    return 0;
}`,
  "Calls": `#include <iostream>
int add(int a, int b) { return a + b; }
int mul(int a, int b) { return a * b; }
int chain(int n) { return add(mul(n, 3), n % 7); }
int main() {
    long long sum = 0;
    for (int i = 0; i < 2000000; i++) sum += chain(i);
    std::cout << sum << std::endl;
    return 0;
}`,
  "Branch": `#include <iostream>
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
};

interface Props {
  onResult:  (r: ApexResult) => void;
  onError:   (msg: string) => void;
  onLoading: (v: boolean) => void;
  loading:   boolean;
}

export default function CodeInput({ onResult, onError, onLoading, loading }: Props) {
  const [code, setCode]         = useState(EXAMPLES["Loop"]);
  const [filename, setFilename] = useState("input.cpp");
  const [tab, setTab]           = useState<"paste" | "upload">("paste");
  const [active, setActive]     = useState("Loop");
  const fileRef                 = useRef<HTMLInputElement>(null);

  const lineCount = code.split("\n").length;

  const submit = async () => {
    onLoading(true);
    try {
      const form = new FormData();
      if (tab === "paste") {
        form.append("code", code);
        form.append("filename", filename);
      } else {
        const f = fileRef.current?.files?.[0];
        if (!f) { onError("No file selected"); onLoading(false); return; }
        form.append("file", f);
      }
      const res = await axios.post(`${API}/api/analyze`, form);
      if (res.data.error) onError(res.data.error);
      else onResult(res.data);
    } catch (e: any) {
      onError(e?.message ?? "Request failed");
    } finally {
      onLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Section header */}
      <div className="pane-section">
        <span className="pane-section-title">Source Code</span>
      </div>

      {/* Tabs */}
      <div className="tab-row">
        <button className={tab === "paste"  ? "tab-btn active" : "tab-btn"} onClick={() => setTab("paste")}>Paste</button>
        <button className={tab === "upload" ? "tab-btn active" : "tab-btn"} onClick={() => setTab("upload")}>Upload</button>
      </div>

      <div className="editor-wrap">
        {tab === "paste" && (
          <>
            {/* Example chips */}
            <div className="example-chips">
              {Object.keys(EXAMPLES).map(k => (
                <button
                  key={k}
                  className={`chip ${active === k ? "active" : ""}`}
                  onClick={() => {
                    setCode(EXAMPLES[k]);
                    setFilename(k.toLowerCase() + ".cpp");
                    setActive(k);
                  }}
                >
                  {k}
                </button>
              ))}
            </div>

            {/* Editor */}
            <div className="editor-container">
              <div className="editor-topbar">
                <div className="editor-dots">
                  <div className="editor-dot" style={{ background: "#ff5f57" }} />
                  <div className="editor-dot" style={{ background: "#febc2e" }} />
                  <div className="editor-dot" style={{ background: "#28c840" }} />
                </div>
                <span className="editor-lang">C++</span>
              </div>
              <textarea
                className="code-textarea"
                value={code}
                onChange={e => setCode(e.target.value)}
                spellCheck={false}
                rows={16}
              />
              <div className="editor-footer">
                <span className="editor-meta">{lineCount} lines · UTF-8</span>
                <input
                  className="filename-field"
                  value={filename}
                  onChange={e => setFilename(e.target.value)}
                  placeholder="filename.cpp"
                />
              </div>
            </div>
          </>
        )}

        {tab === "upload" && (
          <div className="upload-zone" onClick={() => fileRef.current?.click()}>
            <input ref={fileRef} type="file" accept=".cpp,.cc,.c" style={{ display: "none" }} />
            <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>📂</div>
            <div style={{ fontWeight: 600, color: "var(--text-2)", marginBottom: "0.25rem" }}>Click to select file</div>
            <div style={{ fontSize: "0.72rem" }}>.cpp · .cc · .c</div>
          </div>
        )}

        <button className="run-btn" onClick={submit} disabled={loading}>
          {loading ? (
            <>
              <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
              Running…
            </>
          ) : (
            <>⚡ Run APEX</>
          )}
        </button>
      </div>
    </div>
  );
}
