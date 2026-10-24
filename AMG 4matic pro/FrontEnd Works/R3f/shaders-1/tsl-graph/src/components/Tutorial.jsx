import { useRef, useState } from "react";

const SEEN_KEY = "tsl-graph-tutorial-seen";

const STEPS = [
  {
    id: "add",
    title: "Add a node",
    body: "Add a node from the library on the left, or press Ctrl+K and pick one.",
  },
  {
    id: "connect",
    title: "Connect it",
    body: "Drag from a colored output to an input. A float can feed a vec2, vec3, or color. Other mismatches are refused.",
  },
  {
    id: "edit",
    title: "Edit a constant",
    body: "Select a node and change a number, color, waveform, expression, or curve point in the inspector. The preview rebuilds.",
  },
  {
    id: "export",
    title: "Export the shader",
    body: "Use Copy export or Download .js. The file is three/tsl JavaScript that rebuilds the material.",
  },
];

function capture(nodes, edges, exportSignal) {
  return {
    ids: new Set(nodes.map((node) => node.id)),
    edges: edges.length,
    values: JSON.stringify(nodes.map((node) => node.data.values)),
    exports: exportSignal,
  };
}

export function tutorialSeen() {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return true;
  }
}

export function Tutorial({ nodes, edges, exportSignal, onClose }) {
  const [step, setStep] = useState(0);
  const baseline = useRef(null);
  if (!baseline.current) baseline.current = capture(nodes, edges, exportSignal);
  const base = baseline.current;
  const current = STEPS[step];
  const ready =
    step === 0
      ? nodes.some((node) => !base.ids.has(node.id))
      : step === 1
        ? edges.length > base.edges
        : step === 2
          ? JSON.stringify(nodes.map((node) => node.data.values)) !== base.values
          : exportSignal > base.exports;
  const last = step === STEPS.length - 1;

  function close(markSeen) {
    if (markSeen) {
      try {
        localStorage.setItem(SEEN_KEY, "1");
      } catch {
        /* private mode */
      }
    }
    onClose();
  }

  return (
    <aside
      className="tutorial"
      data-testid="tutorial"
      data-step={current.id}
      data-ready={ready ? "true" : "false"}
    >
      <p className="tutorial-kicker">
        Tutorial {step + 1} / {STEPS.length}
      </p>
      <h2 data-testid="tutorial-title">{current.title}</h2>
      <p>{current.body}</p>
      <div className="tutorial-actions">
        <button type="button" data-testid="tutorial-skip" onClick={() => close(true)}>
          Skip
        </button>
        <button
          type="button"
          data-testid="tutorial-next"
          disabled={!ready}
          onClick={() => {
            if (last) {
              close(true);
              return;
            }
            baseline.current = capture(nodes, edges, exportSignal);
            setStep(step + 1);
          }}
        >
          {last ? "Finish" : "Next"}
        </button>
      </div>
    </aside>
  );
}
