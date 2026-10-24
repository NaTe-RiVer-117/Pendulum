import { createNode } from "../graph/catalog.js";
import { link, speedEdges, speedTime, surface } from "./parts.js";

export const formula = {
  id: "formula",
  name: "Formula plasma",
  description: "Sine and cosine written as an expression",
  thumbnail: new URL("./thumbs/formula.png", import.meta.url).href,
  buildGraph,
};

function buildGraph() {
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
