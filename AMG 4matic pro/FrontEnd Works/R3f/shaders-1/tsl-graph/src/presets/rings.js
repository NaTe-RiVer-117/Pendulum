import { createNode } from "../graph/catalog.js";
import { link, speedEdges, speedTime, surface } from "./parts.js";

export const rings = {
  id: "rings",
  name: "Pulsing rings",
  description: "Rings racing out from the center",
  thumbnail: new URL("./thumbs/rings.png", import.meta.url).href,
  buildGraph,
};

function buildGraph() {
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
