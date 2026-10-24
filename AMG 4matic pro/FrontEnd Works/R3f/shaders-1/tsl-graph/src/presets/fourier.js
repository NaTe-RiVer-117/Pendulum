import { createNode } from "../graph/catalog.js";
import { link, speedEdges, speedTime, surface } from "./parts.js";

export const fourier = {
  id: "fourier",
  name: "Fourier bands",
  description: "A square series carved across the surface",
  thumbnail: new URL("./thumbs/fourier.png", import.meta.url).href,
  buildGraph,
};

function buildGraph() {
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
