import { materialHint } from "../graph/catalog.js";
import { createLight } from "../scene/scene.js";

const PRIMITIVES = [
  ["sphere", "Sphere"],
  ["box", "Box"],
  ["torus", "Torus"],
  ["knot", "Torus knot"],
  ["cylinder", "Cylinder"],
  ["icosahedron", "Icosahedron"],
  ["plane", "Plane"],
];

const SEGMENTS = {
  sphere: [
    ["widthSegments", "Width"],
    ["heightSegments", "Height"],
  ],
  box: [
    ["widthSegments", "Width"],
    ["heightSegments", "Height"],
    ["depthSegments", "Depth"],
  ],
  torus: [
    ["radialSegments", "Radial"],
    ["tubularSegments", "Tubular"],
  ],
  knot: [
    ["tubularSegments", "Tubular"],
    ["radialSegments", "Radial"],
  ],
  cylinder: [
    ["radialSegments", "Radial"],
    ["heightSegments", "Height"],
  ],
  icosahedron: [["detail", "Detail"]],
  plane: [
    ["widthSegments", "Width"],
    ["heightSegments", "Height"],
  ],
};

const LIGHT_LABEL = {
  ambient: "Ambient",
  directional: "Directional",
  point: "Point",
  spot: "Spot",
};

function Xyz({ label, test, value, onBegin, onChange, step = 0.1 }) {
  return (
    <div className="scene-xyz">
      <span>{label}</span>
      {["x", "y", "z"].map((axis, index) => (
        <input
          key={axis}
          type="number"
          step={step}
          aria-label={`${label} ${axis}`}
          data-testid={`${test}-${axis}`}
          value={value[index]}
          onPointerDown={onBegin}
          onChange={(event) => {
            const next = value.slice();
            next[index] = Number(event.target.value);
            onChange(next);
          }}
        />
      ))}
    </div>
  );
}

function Slider({ label, test, value, min, max, step, driven, onBegin, onChange }) {
  return (
    <label className="scene-slider">
      <span>{label}</span>
      {driven ? (
        <em data-testid={`scene-driven-${test}`}>Graph</em>
      ) : (
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          data-testid={`scene-${test}`}
          value={value}
          onPointerDown={onBegin}
          onChange={(event) => onChange(Number(event.target.value))}
        />
      )}
    </label>
  );
}

