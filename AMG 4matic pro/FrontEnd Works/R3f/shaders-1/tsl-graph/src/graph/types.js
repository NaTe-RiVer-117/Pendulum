import { CATALOG } from "./catalog.js";

export const VALUE_TYPES = ["float", "vec2", "vec3", "color"];

export const TYPE_COLOR = {
  float: "#7dcea0",
  vec2: "#5dade2",
  vec3: "#f0c14d",
  color: "#e98bd0",
  error: "#e06c6c",
};

const BINARY = new Set([
  "add",
  "subtract",
  "multiply",
  "divide",
  "min",
  "max",
  "power",
]);

const UNARY = new Set(["sin", "abs", "fract"]);

const BINARY_INPUTS = {
  add: ["a", "b"],
  subtract: ["a", "b"],
  multiply: ["a", "b"],
  divide: ["a", "b"],
  min: ["a", "b"],
  max: ["a", "b"],
  power: ["base", "exp"],
};

function isRgb(type) {
  return type === "vec3" || type === "color";
}

function canPromoteFloatTo(type) {
  return type === "vec2" || type === "vec3" || type === "color";
}

export function mergeTypes(a, b) {
  if (a === "error" || b === "error") return null;
  if (!a) return b || null;
  if (!b) return a;
  if (a === b) return a;
  if (a === "float" && canPromoteFloatTo(b)) return b;
  if (b === "float" && canPromoteFloatTo(a)) return a;
  if (isRgb(a) && isRgb(b)) return a === "color" || b === "color" ? "color" : "vec3";
  return null;
}

export function canFeed(sourceType, expected) {
  if (!sourceType || sourceType === "error" || !expected) return false;
  if (sourceType === expected) return true;
  if (sourceType === "float" && canPromoteFloatTo(expected)) return true;
  if (isRgb(sourceType) && isRgb(expected)) return true;
  return false;
}

function factorOk(factorType, valueType) {
  if (!factorType) return true;
  if (factorType === "float") return true;
  if (!valueType) return VALUE_TYPES.includes(factorType);
  return factorType === valueType || (isRgb(factorType) && isRgb(valueType));
}

function reducePresent(types) {
  const present = types.filter(Boolean);
  let acc = null;
  for (const type of present) {
    const next = mergeTypes(acc, type);
    if (acc && !next) return { ok: false, left: acc, right: type };
    acc = next;
  }
  return { ok: true, type: acc };
}

export function analyze(nodes, edges) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const incoming = new Map();
  for (const edge of edges) {
    incoming.set(`${edge.target}:${edge.targetHandle}`, edge);
  }

  const memo = new Map();
  const visiting = new Set();

  function outputType(nodeId, handle) {
    const key = `${nodeId}:${handle}`;
    if (memo.has(key)) return memo.get(key);
    if (visiting.has(key)) return "error";
    visiting.add(key);
    const type = compute(nodeId, handle);
    visiting.delete(key);
    memo.set(key, type);
    return type;
  }

  function connectedType(nodeId, handle) {
    const edge = incoming.get(`${nodeId}:${handle}`);
    if (!edge) return null;
    return outputType(edge.source, edge.sourceHandle);
  }

  function compute(nodeId, handle) {
    const node = nodeById.get(nodeId);
    if (!node) return "error";
    const kind = node.data?.kind;
    if (!CATALOG[kind]) return "error";

    if (kind === "float" || kind === "time") return "float";
    if (kind === "uv") return "vec2";
    if (kind === "position" || kind === "normal" || kind === "vec3" || kind === "combine") {
      return "vec3";
    }
    if (kind === "color") return "color";
    if (kind === "split") return "float";
    if (kind === "noise" || kind === "fourier" || kind === "formula" || kind === "curve") {
      return "float";
    }
    if (kind === "audio") return "float";
    if (kind === "texture") return handle === "a" ? "float" : "color";
    if (kind === "material") return "error";
    if (UNARY.has(kind)) return connectedType(nodeId, "in") || "float";
    if (BINARY.has(kind)) {
      const merged = BINARY_INPUTS[kind]
        .map((id) => connectedType(nodeId, id))
        .reduce((left, right) => mergeTypes(left, right), null);
      return merged || "float";
    }
    if (kind === "clamp") {
      const merged = ["value", "min", "max"]
        .map((id) => connectedType(nodeId, id))
        .reduce((left, right) => mergeTypes(left, right), null);
      return merged || "float";
    }
    if (kind === "smoothstep") {
      const merged = ["edge0", "edge1", "x"]
        .map((id) => connectedType(nodeId, id))
        .reduce((left, right) => mergeTypes(left, right), null);
      return merged || "float";
    }
    if (kind === "mix") {
      return mergeTypes(connectedType(nodeId, "a"), connectedType(nodeId, "b")) || "float";
    }
    return "error";
  }

  return { outputType, connectedType, nodeById };
}

