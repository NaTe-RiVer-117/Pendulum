import { createNode } from "../graph/catalog.js";
import { link, speedEdges, speedTime, surface } from "./parts.js";

export const curve = {
  id: "curve",
  name: "Curve ramp",
  description: "A drawn falloff scrolling across the mesh",
  thumbnail: new URL("./thumbs/curve.png", import.meta.url).href,
  buildGraph,
};

function buildGraph() {
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
