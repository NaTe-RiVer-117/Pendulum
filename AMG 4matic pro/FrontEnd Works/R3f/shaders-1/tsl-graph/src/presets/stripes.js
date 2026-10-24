import { createNode } from "../graph/catalog.js";
import { link, speedEdges, speedTime, surface } from "./parts.js";

export const stripes = {
  id: "stripes",
  name: "Holographic stripes",
  description: "Slanted bands on a metal shell",
  thumbnail: new URL("./thumbs/stripes.png", import.meta.url).href,
  buildGraph,
};

function buildGraph() {
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
