const input = (id, label) => ({ id, label });
const output = (id, label) => ({ id, label });

function node(label, category, inputs, outputs, extra = {}) {
  return {
    label,
    category,
    inputs,
    outputs,
    defaults: extra.defaults ?? {},
    fields: extra.fields ?? [],
    blurb: extra.blurb ?? "",
  };
}

const numberField = (key, label, step = 0.01, extra = {}) => ({
  key,
  label,
  control: "number",
  step,
  ...extra,
});

export const CATALOG = {
  uv: node("UV", "Input", [], [output("out", "UV")], {
    blurb: "uv()",
  }),
  position: node("Position", "Input", [], [output("out", "Position")], {
    blurb: "positionLocal",
  }),
  normal: node("Normal", "Input", [], [output("out", "Normal")], {
    blurb: "normalLocal",
  }),
  time: node("Time", "Input", [], [output("out", "Time")], {
    blurb: "time",
  }),
  float: node("Float", "Input", [], [output("out", "Value")], {
    defaults: { value: 1 },
    fields: [numberField("value", "Value")],
  }),
  color: node("Color", "Input", [], [output("out", "Color")], {
    defaults: { value: "#ffffff" },
    fields: [{ key: "value", label: "Color", control: "color" }],
  }),
  vec3: node("Vec3", "Input", [], [output("out", "Vector")], {
    defaults: { x: 0, y: 0, z: 0 },
    fields: [numberField("x", "X"), numberField("y", "Y"), numberField("z", "Z")],
  }),
  add: node("Add", "Math", [input("a", "A"), input("b", "B")], [output("out", "Out")]),
  subtract: node(
    "Subtract",
    "Math",
    [input("a", "A"), input("b", "B")],
    [output("out", "Out")],
  ),
  multiply: node(
    "Multiply",
    "Math",
    [input("a", "A"), input("b", "B")],
    [output("out", "Out")],
  ),
  divide: node(
    "Divide",
    "Math",
    [input("a", "A"), input("b", "B")],
    [output("out", "Out")],
  ),
  mix: node(
    "Mix",
    "Math",
    [input("a", "A"), input("b", "B"), input("t", "T")],
    [output("out", "Out")],
  ),
  clamp: node(
    "Clamp",
    "Math",
    [input("value", "Value"), input("min", "Min"), input("max", "Max")],
    [output("out", "Out")],
  ),
  smoothstep: node(
    "Smoothstep",
    "Math",
    [input("edge0", "Edge 0"), input("edge1", "Edge 1"), input("x", "X")],
    [output("out", "Out")],
  ),
  sin: node("Sin", "Math", [input("in", "In")], [output("out", "Out")]),
  abs: node("Abs", "Math", [input("in", "In")], [output("out", "Out")]),
  power: node(
    "Power",
    "Math",
    [input("base", "Base"), input("exp", "Exp")],
    [output("out", "Out")],
  ),
  fract: node("Fract", "Math", [input("in", "In")], [output("out", "Out")]),
  min: node("Min", "Math", [input("a", "A"), input("b", "B")], [output("out", "Out")]),
  max: node("Max", "Math", [input("a", "A"), input("b", "B")], [output("out", "Out")]),
  split: node(
    "Split",
    "Math",
    [input("in", "In")],
    [output("x", "X"), output("y", "Y"), output("z", "Z")],
    { blurb: "x / y / z" },
  ),
  combine: node(
    "Combine",
    "Math",
    [input("x", "X"), input("y", "Y"), input("z", "Z")],
    [output("out", "Vec3")],
    { blurb: "vec3(x, y, z)" },
  ),
  noise: node("Noise", "Pattern", [input("p", "P")], [output("out", "Noise")], {
    blurb: "mx_noise_float",
    defaults: { amplitude: 1, pivot: 0 },
    fields: [numberField("amplitude", "Amplitude"), numberField("pivot", "Pivot")],
  }),
  texture: node(
    "Texture",
    "Pattern",
    [input("uv", "UV")],
    [output("rgb", "RGB"), output("a", "A")],
    {
      blurb: "texture()",
      defaults: { src: "" },
      fields: [{ key: "src", label: "Image", control: "image" }],
    },
  ),
  fourier: node("Fourier", "Pattern", [input("t", "Time")], [output("out", "Wave")], {
    blurb: "Harmonic series",
    defaults: { harmonics: 4, frequency: 1, falloff: 1, waveform: "sine" },
    fields: [
      numberField("harmonics", "Harmonics", 1, { min: 1, max: 12 }),
      numberField("frequency", "Frequency"),
      numberField("falloff", "Falloff", 0.01, { min: 0, max: 4 }),
      {
        key: "waveform",
        label: "Waveform",
        control: "select",
        options: [
          { value: "sine", label: "Sine" },
          { value: "square", label: "Square" },
          { value: "saw", label: "Saw" },
        ],
      },
    ],
  }),
  formula: node("Formula", "Pattern", [input("t", "Time")], [output("out", "Value")], {
    blurb: "Expression compiled to TSL",
    defaults: { expr: "sin(uv.x * 10.0 + time)" },
    fields: [{ key: "expr", label: "Expression", control: "text" }],
  }),
  curve: node("Curve", "Pattern", [input("t", "Sample")], [output("out", "Value")], {
    blurb: "Shape a 0–1 ramp",
    defaults: {
      points: [
        { x: 0, y: 0 },
        { x: 0.35, y: 0.12 },
        { x: 0.62, y: 0.88 },
        { x: 1, y: 1 },
      ],
    },
    fields: [{ key: "points", label: "Curve", control: "curve" }],
  }),
  audio: node(
    "Audio",
    "Audio",
    [],
    [
      output("bass", "Bass"),
      output("mid", "Mid"),
      output("high", "High"),
      output("level", "Level"),
    ],
    {
      blurb: "Microphone bands",
      defaults: { source: "tone" },
      fields: [
        {
          key: "source",
          label: "Mode",
          control: "select",
          options: [
            { value: "tone", label: "Test tone" },
            { value: "mic", label: "Microphone" },
            { value: "none", label: "Idle" },
          ],
        },
      ],
    },
  ),
  material: node(
    "Material",
    "Output",
    [
      input("color", "Color"),
      input("roughness", "Roughness"),
      input("metalness", "Metalness"),
      input("emissive", "Emissive"),
      input("opacity", "Opacity"),
    ],
    [],
    { blurb: "MeshStandardNodeMaterial" },
  ),
};

