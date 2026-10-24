import { createNode } from "./catalog.js";

function link(id, source, sourceHandle, target, targetHandle) {
  return { id, source, sourceHandle, target, targetHandle };
}

export function createExampleGraph() {
  const nodes = [
    createNode("uv", "uv", { x: 0, y: 0 }),
    createNode("float", "scale", { x: 0, y: 130 }, { value: 3.2 }),
    createNode("multiply", "uvMul", { x: 240, y: 40 }),
    createNode("time", "time", { x: 0, y: 300 }),
    createNode("float", "speed", { x: 0, y: 430 }, { value: 0.45 }),
    createNode("multiply", "timeMul", { x: 240, y: 320 }),
    createNode("split", "split", { x: 480, y: 40 }),
    createNode("add", "addU", { x: 720, y: 0 }),
    createNode("float", "zero", { x: 480, y: 210 }, { value: 0 }),
    createNode("combine", "combine", { x: 720, y: 170 }),
    createNode("noise", "noise", { x: 960, y: 160 }, { amplitude: 1, pivot: 0 }),
    createNode("float", "edge0", { x: 960, y: 330 }, { value: -0.2 }),
    createNode("float", "edge1", { x: 960, y: 460 }, { value: 0.55 }),
    createNode("smoothstep", "mask", { x: 1200, y: 300 }),
    createNode("color", "colorA", { x: 1200, y: 0 }, { value: "#10243f" }),
    createNode("color", "colorB", { x: 1200, y: 130 }, { value: "#ff7a3c" }),
    createNode("mix", "mixColor", { x: 1440, y: 40 }),
    createNode("sin", "sinTime", { x: 480, y: 380 }),
    createNode("float", "half", { x: 720, y: 420 }, { value: 0.5 }),
    createNode("multiply", "signed", { x: 960, y: 580 }),
    createNode("add", "pulse", { x: 1200, y: 580 }),
    createNode("float", "gain", { x: 1440, y: 250 }, { value: 0.65 }),
    createNode("multiply", "emit1", { x: 1680, y: 160 }),
    createNode("multiply", "emit2", { x: 1920, y: 250 }),
    createNode("float", "roughLo", { x: 1440, y: 420 }, { value: 0.18 }),
    createNode("float", "roughHi", { x: 1440, y: 550 }, { value: 0.92 }),
    createNode("mix", "roughMix", { x: 1680, y: 460 }),
    createNode("float", "metal", { x: 1920, y: 460 }, { value: 0.82 }),
    createNode("material", "material", { x: 2160, y: 180 }),
  ];

  const edges = [
    link("e1", "uv", "out", "uvMul", "a"),
    link("e2", "scale", "out", "uvMul", "b"),
    link("e3", "time", "out", "timeMul", "a"),
    link("e4", "speed", "out", "timeMul", "b"),
    link("e5", "uvMul", "out", "split", "in"),
    link("e6", "split", "x", "addU", "a"),
    link("e7", "timeMul", "out", "addU", "b"),
    link("e8", "addU", "out", "combine", "x"),
    link("e9", "split", "y", "combine", "y"),
    link("e10", "zero", "out", "combine", "z"),
    link("e11", "combine", "out", "noise", "p"),
    link("e12", "edge0", "out", "mask", "edge0"),
    link("e13", "edge1", "out", "mask", "edge1"),
    link("e14", "noise", "out", "mask", "x"),
    link("e15", "colorA", "out", "mixColor", "a"),
    link("e16", "colorB", "out", "mixColor", "b"),
    link("e17", "mask", "out", "mixColor", "t"),
    link("e18", "time", "out", "sinTime", "in"),
    link("e19", "sinTime", "out", "signed", "a"),
    link("e20", "half", "out", "signed", "b"),
    link("e21", "signed", "out", "pulse", "a"),
    link("e22", "half", "out", "pulse", "b"),
    link("e23", "mixColor", "out", "emit1", "a"),
    link("e24", "pulse", "out", "emit1", "b"),
    link("e25", "emit1", "out", "emit2", "a"),
    link("e26", "gain", "out", "emit2", "b"),
    link("e27", "roughLo", "out", "roughMix", "a"),
    link("e28", "roughHi", "out", "roughMix", "b"),
    link("e29", "mask", "out", "roughMix", "t"),
    link("e30", "mixColor", "out", "material", "color"),
    link("e31", "roughMix", "out", "material", "roughness"),
    link("e32", "metal", "out", "material", "metalness"),
    link("e33", "emit2", "out", "material", "emissive"),
  ];

  return { nodes, edges };
}
