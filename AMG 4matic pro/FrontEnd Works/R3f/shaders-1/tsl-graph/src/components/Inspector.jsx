import { useEffect, useRef, useState } from "react";
import { getAudioSnapshot, subscribeAudio } from "../audio/driver.js";
import { CATALOG } from "../graph/catalog.js";
import { parseFormula } from "../graph/formula.js";
import { sanitizeCurve } from "../graph/series.js";

function NumberField({ value, step, min, max, testId, onCommit }) {
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
        if (!Number.isFinite(number)) return;
        const low = min ?? -Infinity;
        const high = max ?? Infinity;
        onCommit(Math.min(high, Math.max(low, number)));
      }}
    />
  );
}

function FormulaHint({ expr }) {
  let message = "Uses uv.x, uv.y, time, and the listed math functions.";
  let bad = false;
  try {
    parseFormula(expr);
  } catch (error) {
    bad = true;
    message = error?.message || "Formula could not be parsed.";
  }
  return (
    <p className={bad ? "formula-error" : "blurb"} data-testid="formula-hint">
      {message}
    </p>
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

function CurveEditor({ points, onChange }) {
  const svgRef = useRef(null);
  const drag = useRef(null);
  const curve = sanitizeCurve(points);

  function pointFromEvent(event) {
    const rect = svgRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = 1 - (event.clientY - rect.top) / rect.height;
    return {
      x: Math.min(1, Math.max(0, x)),
      y: Math.min(1, Math.max(0, y)),
    };
  }

  function move(event) {
    const index = drag.current;
    if (index == null || !svgRef.current) return;
    const next = curve.map((point) => ({ ...point }));
    const hit = pointFromEvent(event);
    if (index === 0) hit.x = 0;
    else if (index === next.length - 1) hit.x = 1;
    else {
      hit.x = Math.min(next[index + 1].x - 0.02, Math.max(next[index - 1].x + 0.02, hit.x));
    }
    next[index] = hit;
    onChange(next);
  }

  const line = curve.map((point) => `${point.x * 100},${(1 - point.y) * 100}`).join(" ");

  return (
    <svg
      className="curve-editor"
      data-testid="curve-editor"
      ref={svgRef}
      viewBox="0 0 100 100"
      onPointerMove={move}
      onPointerUp={() => {
        drag.current = null;
      }}
    >
      <rect className="curve-bg" x="0" y="0" width="100" height="100" />
      <polyline className="curve-line" points={line} />
      {curve.map((point, index) => (
        <circle
          key={index}
          data-testid={`curve-point-${index}`}
          cx={point.x * 100}
          cy={(1 - point.y) * 100}
          r="4.2"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            drag.current = index;
          }}
          onPointerMove={move}
          onPointerUp={() => {
            drag.current = null;
          }}
        />
      ))}
    </svg>
  );
}

function AudioPanel({ onPick }) {
  const [state, setState] = useState(getAudioSnapshot);
  const canvasRef = useRef(null);

  useEffect(() => subscribeAudio(setState), []);

  useEffect(() => {
    let frame = 0;
    const draw = () => {
      const snap = getAudioSnapshot();
      setState(snap);
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");
      if (context && canvas) {
        const width = canvas.width;
        const height = canvas.height;
        context.clearRect(0, 0, width, height);
        context.fillStyle = "#10141c";
        context.fillRect(0, 0, width, height);
        const data = snap.spectrum;
        const bars = 48;
        context.fillStyle = "#7ee0ff";
        for (let index = 0; index < bars; index += 1) {
          const start = Math.floor((index / bars) * data.length);
          const end = Math.max(start + 1, Math.floor(((index + 1) / bars) * data.length));
          let total = 0;
          for (let bin = start; bin < end; bin += 1) total += data[bin] || 0;
          const level = total / (end - start) / 255;
          const barWidth = width / bars - 2;
          context.fillRect(index * (width / bars), height - level * height, barWidth, level * height);
        }
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, []);

  const status =
    state.detail ||
    (state.source === "tone"
      ? "Test tone is driving the shader."
      : state.source === "mic"
        ? "Microphone is live."
        : "Audio is idle.");

  return (
    <div className="audio-panel" data-testid="audio-panel" data-mic={state.mic} data-source={state.source}>
      <p data-testid="audio-status">{status}</p>
      <p className="audio-meters">
        <span>
          Bass <strong data-testid="audio-bass">{state.bass.toFixed(3)}</strong>
        </span>
        <span>
          Mid <strong data-testid="audio-mid">{state.mid.toFixed(3)}</strong>
        </span>
        <span>
          High <strong data-testid="audio-high">{state.high.toFixed(3)}</strong>
        </span>
        <span>
          Level <strong data-testid="audio-level">{state.level.toFixed(3)}</strong>
        </span>
      </p>
      <canvas ref={canvasRef} data-testid="audio-spectrum" width="320" height="84" />
      <div className="audio-actions">
        <button type="button" data-testid="audio-mic" onClick={() => onPick("mic")}>
          Use microphone
        </button>
        <button type="button" data-testid="audio-tone" onClick={() => onPick("tone")}>
          Test tone
        </button>
      </div>
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
      {node?.data.kind === "audio" && <AudioPanel onPick={(mode) => onChange(node.id, "source", mode)} />}
      {def && def.fields.length === 0 && node?.data.kind !== "audio" && <p>This node has no constants.</p>}
      {def?.fields.map((field) => (
        <label key={field.key} className="field">
          <span>{field.label}</span>
          {field.control === "number" && (
            <NumberField
              value={node.data.values?.[field.key]}
              step={field.step}
              min={field.min}
              max={field.max}
              testId={`field-${field.key}`}
              onCommit={(value) => onChange(node.id, field.key, value)}
            />
          )}
          {field.control === "select" && (
            <select
              data-testid={`field-${field.key}`}
              value={node.data.values?.[field.key] ?? field.options[0].value}
              onChange={(event) => onChange(node.id, field.key, event.target.value)}
            >
              {field.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
          {field.control === "text" && (
            <>
              <textarea
                data-testid={`field-${field.key}`}
                rows={4}
                spellCheck={false}
                value={node.data.values?.[field.key] ?? ""}
                onChange={(event) => onChange(node.id, field.key, event.target.value)}
              />
              <FormulaHint expr={node.data.values?.[field.key]} />
            </>
          )}
          {field.control === "curve" && (
            <CurveEditor
              points={node.data.values?.points}
              onChange={(points) => onChange(node.id, field.key, points)}
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
