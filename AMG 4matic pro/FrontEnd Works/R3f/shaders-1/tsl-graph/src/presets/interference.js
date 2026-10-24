import { createNode } from "../graph/catalog.js";
import { link, speedEdges, speedTime, surface } from "./parts.js";

export const interference = {
  id: "interference",
  name: "Sine interference",
  description: "Two waves crossing on the surface",
  thumbnail: new URL("./thumbs/interference.png", import.meta.url).href,
  buildGraph,
};

function buildGraph() {
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
