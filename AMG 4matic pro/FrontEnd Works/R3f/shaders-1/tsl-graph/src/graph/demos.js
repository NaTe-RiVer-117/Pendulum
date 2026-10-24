import { createNode } from "./catalog.js";

function link(id, source, sourceHandle, target, targetHandle) {
  return { id, source, sourceHandle, target, targetHandle };
}

function speedTime(x, y, speed) {
  return [
    createNode("time", "time", { x, y }),
    createNode("float", "speed", { x, y: y + 130 }, { value: speed }),
    createNode("multiply", "timeMul", { x: x + 240, y: y + 40 }),
  ];
}

function speedEdges(prefix) {
  return [
    link(`${prefix}t1`, "time", "out", "timeMul", "a"),
    link(`${prefix}t2`, "speed", "out", "timeMul", "b"),
  ];
}

function surface({ colorA, colorB, gain, rough, metal, shade, x = 1500, y = 40 }) {
  const nodes = [
    createNode("color", "colorA", { x, y }, { value: colorA }),
    createNode("color", "colorB", { x: x + 240, y }, { value: colorB }),
    createNode("mix", "mixColor", { x: x + 480, y: y + 20 }),
    createNode("float", "gain", { x: x + 480, y: y + 220 }, { value: gain }),
    createNode("multiply", "emit", { x: x + 740, y: y + 120 }),
    createNode("float", "rough", { x: x + 480, y: y + 360 }, { value: rough }),
    createNode("float", "metal", { x: x + 740, y: y + 320 }, { value: metal }),
    createNode("material", "material", { x: x + 980, y: y + 140 }),
  ];
  const edges = [
    link("s1", "colorA", "out", "mixColor", "a"),
    link("s2", "colorB", "out", "mixColor", "b"),
    link("s3", shade, "out", "mixColor", "t"),
    link("s4", "mixColor", "out", "emit", "a"),
    link("s5", "gain", "out", "emit", "b"),
    link("s6", "mixColor", "out", "material", "color"),
    link("s7", "rough", "out", "material", "roughness"),
    link("s8", "metal", "out", "material", "metalness"),
    link("s9", "emit", "out", "material", "emissive"),
  ];
  return { nodes, edges };
}

const standardTweaks = [
  { id: "speed", label: "Speed", nodeId: "speed", key: "value", min: 0, max: 3, step: 0.01 },
  { id: "colorA", label: "Color A", nodeId: "colorA", key: "value", control: "color" },
  { id: "colorB", label: "Color B", nodeId: "colorB", key: "value", control: "color" },
  { id: "intensity", label: "Intensity", nodeId: "gain", key: "value", min: 0, max: 2, step: 0.01 },
];

