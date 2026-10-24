const EFFECTS = [
  {
    id: "bloom",
    label: "Bloom",
    sliders: [
      { key: "strength", label: "Strength", min: 0, max: 3, step: 0.01 },
      { key: "radius", label: "Radius", min: 0, max: 1, step: 0.01 },
      { key: "threshold", label: "Threshold", min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    id: "fringe",
    label: "Chromatic aberration",
    sliders: [
      { key: "amount", label: "Amount", min: 0, max: 0.02, step: 0.0005 },
      { key: "angle", label: "Angle", min: 0, max: 6.28, step: 0.01 },
    ],
  },
  {
    id: "grain",
    label: "Grain",
    sliders: [{ key: "intensity", label: "Intensity", min: 0, max: 1, step: 0.01 }],
  },
  {
    id: "grade",
    label: "Color grade",
    sliders: [
      { key: "contrast", label: "Contrast", min: 0, max: 2.5, step: 0.01 },
      { key: "saturation", label: "Saturation", min: 0, max: 2.5, step: 0.01 },
    ],
  },
];

export function PostStack({ post, onToggle, onBegin, onValue, onRemove }) {
  const visible = EFFECTS.filter((effect) => post[effect.id]?.present !== false);
  return (
    <section className="post-stack" data-testid="post-stack">
      <h2>Post</h2>
      {visible.map((effect) => {
        const values = post[effect.id];
        return (
          <div className="post-effect" key={effect.id}>
            <div className="post-effect-head">
              <label className="post-switch">
                <input
                  type="checkbox"
                  data-testid={`post-${effect.id}`}
                  checked={values.enabled}
                  onChange={(event) => onToggle(effect.id, event.target.checked)}
                />
                <span>{effect.label}</span>
              </label>
              <button type="button" data-testid={`post-remove-${effect.id}`} onClick={() => onRemove(effect.id)}>
                Remove
              </button>
            </div>
            <div className="post-sliders">
              {effect.sliders.map((slider) => (
                <label key={slider.key}>
                  <span>{slider.label}</span>
                  <input
                    type="range"
                    data-testid={`post-${effect.id}-${slider.key}`}
                    min={slider.min}
                    max={slider.max}
                    step={slider.step}
                    value={values[slider.key]}
                    onPointerDown={onBegin}
                    onChange={(event) => onValue(effect.id, slider.key, Number(event.target.value))}
                  />
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
