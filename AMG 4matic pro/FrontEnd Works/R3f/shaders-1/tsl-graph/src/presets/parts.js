import { createNode } from "../graph/catalog.js";

function link(id, source, sourceHandle, target, targetHandle) {
  return { id, source, sourceHandle, target, targetHandle };
}

function speedTime(x, y, speed) {
  return [
    createNode("time", "time", { x, y }),
    createNode("float", "speed", { x, y: y + 130 }, { value: speed }),
    createNode("multiply", "timeMul", { x: x + 240, y: y + 40 }),
  ];
}

function speedEdges(prefix) {
  return [
    link(`${prefix}t1`, "time", "out", "timeMul", "a"),
    link(`${prefix}t2`, "speed", "out", "timeMul", "b"),
  ];
}

function surface({ colorA, colorB, gain, rough, metal, shade, x = 1500, y = 40 }) {
  const nodes = [
    createNode("color", "colorA", { x, y }, { value: colorA }),
    createNode("color", "colorB", { x: x + 240, y }, { value: colorB }),
    createNode("mix", "mixColor", { x: x + 480, y: y + 20 }),
    createNode("float", "gain", { x: x + 480, y: y + 220 }, { value: gain }),
    createNode("multiply", "emit", { x: x + 740, y: y + 120 }),
    createNode("float", "rough", { x: x + 480, y: y + 360 }, { value: rough }),
    createNode("float", "metal", { x: x + 740, y: y + 320 }, { value: metal }),
    createNode("material", "material", { x: x + 980, y: y + 140 }),
  ];
  const edges = [
    link("s1", "colorA", "out", "mixColor", "a"),
    link("s2", "colorB", "out", "mixColor", "b"),
    link("s3", shade, "out", "mixColor", "t"),
    link("s4", "mixColor", "out", "emit", "a"),
    link("s5", "gain", "out", "emit", "b"),
    link("s6", "mixColor", "out", "material", "color"),
    link("s7", "rough", "out", "material", "roughness"),
    link("s8", "metal", "out", "material", "metalness"),
    link("s9", "emit", "out", "material", "emissive"),
  ];
  return { nodes, edges };
}

export { link, speedEdges, speedTime, surface };
