export function PresetMenu({ presets, activePreset, open, onToggle, onPick }) {
  return (
    <div className="preset-pop">
      <button type="button" data-testid="presets" aria-expanded={open} onClick={onToggle}>
        Presets
      </button>
      {open && (
        <div className="preset-menu" data-testid="preset-menu" role="menu">
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              role="menuitem"
              className={`preset-row${preset.id === activePreset ? " active" : ""}`}
              data-testid={`preset-${preset.id}`}
              onClick={() => onPick(preset)}
            >
              <img src={preset.thumbnail} alt="" />
              <span>
                <strong>{preset.name}</strong>
                <small>{preset.description}</small>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
