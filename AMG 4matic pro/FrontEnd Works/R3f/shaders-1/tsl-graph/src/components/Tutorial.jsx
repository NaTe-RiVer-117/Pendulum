import { useRef, useState } from "react";

const SEEN_KEY = "tsl-graph-tutorial-seen";

const STEPS = [
  {
    id: "preset",
    title: "Pick a preset",
    body: "Choose a shader. Its image is a still of the material, and choosing it loads the graph.",
  },
  {
    id: "tweak",
    title: "Tweak it",
    body: "Move speed, a color, or intensity in this panel. Those controls are the nodes themselves.",
  },
  {
    id: "graph",
    title: "Open the graph",
    body: "Switch to Graph. Edit a node and the same shader updates.",
  },
  {
    id: "export",
    title: "Export",
    body: "Open Export and copy the TSL, or download material.js.",
  },
];

export function tutorialSeen() {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return true;
  }
}

export function Tutorial({ activePreset, tweakSignal, graphOpens, exportSignal, onClose }) {
  const [step, setStep] = useState(0);
  const baseline = useRef(null);
  if (!baseline.current) {
    baseline.current = { activePreset, tweakSignal, graphOpens, exportSignal };
  }
  const base = baseline.current;
  const current = STEPS[step];
  const ready =
    step === 0
      ? Boolean(activePreset) && activePreset !== base.activePreset
      : step === 1
        ? tweakSignal > base.tweakSignal
        : step === 2
          ? graphOpens > base.graphOpens
          : exportSignal > base.exportSignal;
  const last = step === STEPS.length - 1;

  function close() {
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* private mode */
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
        <button type="button" data-testid="tutorial-skip" onClick={close}>
          Skip
        </button>
        <button
          type="button"
          data-testid="tutorial-next"
          disabled={!ready}
          onClick={() => {
            if (last) {
              close();
              return;
            }
            baseline.current = { activePreset, tweakSignal, graphOpens, exportSignal };
            setStep(step + 1);
          }}
        >
          {last ? "Finish" : "Next"}
        </button>
      </div>
    </aside>
  );
}
