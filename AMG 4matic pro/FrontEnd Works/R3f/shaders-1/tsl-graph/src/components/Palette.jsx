import { useMemo, useState } from "react";
import { CATALOG, LIBRARY_GROUPS } from "../graph/catalog.js";
import { TYPE_COLOR, VALUE_TYPES } from "../graph/types.js";

export function Palette({ onAdd, presets, activePreset, onPreset }) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const groups = useMemo(() => {
    return LIBRARY_GROUPS.map((group) => ({
      ...group,
      kinds: group.kinds.filter((kind) => {
        const def = CATALOG[kind];
        const haystack = `${def.label} ${def.blurb} ${group.id} ${kind}`.toLowerCase();
        return haystack.includes(needle);
      }),
    })).filter((group) => group.kinds.length > 0);
  }, [needle]);
  const presetRows = presets.filter((preset) =>
    `${preset.name} ${preset.description} ${preset.id}`.toLowerCase().includes(needle),
  );

  return (
    <aside className="palette">
      <div className="library-head">
        <strong>Library</strong>
        <span>Ctrl+K</span>
      </div>
      <label className="search">
        <span>Find a node</span>
        <input
          data-testid="palette-search"
          value={query}
          placeholder="Search nodes"
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <div className="palette-list">
        {groups.map((group) => (
          <section key={group.id} className="library-group" data-testid={`group-${group.id}`}>
            <h2>{group.id}</h2>
            {group.kinds.map((kind) => {
              const def = CATALOG[kind];
              if (kind === "material") {
                return (
                  <p key={kind} className="library-note">
                    Material is already in the graph.
                  </p>
                );
              }
              return (
                <button key={kind} type="button" data-testid={`add-${kind}`} onClick={() => onAdd(kind)}>
                  <strong>{def.label}</strong>
                  <small>{def.blurb || def.category}</small>
                </button>
              );
            })}
          </section>
        ))}
        {presetRows.length > 0 && (
          <section className="library-group" data-testid="group-presets">
            <h2>Presets</h2>
            {presetRows.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={`preset-row${preset.id === activePreset ? " active" : ""}`}
                data-testid={`preset-${preset.id}`}
                onClick={() => onPreset(preset)}
              >
                <img src={preset.thumbnail} alt="" />
                <span>
                  <strong>{preset.name}</strong>
                  <small>{preset.description}</small>
                </span>
              </button>
            ))}
          </section>
        )}
        {groups.length === 0 && presetRows.length === 0 && <p className="empty">No matching nodes.</p>}
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