function createIridescent() {
  const tail = surface({
    colorA: "#1a1028",
    colorB: "#7ef6ff",
    gain: 0.9,
    rough: 0.16,
    metal: 0.82,
    shade: "rimWave",
    x: 1680,
  });
  const nodes = [
    createNode("normal", "normal", { x: 0, y: 20 }),
    createNode("split", "split", { x: 250, y: 0 }),
    createNode("abs", "absZ", { x: 500, y: 40 }),
    createNode("float", "one", { x: 500, y: 180 }, { value: 1 }),
    createNode("subtract", "facing", { x: 760, y: 80 }),
    createNode("float", "falloff", { x: 760, y: 240 }, { value: 2.4 }),
    createNode("power", "fresnel", { x: 1020, y: 80 }),
    ...speedTime(0, 340, 0.75),
    createNode("float", "bands", { x: 1020, y: 280 }, { value: 8 }),
    createNode("multiply", "scaled", { x: 1280, y: 80 }),
    createNode("add", "phase", { x: 1280, y: 240 }),
    createNode("sin", "wave", { x: 1520, y: 240 }),
    createNode("float", "half", { x: 1280, y: 420 }, { value: 0.5 }),
    createNode("multiply", "signed", { x: 1520, y: 380 }),
    createNode("add", "shade", { x: 1760, y: 360 }),
    createNode("multiply", "rimWave", { x: 1760, y: 180 }),
    createNode("color", "colorC", { x: 1520, y: 520 }, { value: "#ff4d9a" }),
    createNode("mix", "rim", { x: 1520, y: 0 }),
    ...tail.nodes,
  ];
  const edges = [
    link("i1", "normal", "out", "split", "in"),
    link("i2", "split", "z", "absZ", "in"),
    link("i3", "one", "out", "facing", "a"),
    link("i4", "absZ", "out", "facing", "b"),
    link("i5", "facing", "out", "fresnel", "base"),
    link("i6", "falloff", "out", "fresnel", "exp"),
    ...speedEdges("i"),
    link("i7", "fresnel", "out", "scaled", "a"),
    link("i8", "bands", "out", "scaled", "b"),
    link("i9", "scaled", "out", "phase", "a"),
    link("i10", "timeMul", "out", "phase", "b"),
    link("i11", "phase", "out", "wave", "in"),
    link("i12", "wave", "out", "signed", "a"),
    link("i13", "half", "out", "signed", "b"),
    link("i14", "signed", "out", "shade", "a"),
    link("i15", "half", "out", "shade", "b"),
    link("i16", "shade", "out", "rimWave", "a"),
    link("i17", "fresnel", "out", "rimWave", "b"),
    link("i18", "colorA", "out", "rim", "a"),
    link("i19", "colorB", "out", "rim", "b"),
    link("i20", "fresnel", "out", "rim", "t"),
    link("i21", "rim", "out", "mixColor", "a"),
    link("i22", "colorC", "out", "mixColor", "b"),
    ...tail.edges.filter((edge) => !["s1", "s2", "s3"].includes(edge.id)),
    link("s3", "rimWave", "out", "mixColor", "t"),
  ];
  return { nodes, edges };
}

function createWarp() {
  const tail = surface({
    colorA: "#07111c",
    colorB: "#f2b84b",
    gain: 0.45,
    rough: 0.48,
    metal: 0.08,
    shade: "mask",
    x: 1880,
  });
  const nodes = [
    createNode("uv", "uv", { x: 0, y: 40 }),
    createNode("float", "scale", { x: 0, y: 180 }, { value: 3.2 }),
    createNode("multiply", "uvMul", { x: 260, y: 60 }),
    ...speedTime(0, 340, 0.35),
    createNode("split", "split", { x: 520, y: 40 }),
    createNode("add", "scroll", { x: 780, y: 40 }),
    createNode("float", "zero", { x: 520, y: 220 }, { value: 0 }),
    createNode("combine", "coord", { x: 1040, y: 80 }),
    createNode("noise", "warpNoise", { x: 1300, y: 40 }, { amplitude: 1, pivot: 0 }),
    createNode("float", "warpAmt", { x: 1300, y: 240 }, { value: 1.35 }),
    createNode("multiply", "warpMul", { x: 1560, y: 80 }),
    createNode("add", "warped", { x: 1560, y: 240 }),
    createNode("combine", "coord2", { x: 1820, y: 200 }),
    createNode("noise", "detail", { x: 2080, y: 160 }, { amplitude: 1, pivot: 0 }),
    createNode("float", "edge0", { x: 2080, y: 360 }, { value: -0.2 }),
    createNode("float", "edge1", { x: 2080, y: 490 }, { value: 0.62 }),
    createNode("smoothstep", "mask", { x: 2340, y: 240 }),
    ...tail.nodes,
  ];
  const edges = [
    link("w1", "uv", "out", "uvMul", "a"),
    link("w2", "scale", "out", "uvMul", "b"),
    ...speedEdges("w"),
    link("w3", "uvMul", "out", "split", "in"),
    link("w4", "split", "x", "scroll", "a"),
    link("w5", "timeMul", "out", "scroll", "b"),
    link("w6", "scroll", "out", "coord", "x"),
    link("w7", "split", "y", "coord", "y"),
    link("w8", "zero", "out", "coord", "z"),
    link("w9", "coord", "out", "warpNoise", "p"),
    link("w10", "warpNoise", "out", "warpMul", "a"),
    link("w11", "warpAmt", "out", "warpMul", "b"),
    link("w12", "scroll", "out", "warped", "a"),
    link("w13", "warpMul", "out", "warped", "b"),
    link("w14", "warped", "out", "coord2", "x"),
    link("w15", "split", "y", "coord2", "y"),
    link("w16", "zero", "out", "coord2", "z"),
    link("w17", "coord2", "out", "detail", "p"),
    link("w18", "edge0", "out", "mask", "edge0"),
    link("w19", "edge1", "out", "mask", "edge1"),
    link("w20", "detail", "out", "mask", "x"),
    ...tail.edges,
  ];
  return { nodes, edges };
}