function reaches(fromId, toId, edges) {
  const outgoing = new Map();
  for (const edge of edges) {
    const list = outgoing.get(edge.source);
    if (list) list.push(edge.target);
    else outgoing.set(edge.source, [edge.target]);
  }
  const stack = [fromId];
  const seen = new Set();
  while (stack.length) {
    const id = stack.pop();
    if (id === toId) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    const next = outgoing.get(id);
    if (next) stack.push(...next);
  }
  return false;
}

function mismatch(sourceType, targetLabel) {
  if (sourceType === "vec3" && targetLabel === "float") {
    return "vec3 cannot connect to float. Split it into components first.";
  }
  if (sourceType === "vec2" && (targetLabel === "vec3" || targetLabel === "color")) {
    return `${sourceType} cannot connect to ${targetLabel}. Combine or split components first.`;
  }
  return `${sourceType} cannot connect to ${targetLabel}.`;
}

function inputTypeError(kind, inputId, typeOf) {
  const sourceType = typeOf(inputId);
  if (!sourceType || sourceType === "error") return "That socket has no usable type.";

  if (kind === "material") {
    const expected = inputId === "color" || inputId === "emissive" ? "color" : "float";
    return canFeed(sourceType, expected) ? null : mismatch(sourceType, expected);
  }

  if (kind === "combine") {
    return sourceType === "float" ? null : "Combine takes separate floats.";
  }

  if (kind === "split") {
    return sourceType === "vec2" || sourceType === "vec3" || sourceType === "color"
      ? null
      : "Split needs a vec2, vec3, or color.";
  }

  if (kind === "noise") {
    return sourceType === "float" ||
      sourceType === "vec2" ||
      sourceType === "vec3" ||
      sourceType === "color"
      ? null
      : "Noise position needs a float, vec2, or vec3.";
  }

  if (kind === "texture") {
    return sourceType === "vec2" || sourceType === "float"
      ? null
      : "Texture UV needs a vec2. A float can promote into it.";
  }

  if (kind === "fourier" || kind === "curve") {
    return sourceType === "float" ? null : "This input needs a float.";
  }

  if (UNARY.has(kind)) {
    return VALUE_TYPES.includes(sourceType) ? null : `${sourceType} cannot connect here.`;
  }

  if (BINARY.has(kind) || kind === "clamp" || kind === "smoothstep") {
    const ids =
      kind === "clamp"
        ? ["value", "min", "max"]
        : kind === "smoothstep"
          ? ["edge0", "edge1", "x"]
          : BINARY_INPUTS[kind];
    const result = reducePresent(ids.map((id) => typeOf(id)));
    if (!result.ok) {
      return `${result.left} cannot combine with ${result.right}. A float can promote into vec2, vec3, or color.`;
    }
    return null;
  }

  if (kind === "mix") {
    const value = mergeTypes(typeOf("a"), typeOf("b"));
    if (typeOf("a") && typeOf("b") && !value) {
      return `${typeOf("a")} cannot combine with ${typeOf("b")}. A float can promote into vec2, vec3, or color.`;
    }
    const factor = typeOf("t");
    if (factor && value && !factorOk(factor, value)) {
      return `Mix factor ${factor} does not match ${value}. A float can promote.`;
    }
    return null;
  }

  return "Unknown socket.";
}

export function validateConnection(nodes, edges, connection) {
  const { source, target, sourceHandle, targetHandle } = connection ?? {};
  if (!source || !target || !sourceHandle || !targetHandle) {
    return { ok: false, reason: "Incomplete connection." };
  }

  const sourceNode = nodes.find((node) => node.id === source);
  const targetNode = nodes.find((node) => node.id === target);
  if (!sourceNode || !targetNode) return { ok: false, reason: "Missing node." };

  const sourceDef = CATALOG[sourceNode.data?.kind];
  const targetDef = CATALOG[targetNode.data?.kind];
  if (!sourceDef?.outputs.some((socket) => socket.id === sourceHandle)) {
    return { ok: false, reason: "Unknown output." };
  }
  if (!targetDef?.inputs.some((socket) => socket.id === targetHandle)) {
    return { ok: false, reason: "Unknown input." };
  }

  const base = edges.filter(
    (edge) => !(edge.target === target && edge.targetHandle === targetHandle),
  );
  if (source === target || reaches(target, source, base)) {
    return { ok: false, reason: "That connection would create a cycle." };
  }

  const typing = analyze(nodes, base);
  const sourceType = typing.outputType(source, sourceHandle);

  function typeOf(inputId) {
    if (inputId === targetHandle) return sourceType;
    const edge = base.find(
      (item) => item.target === target && item.targetHandle === inputId,
    );
    if (!edge) return null;
    return typing.outputType(edge.source, edge.sourceHandle);
  }

  const reason = inputTypeError(targetNode.data.kind, targetHandle, typeOf);
  if (reason) return { ok: false, reason, sourceType };
  return { ok: true, sourceType };
}

export function explainGraph(nodes, edges) {
  for (const edge of edges) {
    const result = validateConnection(nodes, edges, edge);
    if (!result.ok) return result.reason;
  }
  return null;
}

export function socketColor(type) {
  return TYPE_COLOR[type] || TYPE_COLOR.error;
}
