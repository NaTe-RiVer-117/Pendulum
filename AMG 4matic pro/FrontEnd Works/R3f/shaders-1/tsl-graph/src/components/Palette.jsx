import { useMemo, useState } from "react";
import { CATALOG, PALETTE_KINDS } from "../graph/catalog.js";
import { TYPE_COLOR, VALUE_TYPES } from "../graph/types.js";

export function Palette({ onAdd }) {
  const [query, setQuery] = useState("");
  const items = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return PALETTE_KINDS.filter((kind) => {
      const def = CATALOG[kind];
      const haystack = `${def.label} ${def.blurb} ${def.category} ${kind}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [query]);

  return (
    <aside className="palette">
      <label className="search">
        <span>Add node</span>
        <input
          data-testid="palette-search"
          value={query}
          placeholder="Search nodes"
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <div className="palette-list">
        {items.map((kind) => {
          const def = CATALOG[kind];
          return (
            <button key={kind} type="button" data-testid={`add-${kind}`} onClick={() => onAdd(kind)}>
              <strong>{def.label}</strong>
              <small>
                {def.category}
                {def.blurb ? ` · ${def.blurb}` : ""}
              </small>
            </button>
          );
        })}
        {items.length === 0 && <p className="empty">No matching nodes.</p>}
      </div>
      <div className="legend">
        {VALUE_TYPES.map((type) => (
          <span key={type}>
            <i style={{ background: TYPE_COLOR[type] }} />
            {type}
          </span>
        ))}
      </div>
    </aside>
  );
}