export function ScenePanel({ scene, materialNode, driven, onBegin, onScene, onCommit, onMaterial }) {
  const material = {
    color: materialHint(materialNode, "color"),
    roughness: materialHint(materialNode, "roughness"),
    metalness: materialHint(materialNode, "metalness"),
  };
  const object = scene.object;

  function patchObject(partial, commit = false) {
    const apply = (current) => ({ ...current, object: { ...current.object, ...partial } });
    if (commit) onCommit(apply);
    else onScene(apply);
  }

  return (
    <section className="scene-panel" data-testid="scene-panel">
      <h2>Scene</h2>
      <section>
        <h3>Geometry</h3>
        <label className="scene-slider">
          <span>Mesh</span>
          <select
            data-testid="scene-primitive"
            value={object.primitive}
            onChange={(event) => patchObject({ primitive: event.target.value }, true)}
          >
            {PRIMITIVES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <Xyz
          label="Position"
          test="scene-position"
          value={object.position}
          onBegin={onBegin}
          onChange={(position) => patchObject({ position })}
        />
        <Xyz
          label="Rotation"
          test="scene-rotation"
          value={object.rotation}
          step={1}
          onBegin={onBegin}
          onChange={(rotation) => patchObject({ rotation })}
        />
        <Xyz
          label="Scale"
          test="scene-scale"
          value={object.scale}
          onBegin={onBegin}
          onChange={(scale) => patchObject({ scale })}
        />
        {(SEGMENTS[object.primitive] ?? []).map(([key, label]) => (
          <label className="scene-slider" key={key}>
            <span>{label}</span>
            <input
              type="number"
              step="1"
              data-testid={`scene-${key}`}
              value={object[key]}
              onPointerDown={onBegin}
              onChange={(event) => patchObject({ [key]: Number(event.target.value) })}
            />
          </label>
        ))}
      </section>
      <section>
        <h3>Material</h3>
        <label className="scene-slider">
          <span>Color</span>
          {driven.color ? (
            <em data-testid="scene-driven-color">Graph</em>
          ) : (
            <input
              type="color"
              data-testid="scene-color"
              value={material.color}
              onPointerDown={onBegin}
              onChange={(event) => onMaterial("color", event.target.value)}
            />
          )}
        </label>
        <Slider
          label="Metalness"
          test="metalness"
          value={material.metalness}
          min={0}
          max={1}
          step={0.01}
          driven={driven.metalness}
          onBegin={onBegin}
          onChange={(value) => onMaterial("metalness", value)}
        />
        <Slider
          label="Roughness"
          test="roughness"
          value={material.roughness}
          min={0}
          max={1}
          step={0.01}
          driven={driven.roughness}
          onBegin={onBegin}
          onChange={(value) => onMaterial("roughness", value)}
        />
        <Slider
          label="Environment"
          test="environment"
          value={scene.environment}
          min={0}
          max={2}
          step={0.01}
          onBegin={onBegin}
          onChange={(environment) => onScene((current) => ({ ...current, environment }))}
        />
      </section>
      <section>
        <h3>Lights</h3>
        {scene.lights.map((light) => (
          <article key={light.id} className="scene-light" data-testid={`scene-light-${light.type}`} data-light-id={light.id}>
            <header>
              <strong>{LIGHT_LABEL[light.type]}</strong>
              <button
                type="button"
                data-testid="scene-light-remove"
                onClick={() =>
                  onCommit((current) => ({
                    ...current,
                    lights: current.lights.filter((item) => item.id !== light.id),
                  }))
                }
              >
                Remove
              </button>
            </header>
            <label className="scene-slider">
              <span>Color</span>
              <input
                type="color"
                data-testid="scene-light-color"
                value={light.color}
                onPointerDown={onBegin}
                onChange={(event) =>
                  onScene((current) => ({
                    ...current,
                    lights: current.lights.map((item) =>
                      item.id === light.id ? { ...item, color: event.target.value } : item,
                    ),
                  }))
                }
              />
            </label>
            <Slider
              label="Intensity"
              test={`light-intensity-${light.id}`}
              value={light.intensity}
              min={0}
              max={light.type === "ambient" ? 2 : 40}
              step={0.01}
              onBegin={onBegin}
              onChange={(intensity) =>
                onScene((current) => ({
                  ...current,
                  lights: current.lights.map((item) => (item.id === light.id ? { ...item, intensity } : item)),
                }))
              }
            />
            {light.position && (
              <Xyz
                label="Position"
                test={`scene-light-position-${light.id}`}
                value={light.position}
                onBegin={onBegin}
                onChange={(position) =>
                  onScene((current) => ({
                    ...current,
                    lights: current.lights.map((item) => (item.id === light.id ? { ...item, position } : item)),
                  }))
                }
              />
            )}
          </article>
        ))}
        <div className="scene-add">
          {["ambient", "directional", "point", "spot"].map((type) => (
            <button
              key={type}
              type="button"
              data-testid={`scene-add-${type}`}
              onClick={() =>
                onCommit((current) => ({ ...current, lights: current.lights.concat(createLight(type)) }))
              }
            >
              {LIGHT_LABEL[type]}
            </button>
          ))}
        </div>
      </section>
      <section>
        <h3>View</h3>
        <label className="scene-slider">
          <span>Background</span>
          <input
            type="color"
            data-testid="scene-background"
            value={scene.background}
            onPointerDown={onBegin}
            onChange={(event) => onScene((current) => ({ ...current, background: event.target.value }))}
          />
        </label>
        <Slider
          label="Field of view"
          test="fov"
          value={scene.fov}
          min={15}
          max={90}
          step={1}
          onBegin={onBegin}
          onChange={(fov) => onScene((current) => ({ ...current, fov }))}
        />
      </section>
    </section>
  );
}
