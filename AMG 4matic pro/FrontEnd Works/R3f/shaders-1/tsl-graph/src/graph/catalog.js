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

const numberField = (key, label) => ({
  key,
  label,
  control: "number",
  step: 0.01,
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
  float: node("Float", "Constant", [], [output("out", "Value")], {
    defaults: { value: 1 },
    fields: [numberField("value", "Value")],
  }),
  color: node("Color", "Constant", [], [output("out", "Color")], {
    defaults: { value: "#ffffff" },
    fields: [{ key: "value", label: "Color", control: "color" }],
  }),
  vec3: node("Vec3", "Constant", [], [output("out", "Vector")], {
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
    "Convert",
    [input("in", "In")],
    [output("x", "X"), output("y", "Y"), output("z", "Z")],
    { blurb: "x / y / z" },
  ),
  combine: node(
    "Combine",
    "Convert",
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

export const PALETTE_KINDS = [
  "uv",
  "position",
  "normal",
  "time",
  "float",
  "color",
  "vec3",
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
  "noise",
  "texture",
];

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
      values: { ...def.defaults, ...values },
    },
  };
}

export function inputIds(kind) {
  return CATALOG[kind].inputs.map((socket) => socket.id);
}

export function outputIds(kind) {
  return CATALOG[kind].outputs.map((socket) => socket.id);
}
