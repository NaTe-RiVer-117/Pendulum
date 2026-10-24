export function PresetShelf({ presets, activeId, onPick }) {
  return (
    <section className="shelf" aria-label="Preset shaders" data-testid="preset-shelf">
      {presets.map((preset) => (
        <button
          key={preset.id}
          type="button"
          className={preset.id === activeId ? "preset-card active" : "preset-card"}
          data-testid={`preset-${preset.id}`}
          onClick={() => onPick(preset)}
        >
          <span
            className="preset-swatch"
            style={{
              background: `linear-gradient(145deg, ${preset.swatch[0]} 0%, ${preset.swatch[1]} 58%, ${preset.swatch[2]} 100%)`,
            }}
          />
          <span className="preset-copy">
            <strong>{preset.name}</strong>
            <small>{preset.blurb}</small>
          </span>
        </button>
      ))}
    </section>
  );
}

export function TweakBar({ preset, nodes, onChange }) {
  if (!preset) {
    return (
      <div className="tweaks empty-tweaks" data-testid="tweaks">
        <p>Choose a preset to play with speed, color, and intensity.</p>
      </div>
    );
  }

  return (
    <div className="tweaks" data-testid="tweaks">
      <strong>{preset.name}</strong>
      {preset.tweaks.map((tweak) => {
        const node = nodes.find((item) => item.id === tweak.nodeId);
        const value = node?.data?.values?.[tweak.key];
        if (tweak.control === "color") {
          const color = typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#ffffff";
          return (
            <label key={tweak.id}>
              {tweak.label}
              <input
                type="color"
                data-testid={`tweak-${tweak.id}`}
                value={color}
                onChange={(event) => onChange(tweak.nodeId, tweak.key, event.target.value)}
              />
            </label>
          );
        }
        const number = Number(value);
        return (
          <label key={tweak.id}>
            {tweak.label}
            <input
              type="range"
              data-testid={`tweak-${tweak.id}`}
              min={tweak.min}
              max={tweak.max}
              step={tweak.step}
              value={Number.isFinite(number) ? number : tweak.min}
              onChange={(event) => {
                const next = Number(event.target.value);
                onChange(tweak.nodeId, tweak.key, tweak.step === 1 ? Math.round(next) : next);
              }}
            />
          </label>
        );
      })}
    </div>
  );
}
