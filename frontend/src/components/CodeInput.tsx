import { useState, useRef } from "react";
import axios from "axios";
import type { ApexResult } from "../types";

const API = "http://localhost:8000";

const EXAMPLES: Record<string, string> = {
  "Loop Heavy": `#include <iostream>
int main() {
    long long sum = 0;
    for (int i = 0; i < 1000000; i++) sum += i;
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
};

interface Props {
  onResult:  (r: ApexResult) => void;
  onError:   (msg: string) => void;
  onLoading: (v: boolean) => void;
}

export default function CodeInput({ onResult, onError, onLoading }: Props) {
  const [code, setCode]       = useState(EXAMPLES["Loop Heavy"]);
  const [filename, setFilename] = useState("input.cpp");
  const [tab, setTab]         = useState<"paste" | "upload">("paste");
  const fileRef               = useRef<HTMLInputElement>(null);

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
    <div className="card code-input">
      <div className="card-header">
        <h2>Submit C++ Code</h2>
        <div className="tabs">
          <button className={tab === "paste"  ? "tab active" : "tab"} onClick={() => setTab("paste")}>Paste Code</button>
          <button className={tab === "upload" ? "tab active" : "tab"} onClick={() => setTab("upload")}>Upload File</button>
        </div>
      </div>

      {tab === "paste" && (
        <>
          <div className="examples">
            {Object.keys(EXAMPLES).map(k => (
              <button key={k} className="example-btn" onClick={() => { setCode(EXAMPLES[k]); setFilename(k.toLowerCase().replace(" ", "_") + ".cpp"); }}>
                {k}
              </button>
            ))}
          </div>
          <textarea
            className="code-editor"
            value={code}
            onChange={e => setCode(e.target.value)}
            spellCheck={false}
            rows={14}
          />
          <input
            className="filename-input"
            value={filename}
            onChange={e => setFilename(e.target.value)}
            placeholder="filename.cpp"
          />
        </>
      )}

      {tab === "upload" && (
        <div className="upload-area" onClick={() => fileRef.current?.click()}>
          <input ref={fileRef} type="file" accept=".cpp,.cc,.c" style={{ display: "none" }} />
          <p>Click to select a .cpp file</p>
        </div>
      )}

      <button className="run-btn" onClick={submit}>
        ⚡ Run APEX
      </button>
    </div>
  );
}
