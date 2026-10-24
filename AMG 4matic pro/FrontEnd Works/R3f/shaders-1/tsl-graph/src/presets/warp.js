import { createNode } from "../graph/catalog.js";
import { link, speedEdges, speedTime, surface } from "./parts.js";

export const warp = {
  id: "warp",
  name: "Domain-warp noise",
  description: "Noise pushed through itself",
  thumbnail: new URL("./thumbs/warp.png", import.meta.url).href,
  buildGraph,
};

function buildGraph() {
  const tail = surface({
    colorA: "#07111c",
    colorB: "#f2b84b",
    gain: 0.45,
    rough: 0.48,
    metal: 0.08,
    shade: "mask",
    x: 1880,
  });
  const nodes = [
    createNode("uv", "uv", { x: 0, y: 40 }),
    createNode("float", "scale", { x: 0, y: 180 }, { value: 3.2 }),
    createNode("multiply", "uvMul", { x: 260, y: 60 }),
    ...speedTime(0, 340, 0.35),
    createNode("split", "split", { x: 520, y: 40 }),
    createNode("add", "scroll", { x: 780, y: 40 }),
    createNode("float", "zero", { x: 520, y: 220 }, { value: 0 }),
    createNode("combine", "coord", { x: 1040, y: 80 }),
    createNode("noise", "warpNoise", { x: 1300, y: 40 }, { amplitude: 1, pivot: 0 }),
    createNode("float", "warpAmt", { x: 1300, y: 240 }, { value: 1.35 }),
    createNode("multiply", "warpMul", { x: 1560, y: 80 }),
    createNode("add", "warped", { x: 1560, y: 240 }),
    createNode("combine", "coord2", { x: 1820, y: 200 }),
    createNode("noise", "detail", { x: 2080, y: 160 }, { amplitude: 1, pivot: 0 }),
    createNode("float", "edge0", { x: 2080, y: 360 }, { value: -0.2 }),
    createNode("float", "edge1", { x: 2080, y: 490 }, { value: 0.62 }),
    createNode("smoothstep", "mask", { x: 2340, y: 240 }),
    ...tail.nodes,
  ];
  const edges = [
    link("w1", "uv", "out", "uvMul", "a"),
    link("w2", "scale", "out", "uvMul", "b"),
    ...speedEdges("w"),
    link("w3", "uvMul", "out", "split", "in"),
    link("w4", "split", "x", "scroll", "a"),
    link("w5", "timeMul", "out", "scroll", "b"),
    link("w6", "scroll", "out", "coord", "x"),
    link("w7", "split", "y", "coord", "y"),
    link("w8", "zero", "out", "coord", "z"),
    link("w9", "coord", "out", "warpNoise", "p"),
    link("w10", "warpNoise", "out", "warpMul", "a"),
    link("w11", "warpAmt", "out", "warpMul", "b"),
    link("w12", "scroll", "out", "warped", "a"),
    link("w13", "warpMul", "out", "warped", "b"),
    link("w14", "warped", "out", "coord2", "x"),
    link("w15", "split", "y", "coord2", "y"),
    link("w16", "zero", "out", "coord2", "z"),
    link("w17", "coord2", "out", "detail", "p"),
    link("w18", "edge0", "out", "mask", "edge0"),
    link("w19", "edge1", "out", "mask", "edge1"),
    link("w20", "detail", "out", "mask", "x"),
    ...tail.edges,
  ];
  return { nodes, edges };
}
