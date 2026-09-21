import { useState } from "react";

interface Props { ir: string }

export default function IRViewer({ ir }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">
          <span className="panel-title-icon">⌥</span>
          LLVM IR
        </span>
        <button className="ir-toggle-btn" onClick={() => setOpen(o => !o)}>
          {open ? "▲ collapse" : "▼ expand"}
        </button>
      </div>
      {!open && (
        <div className="ir-hint">Raw LLVM Intermediate Representation analyzed by APEX — click expand to view.</div>
      )}
      {open && <pre className="ir-pre">{ir}</pre>}
    </div>
  );
}
