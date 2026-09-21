import { useState } from "react";

interface Props { ir: string }

export default function IRViewer({ ir }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="card ir-card">
      <div className="ir-header" onClick={() => setOpen(o => !o)}>
        <h2>🔬 Generated LLVM IR</h2>
        <span className="toggle">{open ? "▲ Hide IR" : "▼ Show IR"}</span>
      </div>
      {!open && (
        <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
          The raw LLVM Intermediate Representation that APEX analyzed — click to expand.
        </p>
      )}
      {open && <pre className="ir-content">{ir}</pre>}
    </div>
  );
}
