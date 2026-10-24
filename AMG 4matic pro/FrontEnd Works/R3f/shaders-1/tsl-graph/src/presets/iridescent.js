import { createNode } from "../graph/catalog.js";
import { link, speedEdges, speedTime, surface } from "./parts.js";

export const iridescent = {
  id: "iridescent",
  name: "Iridescent fresnel",
  description: "Rim light that crawls between colors",
  thumbnail: new URL("./thumbs/iridescent.png", import.meta.url).href,
  buildGraph,
};

function buildGraph() {
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