function createRings() {
  const tail = surface({
    colorA: "#081018",
    colorB: "#9dff6a",
    gain: 0.7,
    rough: 0.32,
    metal: 0.2,
    shade: "shade",
    x: 1760,
  });
  const nodes = [
    createNode("uv", "uv", { x: 0, y: 20 }),
    createNode("split", "split", { x: 250, y: 0 }),
    createNode("float", "center", { x: 250, y: 180 }, { value: 0.5 }),
    createNode("subtract", "dx", { x: 520, y: 0 }),
    createNode("subtract", "dy", { x: 520, y: 160 }),
    createNode("float", "two", { x: 520, y: 320 }, { value: 2 }),
    createNode("power", "x2", { x: 780, y: 20 }),
    createNode("power", "y2", { x: 780, y: 180 }),
    createNode("add", "radius", { x: 1040, y: 80 }),
    createNode("float", "freq", { x: 1040, y: 260 }, { value: 36 }),
    createNode("multiply", "rings", { x: 1280, y: 80 }),
    ...speedTime(0, 400, 1.1),
    createNode("subtract", "phase", { x: 1520, y: 160 }),
    createNode("sin", "wave", { x: 1760, y: 160 }),
    createNode("float", "half", { x: 1760, y: 320 }, { value: 0.5 }),
    createNode("multiply", "signed", { x: 2000, y: 180 }),
    createNode("add", "shade", { x: 2240, y: 200 }),
    ...tail.nodes,
  ];
  const edges = [
    link("r1", "uv", "out", "split", "in"),
    link("r2", "split", "x", "dx", "a"),
    link("r3", "center", "out", "dx", "b"),
    link("r4", "split", "y", "dy", "a"),
    link("r5", "center", "out", "dy", "b"),
    link("r6", "dx", "out", "x2", "base"),
    link("r7", "two", "out", "x2", "exp"),
    link("r8", "dy", "out", "y2", "base"),
    link("r9", "two", "out", "y2", "exp"),
    link("r10", "x2", "out", "radius", "a"),
    link("r11", "y2", "out", "radius", "b"),
    link("r12", "radius", "out", "rings", "a"),
    link("r13", "freq", "out", "rings", "b"),
    ...speedEdges("r"),
    link("r14", "rings", "out", "phase", "a"),
    link("r15", "timeMul", "out", "phase", "b"),
    link("r16", "phase", "out", "wave", "in"),
    link("r17", "wave", "out", "signed", "a"),
    link("r18", "half", "out", "signed", "b"),
    link("r19", "signed", "out", "shade", "a"),
    link("r20", "half", "out", "shade", "b"),
    ...tail.edges,
  ];
  return { nodes, edges };
}

