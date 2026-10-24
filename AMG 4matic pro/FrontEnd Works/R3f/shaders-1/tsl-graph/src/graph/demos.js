import { createNode } from "./catalog.js";
import { createExampleGraph } from "./exampleGraph.js";

function link(id, source, sourceHandle, target, targetHandle) {
  return { id, source, sourceHandle, target, targetHandle };
}

function createFourierDemo() {
  const nodes = [
    createNode("uv", "uv", { x: 40, y: 40 }),
    createNode("split", "split", { x: 280, y: 40 }),
    createNode("float", "space", { x: 280, y: 200 }, { value: 18 }),
    createNode("multiply", "spaceMul", { x: 520, y: 80 }),
    createNode("time", "time", { x: 40, y: 280 }),
    createNode("add", "phase", { x: 760, y: 140 }),
    createNode("fourier", "fourier", { x: 1000, y: 120 }, {
      harmonics: 5,
      frequency: 1,
      falloff: 1,
      waveform: "square",
    }),
    createNode("float", "one", { x: 1000, y: 360 }, { value: 1 }),
    createNode("add", "lift", { x: 1240, y: 180 }),
    createNode("float", "half", { x: 1240, y: 360 }, { value: 0.5 }),
    createNode("multiply", "shade", { x: 1480, y: 220 }),
    createNode("color", "colorA", { x: 1240, y: 0 }, { value: "#07111f" }),
    createNode("color", "colorB", { x: 1480, y: 0 }, { value: "#7ee0ff" }),
    createNode("mix", "mixColor", { x: 1720, y: 80 }),
    createNode("float", "gain", { x: 1720, y: 280 }, { value: 0.45 }),
    createNode("multiply", "emit", { x: 1960, y: 180 }),
    createNode("float", "rough", { x: 1720, y: 420 }, { value: 0.62 }),
    createNode("float", "metal", { x: 1960, y: 360 }, { value: 0.04 }),
    createNode("material", "material", { x: 2200, y: 140 }),
  ];
  const edges = [
    link("f1", "uv", "out", "split", "in"),
    link("f2", "split", "x", "spaceMul", "a"),
    link("f3", "space", "out", "spaceMul", "b"),
    link("f4", "spaceMul", "out", "phase", "a"),
    link("f5", "time", "out", "phase", "b"),
    link("f6", "phase", "out", "fourier", "t"),
    link("f7", "fourier", "out", "lift", "a"),
    link("f8", "one", "out", "lift", "b"),
    link("f9", "lift", "out", "shade", "a"),
    link("f10", "half", "out", "shade", "b"),
    link("f11", "colorA", "out", "mixColor", "a"),
    link("f12", "colorB", "out", "mixColor", "b"),
    link("f13", "shade", "out", "mixColor", "t"),
    link("f14", "mixColor", "out", "emit", "a"),
    link("f15", "gain", "out", "emit", "b"),
    link("f16", "mixColor", "out", "material", "color"),
    link("f17", "rough", "out", "material", "roughness"),
    link("f18", "metal", "out", "material", "metalness"),
    link("f19", "emit", "out", "material", "emissive"),
  ];
  return { nodes, edges };
}

function createFormulaDemo() {
  const nodes = [
    createNode("formula", "formula", { x: 80, y: 80 }, {
      expr: "sin(uv.x * 10.0 + time) * cos(uv.y * 8.0 - time)",
    }),
    createNode("float", "one", { x: 360, y: 40 }, { value: 1 }),
    createNode("add", "lift", { x: 360, y: 180 }),
    createNode("float", "half", { x: 360, y: 340 }, { value: 0.5 }),
    createNode("multiply", "shade", { x: 620, y: 220 }),
    createNode("color", "colorA", { x: 620, y: 0 }, { value: "#1a0530" }),
    createNode("color", "colorB", { x: 860, y: 0 }, { value: "#ff4d8d" }),
    createNode("mix", "mixColor", { x: 1100, y: 80 }),
    createNode("float", "gain", { x: 1100, y: 280 }, { value: 0.55 }),
    createNode("multiply", "emit", { x: 1340, y: 180 }),
    createNode("float", "rough", { x: 860, y: 280 }, { value: 0.42 }),
    createNode("float", "metal", { x: 860, y: 420 }, { value: 0.08 }),
    createNode("material", "material", { x: 1580, y: 140 }),
  ];
  const edges = [
    link("p1", "formula", "out", "lift", "a"),
    link("p2", "one", "out", "lift", "b"),
    link("p3", "lift", "out", "shade", "a"),
    link("p4", "half", "out", "shade", "b"),
    link("p5", "colorA", "out", "mixColor", "a"),
    link("p6", "colorB", "out", "mixColor", "b"),
    link("p7", "shade", "out", "mixColor", "t"),
    link("p8", "mixColor", "out", "emit", "a"),
    link("p9", "gain", "out", "emit", "b"),
    link("p10", "mixColor", "out", "material", "color"),
    link("p11", "rough", "out", "material", "roughness"),
    link("p12", "metal", "out", "material", "metalness"),
    link("p13", "emit", "out", "material", "emissive"),
  ];
  return { nodes, edges };
}