export const LIBRARY_GROUPS = [
  {
    id: "Input",
    kinds: ["uv", "position", "normal", "time", "float", "color", "vec3"],
  },
  {
    id: "Math",
    kinds: [
      "add",
      "subtract",
      "multiply",
      "divide",
      "mix",
      "clamp",
      "smoothstep",
      "sin",
      "abs",
      "power",
      "fract",
      "min",
      "max",
      "split",
      "combine",
    ],
  },
  {
    id: "Pattern",
    kinds: ["noise", "texture", "fourier", "formula", "curve"],
  },
  { id: "Audio", kinds: ["audio"] },
  { id: "Output", kinds: ["material"] },
];

export const PALETTE_KINDS = LIBRARY_GROUPS.flatMap((group) => group.kinds).filter(
  (kind) => kind !== "material",
);

export const INPUT_DEFAULTS = {
  mix: { t: 0.5 },
  clamp: { min: 0, max: 1 },
  smoothstep: { edge0: 0, edge1: 1 },
  power: { exp: 1 },
  divide: { b: 1 },
  material: {
    color: "#ffffff",
    roughness: 0.5,
    metalness: 0,
    emissive: "#000000",
    opacity: 1,
  },
};

function cloneValues(values) {
  const next = { ...values };
  if (Array.isArray(next.points)) next.points = next.points.map((point) => ({ ...point }));
  return next;
}

export function createNode(kind, id, position, values = {}) {
  const def = CATALOG[kind];
  if (!def) throw new Error(`Unknown node kind ${kind}`);
  return {
    id,
    type: "tsl",
    position,
    deletable: kind !== "material",
    data: {
      kind,
      values: cloneValues({ ...def.defaults, ...values }),
    },
  };
}

export function inputIds(kind) {
  return CATALOG[kind].inputs.map((socket) => socket.id);
}

export function outputIds(kind) {
  return CATALOG[kind].outputs.map((socket) => socket.id);
}