function createInterference() {
  const tail = surface({
    colorA: "#120818",
    colorB: "#ffd36a",
    gain: 0.55,
    rough: 0.28,
    metal: 0.35,
    shade: "shade",
    x: 1500,
  });
  const nodes = [
    createNode("uv", "uv", { x: 0, y: 20 }),
    createNode("split", "split", { x: 250, y: 0 }),
    createNode("float", "freq", { x: 250, y: 200 }, { value: 14 }),
    createNode("multiply", "xFreq", { x: 520, y: 0 }),
    createNode("multiply", "yFreq", { x: 520, y: 160 }),
    ...speedTime(0, 360, 0.9),
    createNode("add", "xPhase", { x: 800, y: 40 }),
    createNode("subtract", "yPhase", { x: 800, y: 200 }),
    createNode("sin", "sinX", { x: 1060, y: 40 }),
    createNode("sin", "sinY", { x: 1060, y: 200 }),
    createNode("multiply", "wave", { x: 1320, y: 100 }),
    createNode("float", "half", { x: 1320, y: 280 }, { value: 0.5 }),
    createNode("multiply", "signed", { x: 1560, y: 120 }),
    createNode("add", "shade", { x: 1800, y: 160 }),
    ...tail.nodes,
  ];
  const edges = [
    link("n1", "uv", "out", "split", "in"),
    link("n2", "split", "x", "xFreq", "a"),
    link("n3", "freq", "out", "xFreq", "b"),
    link("n4", "split", "y", "yFreq", "a"),
    link("n5", "freq", "out", "yFreq", "b"),
    ...speedEdges("n"),
    link("n6", "xFreq", "out", "xPhase", "a"),
    link("n7", "timeMul", "out", "xPhase", "b"),
    link("n8", "yFreq", "out", "yPhase", "a"),
    link("n9", "timeMul", "out", "yPhase", "b"),
    link("n10", "xPhase", "out", "sinX", "in"),
    link("n11", "yPhase", "out", "sinY", "in"),
    link("n12", "sinX", "out", "wave", "a"),
    link("n13", "sinY", "out", "wave", "b"),
    link("n14", "wave", "out", "signed", "a"),
    link("n15", "half", "out", "signed", "b"),
    link("n16", "signed", "out", "shade", "a"),
    link("n17", "half", "out", "shade", "b"),
    ...tail.edges,
  ];
  return { nodes, edges };
}

function createStripes() {
  const tail = surface({
    colorA: "#160a24",
    colorB: "#b9fff8",
    gain: 0.75,
    rough: 0.12,
    metal: 0.88,
    shade: "shade",
    x: 1500,
  });
  const nodes = [
    createNode("uv", "uv", { x: 0, y: 20 }),
    createNode("split", "split", { x: 250, y: 0 }),
    createNode("float", "freq", { x: 250, y: 180 }, { value: 18 }),
    createNode("float", "skew", { x: 250, y: 320 }, { value: 6 }),
    createNode("multiply", "yFreq", { x: 520, y: 20 }),
    createNode("multiply", "xSkew", { x: 520, y: 180 }),
    createNode("add", "slant", { x: 780, y: 80 }),
    ...speedTime(0, 420, 0.85),
    createNode("add", "phase", { x: 1040, y: 140 }),
    createNode("sin", "wave", { x: 1280, y: 140 }),
    createNode("float", "half", { x: 1280, y: 300 }, { value: 0.5 }),
    createNode("multiply", "signed", { x: 1520, y: 180 }),
    createNode("add", "shade", { x: 1760, y: 180 }),
    ...tail.nodes,
  ];
  const edges = [
    link("h1", "uv", "out", "split", "in"),
    link("h2", "split", "y", "yFreq", "a"),
    link("h3", "freq", "out", "yFreq", "b"),
    link("h4", "split", "x", "xSkew", "a"),
    link("h5", "skew", "out", "xSkew", "b"),
    link("h6", "yFreq", "out", "slant", "a"),
    link("h7", "xSkew", "out", "slant", "b"),
    ...speedEdges("h"),
    link("h8", "slant", "out", "phase", "a"),
    link("h9", "timeMul", "out", "phase", "b"),
    link("h10", "phase", "out", "wave", "in"),
    link("h11", "wave", "out", "signed", "a"),
    link("h12", "half", "out", "signed", "b"),
    link("h13", "signed", "out", "shade", "a"),
    link("h14", "half", "out", "shade", "b"),
    ...tail.edges,
  ];
  return { nodes, edges };
}

