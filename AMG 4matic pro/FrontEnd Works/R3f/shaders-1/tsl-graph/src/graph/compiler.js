import * as THREE from "three/webgpu";
import {
  abs as tslAbs,
  add as tslAdd,
  clamp as tslClamp,
  color as tslColor,
  div as tslDiv,
  float as tslFloat,
  ceil as tslCeil,
  cos as tslCos,
  floor as tslFloor,
  fract as tslFract,
  max as tslMax,
  min as tslMin,
  mix as tslMix,
  mul as tslMul,
  mx_noise_float,
  normalLocal,
  positionLocal,
  pow as tslPow,
  sin as tslSin,
  smoothstep as tslSmoothstep,
  sqrt as tslSqrt,
  step as tslStep,
  sub as tslSub,
  tan as tslTan,
  texture as tslTexture,
  time as tslTime,
  uv as tslUv,
  vec2 as tslVec2,
  vec3 as tslVec3,
} from "three/tsl";
import { audioUniforms } from "../audio/driver.js";
import { INPUT_DEFAULTS } from "./catalog.js";
import { compileFormula, parseFormula } from "./formula.js";
import { compileCurve, compileFourier } from "./series.js";
import { analyze, explainGraph } from "./types.js";

const textureCache = new Map();

function finite(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function hexColor(value, fallback) {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

function checkerTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      context.fillStyle = (x + y) % 2 === 0 ? "#d7d7d7" : "#2b2b2b";
      context.fillRect(x * 8, y * 8, 8, 8);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

function textureFor(src) {
  const key = src || "__checker__";
  const cached = textureCache.get(key);
  if (cached) return cached;
  if (!src) {
    const texture = checkerTexture();
    textureCache.set(key, texture);
    return texture;
  }
  const image = new Image();
  const texture = new THREE.Texture(image);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  image.onload = () => {
    texture.needsUpdate = true;
  };
  image.src = src;
  textureCache.set(key, texture);
  return texture;
}

function literal(type, hint) {
  if (type === "float") return tslFloat(typeof hint === "number" ? hint : 0);
  if (type === "vec2") {
    const number = typeof hint === "number" ? hint : 0;
    return tslVec2(number, number);
  }
  if (type === "vec3") {
    const number = typeof hint === "number" ? hint : 0;
    return tslVec3(number, number, number);
  }
  if (typeof hint === "string") return tslColor(hint);
  const number = typeof hint === "number" ? hint : 0;
  return tslVec3(number, number, number);
}

function cast(part, expected) {
  if (!part) return literal(expected, 0);
  if (part.type === expected) return part.value;
  if (part.type === "float" && expected === "vec2") return tslVec2(part.value);
  if (part.type === "float" && (expected === "vec3" || expected === "color")) {
    return tslVec3(part.value);
  }
  if (
    (part.type === "vec3" && expected === "color") ||
    (part.type === "color" && expected === "vec3")
  ) {
    return part.value;
  }
  return part.value;
}

const BINARY_FN = {
  add: tslAdd,
  subtract: tslSub,
  multiply: tslMul,
  divide: tslDiv,
  min: tslMin,
  max: tslMax,
  power: tslPow,
};

const UNARY_FN = {
  sin: tslSin,
  abs: tslAbs,
  fract: tslFract,
};

export function compileGraph(nodes, edges) {
  const problem = explainGraph(nodes, edges);
  if (problem) throw new Error(problem);

  const material = nodes.find((node) => node.data.kind === "material");
  if (!material) throw new Error("The graph needs a Material node.");

  const typing = analyze(nodes, edges);
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const incoming = new Map();
  for (const edge of edges) incoming.set(`${edge.target}:${edge.targetHandle}`, edge);

  const memo = new Map();
  const visiting = new Set();

  function compileNode(nodeId) {
    if (memo.has(nodeId)) return memo.get(nodeId);
    if (visiting.has(nodeId)) throw new Error("The graph has a cycle.");
    visiting.add(nodeId);
    const node = nodeById.get(nodeId);
    if (!node) throw new Error("The graph points at a missing node.");
    const outputs = build(node);
    visiting.delete(nodeId);
    memo.set(nodeId, outputs);
    return outputs;
  }

  function readInput(node, handle) {
    const edge = incoming.get(`${node.id}:${handle}`);
    if (!edge) return null;
    const outputs = compileNode(edge.source);
    const part = outputs[edge.sourceHandle];
    if (!part) throw new Error(`Missing output ${edge.sourceHandle}.`);
    return part;
  }

  function take(node, handle, expected, hint) {
    const part = readInput(node, handle);
    if (!part) return literal(expected, hint);
    return cast(part, expected);
  }

  function build(node) {
    const kind = node.data.kind;
    const values = node.data.values ?? {};

    if (kind === "uv") return { out: { value: tslUv(), type: "vec2" } };
    if (kind === "position") return { out: { value: positionLocal, type: "vec3" } };
    if (kind === "normal") return { out: { value: normalLocal, type: "vec3" } };
    if (kind === "time") return { out: { value: tslTime, type: "float" } };
    if (kind === "float") {
      return { out: { value: tslFloat(finite(values.value, 0)), type: "float" } };
    }
    if (kind === "color") {
      return {
        out: { value: tslColor(hexColor(values.value, "#ffffff")), type: "color" },
      };
    }
    if (kind === "vec3") {
      return {
        out: {
          value: tslVec3(finite(values.x, 0), finite(values.y, 0), finite(values.z, 0)),
          type: "vec3",
        },
      };
    }
    if (kind === "combine") {
      return {
        out: {
          value: tslVec3(
            take(node, "x", "float", 0),
            take(node, "y", "float", 0),
            take(node, "z", "float", 0),
          ),
          type: "vec3",
        },
      };
    }
    if (kind === "split") {
      const part = readInput(node, "in");
      const source = part?.value;
      const type = part?.type;
      const component = (axis, allowed) => {
        if (!source || !allowed) return { value: tslFloat(0), type: "float" };
        return { value: source[axis], type: "float" };
      };
      const hasZ = type === "vec3" || type === "color";
      const hasY = type === "vec2" || hasZ;
      return {
        x: component("x", Boolean(source)),
        y: component("y", hasY),
        z: component("z", hasZ),
      };
    }
    if (BINARY_FN[kind]) {
      const outType = typing.outputType(node.id, "out");
      const defaults = INPUT_DEFAULTS[kind] ?? {};
      const fn = BINARY_FN[kind];
      const aHandle = kind === "power" ? "base" : "a";
      const bHandle = kind === "power" ? "exp" : "b";
      return {
        out: {
          value: fn(
            take(node, aHandle, outType, 0),
            take(node, bHandle, outType, defaults[bHandle] ?? 0),
          ),
          type: outType,
        },
      };
    }
    if (UNARY_FN[kind]) {
      const part = readInput(node, "in");
      const type = part?.type || "float";
      return {
        out: {
          value: UNARY_FN[kind](part ? part.value : tslFloat(0)),
          type,
        },
      };
    }
    if (kind === "clamp" || kind === "smoothstep") {
      const outType = typing.outputType(node.id, "out");
      const defaults = INPUT_DEFAULTS[kind];
      if (kind === "clamp") {
        return {
          out: {
            value: tslClamp(
              take(node, "value", outType, 0),
              take(node, "min", outType, defaults.min),
              take(node, "max", outType, defaults.max),
            ),
            type: outType,
          },
        };
      }
      return {
        out: {
          value: tslSmoothstep(
            take(node, "edge0", outType, defaults.edge0),
            take(node, "edge1", outType, defaults.edge1),
            take(node, "x", outType, 0),
          ),
          type: outType,
        },
      };
    }
    if (kind === "mix") {
      const outType = typing.outputType(node.id, "out");
      const factor = readInput(node, "t");
      let factorNode = tslFloat(INPUT_DEFAULTS.mix.t);
      if (factor?.type === "float") factorNode = factor.value;
      else if (factor) factorNode = cast(factor, outType);
      return {
        out: {
          value: tslMix(
            take(node, "a", outType, 0),
            take(node, "b", outType, 0),
            factorNode,
          ),
          type: outType,
        },
      };
    }
    if (kind === "noise") {
      const part = readInput(node, "p");
      let coord = tslUv();
      if (part?.type === "vec2" || part?.type === "vec3") coord = part.value;
      else if (part?.type === "float" || part?.type === "color") coord = tslVec3(part.value);
      return {
        out: {
          value: mx_noise_float(coord, finite(values.amplitude, 1), finite(values.pivot, 0)),
          type: "float",
        },
      };
    }
    if (kind === "texture") {
      const part = readInput(node, "uv");
      const map = textureFor(typeof values.src === "string" ? values.src : "");
      const sample = part
        ? tslTexture(map, part.type === "float" ? tslVec2(part.value) : part.value)
        : tslTexture(map);
      return {
        rgb: { value: sample.xyz, type: "color" },
        a: { value: sample.w, type: "float" },
      };
    }
    if (kind === "fourier") {
      const part = readInput(node, "t");
      const sample = part?.type === "float" ? part.value : tslTime;
      return {
        out: {
          value: compileFourier(sample, values, {
            add: tslAdd,
            mul: tslMul,
            sin: tslSin,
            float: tslFloat,
          }),
          type: "float",
        },
      };
    }
    if (kind === "formula") {
      let ast;
      try {
        ast = parseFormula(values.expr);
      } catch (error) {
        throw new Error(error?.message || "Formula could not be parsed.");
      }
      const part = readInput(node, "t");
      const timeNode = part?.type === "float" ? part.value : tslTime;
      return {
        out: {
          value: compileFormula(ast, {
            float: tslFloat,
            time: timeNode,
            uv: tslUv,
            add: tslAdd,
            sub: tslSub,
            mul: tslMul,
            div: tslDiv,
            sin: tslSin,
            cos: tslCos,
            tan: tslTan,
            abs: tslAbs,
            min: tslMin,
            max: tslMax,
            pow: tslPow,
            sqrt: tslSqrt,
            fract: tslFract,
            mix: tslMix,
            floor: tslFloor,
            ceil: tslCeil,
          }),
          type: "float",
        },
      };
    }
    if (kind === "curve") {
      const part = readInput(node, "t");
      const sample = part?.type === "float" ? part.value : tslFloat(0);
      return {
        out: {
          value: compileCurve(sample, values.points, {
            add: tslAdd,
            sub: tslSub,
            mul: tslMul,
            div: tslDiv,
            mix: tslMix,
            clamp: tslClamp,
            step: tslStep,
            float: tslFloat,
          }),
          type: "float",
        },
      };
    }
    if (kind === "audio") {
      const uniforms = audioUniforms();
      return {
        bass: { value: uniforms.bass, type: "float" },
        mid: { value: uniforms.mid, type: "float" },
        high: { value: uniforms.high, type: "float" },
        level: { value: uniforms.level, type: "float" },
      };
    }
    if (kind === "material") {
      const defaults = INPUT_DEFAULTS.material;
      const opacityEdge = incoming.get(`${node.id}:opacity`);
      return {
        slots: {
          colorNode: take(node, "color", "color", defaults.color),
          roughnessNode: take(node, "roughness", "float", defaults.roughness),
          metalnessNode: take(node, "metalness", "float", defaults.metalness),
          emissiveNode: take(node, "emissive", "color", defaults.emissive),
          ...(opacityEdge
            ? { opacityNode: take(node, "opacity", "float", defaults.opacity) }
            : {}),
        },
        transparent: Boolean(opacityEdge),
      };
    }

    throw new Error(`Cannot compile ${kind}.`);
  }

  const built = compileNode(material.id);
  return built;
}
