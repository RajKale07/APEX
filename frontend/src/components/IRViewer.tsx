import { useState } from "react";

interface Props { ir: string }

export default function IRViewer({ ir }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="card ir-card">
      <div className="ir-header" onClick={() => setOpen(o => !o)}>
        <h2>🔬 Generated LLVM IR</h2>
        <span className="toggle">{open ? "▲ hide" : "▼ show"}</span>
      </div>
      {open && <pre className="ir-content">{ir}</pre>}
    </div>
  );
}
