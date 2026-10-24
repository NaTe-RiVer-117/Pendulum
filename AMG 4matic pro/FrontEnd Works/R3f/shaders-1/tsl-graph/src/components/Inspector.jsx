import { useEffect, useRef, useState } from "react";
import { CATALOG } from "../graph/catalog.js";

function NumberField({ value, step, testId, onCommit }) {
  const [text, setText] = useState(() => String(value ?? ""));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setText(String(value ?? ""));
  }, [value]);

  return (
    <input
      type="number"
      step={step}
      data-testid={testId}
      value={text}
      onFocus={() => {
        focused.current = true;
      }}
      onBlur={() => {
        focused.current = false;
        setText(String(value ?? ""));
      }}
      onChange={(event) => {
        const next = event.target.value;
        setText(next);
        const number = Number(next);
        if (Number.isFinite(number)) onCommit(number);
      }}
    />
  );
}

function ColorField({ value, testId, onCommit }) {
  const safe = typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#ffffff";
  const [text, setText] = useState(safe);
  useEffect(() => {
    setText(safe);
  }, [safe]);

  return (
    <div className="color-field">
      <input
        type="color"
        aria-label="Color picker"
        value={safe}
        onChange={(event) => onCommit(event.target.value.toLowerCase())}
      />
      <input
        type="text"
        data-testid={testId}
        value={text}
        spellCheck={false}
        onChange={(event) => {
          const next = event.target.value.trim();
          setText(event.target.value);
          if (/^#[0-9a-fA-F]{6}$/.test(next)) onCommit(next.toLowerCase());
        }}
      />
    </div>
  );
}

export function Inspector({ selected, onChange, onDelete, onNotice }) {
  const node = selected.length === 1 ? selected[0] : null;
  const def = node ? CATALOG[node.data.kind] : null;

  return (
    <aside className="inspector" data-testid="inspector">
      <h2>{def ? def.label : "Inspector"}</h2>
      {!node && (
        <p>{selected.length > 1 ? "Select one node." : "Select a node to edit its constants."}</p>
      )}
      {def?.blurb && <p className="blurb">{def.blurb}</p>}
      {def && def.fields.length === 0 && <p>This node has no constants.</p>}
      {def?.fields.map((field) => (
        <label key={field.key} className="field">
          <span>{field.label}</span>
          {field.control === "number" && (
            <NumberField
              value={node.data.values?.[field.key]}
              step={field.step}
              testId={`field-${field.key}`}
              onCommit={(value) => onChange(node.id, field.key, value)}
            />
          )}
          {field.control === "color" && (
            <ColorField
              value={node.data.values?.[field.key]}
              testId={`field-${field.key}`}
              onCommit={(value) => onChange(node.id, field.key, value)}
            />
          )}
          {field.control === "image" && (
            <div className="image-field">
              <input
                type="file"
                accept="image/*"
                data-testid="field-src"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  if (file.size > 1_200_000) {
                    onNotice("Image is over 1.2 MB. The checker texture stays in use.");
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = () => onChange(node.id, field.key, String(reader.result || ""));
                  reader.readAsDataURL(file);
                }}
              />
              <button type="button" onClick={() => onChange(node.id, field.key, "")}>
                Use checker
              </button>
            </div>
          )}
        </label>
      ))}
      {node && node.data.kind !== "material" && (
        <button type="button" className="danger" data-testid="delete-node" onClick={() => onDelete(node.id)}>
          Delete node
        </button>
      )}
    </aside>
  );
}
