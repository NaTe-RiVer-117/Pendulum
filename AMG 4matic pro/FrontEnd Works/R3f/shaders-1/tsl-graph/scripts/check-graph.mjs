import { createNode } from "../src/graph/catalog.js";
import { createExampleGraph } from "../src/graph/exampleGraph.js";
import { exportGraph } from "../src/graph/exportCode.js";
import { sanitizeGraph } from "../src/graph/storage.js";
import { explainGraph, mergeTypes, validateConnection } from "../src/graph/types.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const example = createExampleGraph();
assert(explainGraph(example.nodes, example.edges) === null, "example graph should type-check");

const code = exportGraph(example.nodes, example.edges);
assert(code.includes('from "three/tsl"'), "export should import three/tsl");
assert(code.includes("MeshStandardNodeMaterial"), "export should create a standard node material");
assert(code.includes("mx_noise_float"), "export should call mx_noise_float");
assert(code.includes("smoothstep("), "export should include smoothstep");
assert(code.includes("sin("), "export should include sin");
assert(code.includes('color("#ff7a3c")'), "export should include the example color");
assert(!code.includes("eval("), "export must not eval");
assert(code.includes("export function createMaterial()"), "export should declare createMaterial");

assert(mergeTypes("float", "vec3") === "vec3", "float should promote into vec3");
assert(mergeTypes("float", "color") === "color", "float should promote into color");
assert(mergeTypes("vec2", "vec3") === null, "vec2 and vec3 should not merge");

const position = createNode("position", "position", { x: 0, y: 0 });
const material = createNode("material", "material", { x: 200, y: 0 });
const floatNode = createNode("float", "floatA", { x: 0, y: 80 }, { value: 0.25 });
const uv = createNode("uv", "uvA", { x: 0, y: 160 });
const bad = validateConnection([position, material], [], {
  source: "position",
  sourceHandle: "out",
  target: "material",
  targetHandle: "roughness",
});
assert(bad.ok === false, `vec3 to float should be refused, got ${bad.reason}`);
assert(bad.reason.includes("float"), bad.reason);

const promoted = validateConnection([floatNode, material], [], {
  source: "floatA",
  sourceHandle: "out",
  target: "material",
  targetHandle: "color",
});
assert(promoted.ok === true, promoted.reason || "float should promote into the color socket");

const vecMismatch = validateConnection([uv, material], [], {
  source: "uvA",
  sourceHandle: "out",
  target: "material",
  targetHandle: "color",
});
assert(vecMismatch.ok === false, "vec2 should not connect to color");

const loopA = createNode("add", "addA", { x: 0, y: 0 });
const loopB = createNode("add", "addB", { x: 200, y: 0 });
const first = {
  id: "loop1",
  source: "addA",
  sourceHandle: "out",
  target: "addB",
  targetHandle: "a",
};
const cycle = validateConnection([loopA, loopB], [first], {
  source: "addB",
  sourceHandle: "out",
  target: "addA",
  targetHandle: "a",
});
assert(cycle.ok === false, "cycles should be refused");

const dirty = sanitizeGraph({
  nodes: example.nodes,
  edges: [
    ...example.edges,
    {
      id: "bad",
      source: "uv",
      sourceHandle: "out",
      target: "material",
      targetHandle: "roughness",
    },
  ],
});
assert(dirty, "sanitize should keep a valid graph");
assert(!dirty.edges.some((edge) => edge.id === "bad"), "sanitize should drop a bad edge");

const tsl = await import("three/tsl");
for (const name of [
  "uv",
  "positionLocal",
  "normalLocal",
  "time",
  "float",
  "color",
  "vec2",
  "vec3",
  "add",
  "sub",
  "mul",
  "div",
  "mix",
  "clamp",
  "smoothstep",
  "sin",
  "abs",
  "pow",
  "fract",
  "min",
  "max",
  "mx_noise_float",
  "texture",
]) {
  assert(tsl[name] !== undefined, `three/tsl is missing ${name}`);
}

console.log("graph checks passed");
console.log(code.split("\n").slice(0, 12).join("\n"));