function createFourierPreset() {
  const tail = surface({
    colorA: "#07111f",
    colorB: "#7ee0ff",
    gain: 0.5,
    rough: 0.55,
    metal: 0.06,
    shade: "shade",
    x: 1760,
  });
  const nodes = [
    createNode("uv", "uv", { x: 0, y: 20 }),
    createNode("split", "split", { x: 250, y: 0 }),
    createNode("float", "space", { x: 250, y: 180 }, { value: 16 }),
    createNode("multiply", "spaceMul", { x: 520, y: 40 }),
    ...speedTime(0, 340, 0.7),
    createNode("add", "phase", { x: 800, y: 80 }),
    createNode("fourier", "fourier", { x: 1060, y: 60 }, {
      harmonics: 6,
      frequency: 1,
      falloff: 1,
      waveform: "square",
    }),
    createNode("float", "one", { x: 1060, y: 280 }, { value: 1 }),
    createNode("add", "lift", { x: 1320, y: 80 }),
    createNode("float", "half", { x: 1320, y: 260 }, { value: 0.5 }),
    createNode("multiply", "shade", { x: 1560, y: 120 }),
    ...tail.nodes,
  ];
  const edges = [
    link("f1", "uv", "out", "split", "in"),
    link("f2", "split", "x", "spaceMul", "a"),
    link("f3", "space", "out", "spaceMul", "b"),
    ...speedEdges("f"),
    link("f4", "spaceMul", "out", "phase", "a"),
    link("f5", "timeMul", "out", "phase", "b"),
    link("f6", "phase", "out", "fourier", "t"),
    link("f7", "fourier", "out", "lift", "a"),
    link("f8", "one", "out", "lift", "b"),
    link("f9", "lift", "out", "shade", "a"),
    link("f10", "half", "out", "shade", "b"),
    ...tail.edges,
  ];
  return { nodes, edges };
}

function createFormulaPreset() {
  const tail = surface({
    colorA: "#1a0530",
    colorB: "#ff4d8d",
    gain: 0.6,
    rough: 0.4,
    metal: 0.08,
    shade: "shade",
    x: 980,
  });
  const nodes = [
    ...speedTime(0, 40, 1),
    createNode("formula", "formula", { x: 520, y: 40 }, {
      expr: "sin(uv.x * 10.0 + time) * cos(uv.y * 8.0 - time)",
    }),
    createNode("float", "one", { x: 520, y: 240 }, { value: 1 }),
    createNode("add", "lift", { x: 780, y: 80 }),
    createNode("float", "half", { x: 780, y: 240 }, { value: 0.5 }),
    createNode("multiply", "shade", { x: 1040, y: 140 }),
    ...tail.nodes,
  ];
  const edges = [
    ...speedEdges("p"),
    link("p1", "timeMul", "out", "formula", "t"),
    link("p2", "formula", "out", "lift", "a"),
    link("p3", "one", "out", "lift", "b"),
    link("p4", "lift", "out", "shade", "a"),
    link("p5", "half", "out", "shade", "b"),
    ...tail.edges,
  ];
  return { nodes, edges };
}

function createAudioPreset() {
  const tail = surface({
    colorA: "#101018",
    colorB: "#ffb703",
    gain: 1.1,
    rough: 0.34,
    metal: 0.22,
    shade: "shade",
    x: 1280,
  });
  const nodes = [
    createNode("audio", "audio", { x: 0, y: 20 }),
    ...speedTime(0, 280, 0.8),
    createNode("sin", "pulse", { x: 520, y: 280 }),
    createNode("float", "half", { x: 520, y: 440 }, { value: 0.5 }),
    createNode("multiply", "signed", { x: 780, y: 300 }),
    createNode("add", "clock", { x: 1040, y: 280 }),
    createNode("add", "energy", { x: 780, y: 40 }),
    createNode("float", "zero", { x: 780, y: 180 }, { value: 0 }),
    createNode("float", "one", { x: 1040, y: 180 }, { value: 1 }),
    createNode("clamp", "shade", { x: 1300, y: 40 }),
    ...tail.nodes,
  ];
  const edges = [
    ...speedEdges("a"),
    link("a1", "timeMul", "out", "pulse", "in"),
    link("a2", "pulse", "out", "signed", "a"),
    link("a3", "half", "out", "signed", "b"),
    link("a4", "signed", "out", "clock", "a"),
    link("a5", "half", "out", "clock", "b"),
    link("a6", "audio", "bass", "energy", "a"),
    link("a7", "clock", "out", "energy", "b"),
    link("a8", "energy", "out", "shade", "value"),
    link("a9", "zero", "out", "shade", "min"),
    link("a10", "one", "out", "shade", "max"),
    ...tail.edges,
  ];
  return { nodes, edges };
}