function createAudioDemo() {
  const nodes = [
    createNode("audio", "audio", { x: 40, y: 80 }),
    createNode("color", "colorA", { x: 360, y: 0 }, { value: "#101018" }),
    createNode("color", "colorB", { x: 360, y: 150 }, { value: "#ffb703" }),
    createNode("mix", "mixColor", { x: 640, y: 40 }),
    createNode("float", "roughLo", { x: 360, y: 320 }, { value: 0.18 }),
    createNode("float", "roughHi", { x: 360, y: 460 }, { value: 0.92 }),
    createNode("mix", "roughMix", { x: 640, y: 320 }),
    createNode("multiply", "emit", { x: 900, y: 220 }),
    createNode("material", "material", { x: 1160, y: 160 }),
  ];
  const edges = [
    link("a1", "colorA", "out", "mixColor", "a"),
    link("a2", "colorB", "out", "mixColor", "b"),
    link("a3", "audio", "bass", "mixColor", "t"),
    link("a4", "roughLo", "out", "roughMix", "a"),
    link("a5", "roughHi", "out", "roughMix", "b"),
    link("a6", "audio", "mid", "roughMix", "t"),
    link("a7", "mixColor", "out", "emit", "a"),
    link("a8", "audio", "level", "emit", "b"),
    link("a9", "audio", "high", "material", "metalness"),
    link("a10", "mixColor", "out", "material", "color"),
    link("a11", "roughMix", "out", "material", "roughness"),
    link("a12", "emit", "out", "material", "emissive"),
  ];
  return { nodes, edges };
}

function createCurveDemo() {
  const nodes = [
    createNode("uv", "uv", { x: 40, y: 40 }),
    createNode("split", "split", { x: 280, y: 20 }),
    createNode("time", "time", { x: 40, y: 240 }),
    createNode("add", "scroll", { x: 520, y: 80 }),
    createNode("fract", "wrap", { x: 760, y: 80 }),
    createNode("curve", "curve", { x: 1000, y: 60 }, {
      points: [
        { x: 0, y: 0.05 },
        { x: 0.28, y: 0.08 },
        { x: 0.48, y: 0.92 },
        { x: 1, y: 0.7 },
      ],
    }),
    createNode("color", "colorA", { x: 760, y: 260 }, { value: "#071018" }),
    createNode("color", "colorB", { x: 1000, y: 280 }, { value: "#f2d27a" }),
    createNode("mix", "mixColor", { x: 1280, y: 120 }),
    createNode("float", "rough", { x: 1280, y: 320 }, { value: 0.48 }),
    createNode("float", "metal", { x: 1280, y: 450 }, { value: 0.12 }),
    createNode("float", "gain", { x: 1520, y: 280 }, { value: 0.35 }),
    createNode("multiply", "emit", { x: 1520, y: 140 }),
    createNode("material", "material", { x: 1760, y: 160 }),
  ];
  const edges = [
    link("c1", "uv", "out", "split", "in"),
    link("c2", "split", "x", "scroll", "a"),
    link("c3", "time", "out", "scroll", "b"),
    link("c4", "scroll", "out", "wrap", "in"),
    link("c5", "wrap", "out", "curve", "t"),
    link("c6", "colorA", "out", "mixColor", "a"),
    link("c7", "colorB", "out", "mixColor", "b"),
    link("c8", "curve", "out", "mixColor", "t"),
    link("c9", "mixColor", "out", "emit", "a"),
    link("c10", "gain", "out", "emit", "b"),
    link("c11", "mixColor", "out", "material", "color"),
    link("c12", "rough", "out", "material", "roughness"),
    link("c13", "metal", "out", "material", "metalness"),
    link("c14", "emit", "out", "material", "emissive"),
  ];
  return { nodes, edges };
}

export const DEMOS = [
  { id: "starter", label: "Starter", build: createExampleGraph },
  { id: "fourier", label: "Fourier pattern", build: createFourierDemo },
  { id: "formula", label: "Formula plasma", build: createFormulaDemo },
  { id: "audio", label: "Audio reactive", build: createAudioDemo },
  { id: "curve", label: "Curve ramp", build: createCurveDemo },
];
