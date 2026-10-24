import { createNode } from "../graph/catalog.js";
import { link, speedEdges, speedTime, surface } from "./parts.js";

export const audio = {
  id: "audio",
  name: "Audio pulse",
  description: "A pulse driven by time and the low end",
  thumbnail: new URL("./thumbs/audio.png", import.meta.url).href,
  buildGraph,
};

function buildGraph() {
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
