import { useEffect, useMemo, useState } from "react";
import { CATALOG, PALETTE_KINDS } from "../graph/catalog.js";

export function CommandPalette({ open, onClose, onAdd }) {
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const items = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return PALETTE_KINDS.filter((kind) => {
      const def = CATALOG[kind];
      return `${def.label} ${def.blurb} ${def.category} ${kind}`.toLowerCase().includes(needle);
    });
  }, [query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setCursor(0);
  }, [open]);

  useEffect(() => {
    setCursor(0);
  }, [query]);

  if (!open) return null;
  const active = Math.min(cursor, Math.max(0, items.length - 1));

  return (
    <div className="modal command-modal" data-testid="command-palette" onMouseDown={onClose}>
      <div
        className="command"
        role="dialog"
        aria-label="Add node"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <input
          data-testid="command-input"
          autoFocus
          value={query}
          placeholder="Add a node"
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") onClose();
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setCursor((current) => Math.min(items.length - 1, current + 1));
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setCursor((current) => Math.max(0, current - 1));
            }
            if (event.key === "Enter" && items[active]) {
              event.preventDefault();
              onAdd(items[active]);
              onClose();
            }
          }}
        />
        <ul>
          {items.map((kind, index) => {
            const def = CATALOG[kind];
            return (
              <li key={kind}>
                <button
                  type="button"
                  className={index === active ? "active" : ""}
                  data-testid={`command-${kind}`}
                  onMouseEnter={() => setCursor(index)}
                  onClick={() => {
                    onAdd(kind);
                    onClose();
                  }}
                >
                  <strong>{def.label}</strong>
                  <small>
                    {def.category}
                    {def.blurb ? ` · ${def.blurb}` : ""}
                  </small>
                </button>
              </li>
            );
          })}
          {items.length === 0 && <li className="empty">No matching nodes.</li>}
        </ul>
      </div>
    </div>
  );
}
