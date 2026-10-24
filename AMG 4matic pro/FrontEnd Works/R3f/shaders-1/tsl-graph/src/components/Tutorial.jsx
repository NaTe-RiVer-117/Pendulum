import { useRef, useState } from "react";

const SEEN_KEY = "tsl-graph-tutorial-seen";

const STEPS = [
  {
    id: "create",
    title: "Build or load",
    body: "Add a node from the library, or load a preset onto the canvas.",
  },
  {
    id: "edit",
    title: "Edit a constant",
    body: "Select a node and change a value. The preview uses that same graph.",
  },
  {
    id: "export",
    title: "Export",
    body: "Copy the TSL export or download material.js.",
  },
];

export function Tutorial({ librarySignal, tweakSignal, exportSignal, onClose }) {
  const [step, setStep] = useState(0);
  const baseline = useRef(null);
  if (!baseline.current) {
    baseline.current = { librarySignal, tweakSignal, exportSignal };
  }
  const base = baseline.current;
  const current = STEPS[step];
  const ready =
    step === 0
      ? librarySignal > base.librarySignal
      : step === 1
        ? tweakSignal > base.tweakSignal
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
            baseline.current = { librarySignal, tweakSignal, exportSignal };
            setStep(step + 1);
          }}
        >
          {last ? "Finish" : "Next"}
        </button>
      </div>
    </aside>
  );
}