function createCurvePreset() {
  const tail = surface({
    colorA: "#071018",
    colorB: "#f2d27a",
    gain: 0.4,
    rough: 0.46,
    metal: 0.1,
    shade: "curve",
    x: 1280,
  });
  const nodes = [
    createNode("uv", "uv", { x: 0, y: 20 }),
    createNode("split", "split", { x: 250, y: 0 }),
    ...speedTime(0, 240, 0.45),
    createNode("add", "scroll", { x: 560, y: 40 }),
    createNode("fract", "wrap", { x: 820, y: 40 }),
    createNode("curve", "curve", { x: 1080, y: 20 }, {
      points: [
        { x: 0, y: 0.02 },
        { x: 0.32, y: 0.08 },
        { x: 0.5, y: 0.95 },
        { x: 1, y: 0.55 },
      ],
    }),
    ...tail.nodes,
  ];
  const edges = [
    link("c1", "uv", "out", "split", "in"),
    ...speedEdges("c"),
    link("c2", "split", "x", "scroll", "a"),
    link("c3", "timeMul", "out", "scroll", "b"),
    link("c4", "scroll", "out", "wrap", "in"),
    link("c5", "wrap", "out", "curve", "t"),
    ...tail.edges,
  ];
  return { nodes, edges };
}

export const PRESETS = [
  {
    id: "iridescent",
    name: "Iridescent fresnel",
    blurb: "Rim light that crawls between colors",
    swatch: ["#1a1028", "#7ef6ff", "#ff4d9a"],
    build: createIridescent,
    tweaks: standardTweaks,
  },
  {
    id: "warp",
    name: "Domain-warp noise",
    blurb: "Noise pushed through itself",
    swatch: ["#07111c", "#f2b84b", "#fff4d2"],
    build: createWarp,
    tweaks: standardTweaks,
  },
  {
    id: "rings",
    name: "Pulsing rings",
    blurb: "Rings racing out from the center",
    swatch: ["#081018", "#9dff6a", "#eaffd4"],
    build: createRings,
    tweaks: standardTweaks,
  },
  {
    id: "interference",
    name: "Sine interference",
    blurb: "Two waves crossing on the surface",
    swatch: ["#120818", "#ffd36a", "#fff"],
    build: createInterference,
    tweaks: standardTweaks,
  },
  {
    id: "stripes",
    name: "Holographic stripes",
    blurb: "Slanted bands on a metal shell",
    swatch: ["#160a24", "#b9fff8", "#ff7ad9"],
    build: createStripes,
    tweaks: standardTweaks,
  },
  {
    id: "fourier",
    name: "Fourier bands",
    blurb: "Square series carved into the albedo",
    swatch: ["#07111f", "#7ee0ff", "#d8fbff"],
    build: createFourierPreset,
    tweaks: [
      ...standardTweaks,
      { id: "harmonics", label: "Harmonics", nodeId: "fourier", key: "harmonics", min: 1, max: 12, step: 1 },
    ],
  },
  {
    id: "formula",
    name: "Formula plasma",
    blurb: "sin and cos written as an expression",
    swatch: ["#1a0530", "#ff4d8d", "#ffd0e4"],
    build: createFormulaPreset,
    tweaks: standardTweaks,
  },
  {
    id: "audio",
    name: "Audio pulse",
    blurb: "Time plus bass, mid, and level",
    swatch: ["#101018", "#ffb703", "#fff1c2"],
    build: createAudioPreset,
    tweaks: standardTweaks,
  },
  {
    id: "curve",
    name: "Curve ramp",
    blurb: "A hand-drawn falloff scrolling by",
    swatch: ["#071018", "#f2d27a", "#fff6d8"],
    build: createCurvePreset,
    tweaks: standardTweaks,
  },
];

export const DEMOS = PRESETS.map((preset) => ({
  id: preset.id,
  label: preset.name,
  build: preset.build,
}));
