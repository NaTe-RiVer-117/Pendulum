import { CATALOG, INPUT_DEFAULTS, materialHint } from "./catalog.js";
import { emitFormula, parseFormula } from "./formula.js";
import { emitPost } from "./post.js";
import { emitScene } from "../scene/scene.js";
import { emitCurve, emitFourier } from "./series.js";
import { analyze, explainGraph } from "./types.js";

const BINARY_FN = {
  add: "add",
  subtract: "sub",
  multiply: "mul",
  divide: "div",
  min: "min",
  max: "max",
  power: "pow",
};

const UNARY_FN = {
  sin: "sin",
  abs: "abs",
  fract: "fract",
};

function finite(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function hexColor(value, fallback) {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

function varName(node) {
  const raw = `${node.data.kind}_${node.id}`.replace(/[^a-zA-Z0-9_]/g, "_");
  return `n_${raw}`;
}

function literalExpr(type, hint) {
  if (type === "float") return `float(${typeof hint === "number" ? hint : 0})`;
  if (type === "vec2") {
    const number = typeof hint === "number" ? hint : 0;
    return `vec2(${number}, ${number})`;
  }
  if (type === "vec3") {
    const number = typeof hint === "number" ? hint : 0;
    return `vec3(${number}, ${number}, ${number})`;
  }
  if (typeof hint === "string") return `color(${JSON.stringify(hexColor(hint, "#000000"))})`;
  const number = typeof hint === "number" ? hint : 0;
  return `vec3(${number}, ${number}, ${number})`;
}

function castExpr(expr, from, to) {
  if (!expr) return literalExpr(to, 0);
  if (from === to) return expr;
  if (from === "float" && to === "vec2") return `vec2(${expr})`;
  if (from === "float" && (to === "vec3" || to === "color")) return `vec3(${expr})`;
  return expr;
}

function reachableFrom(startId, edges) {
  const seen = new Set();
  const stack = [startId];
  while (stack.length) {
    const id = stack.pop();
    if (seen.has(id)) continue;
    seen.add(id);
    for (const edge of edges) {
      if (edge.target === id) stack.push(edge.source);
    }
  }
  return seen;
}

function orderNodes(ids, edges) {
  const incoming = new Map();
  const outgoing = new Map();
  for (const id of ids) {
    incoming.set(id, 0);
    outgoing.set(id, []);
  }
  for (const edge of edges) {
    if (!ids.has(edge.source) || !ids.has(edge.target)) continue;
    incoming.set(edge.target, incoming.get(edge.target) + 1);
    outgoing.get(edge.source).push(edge.target);
  }
  const queue = [...ids].filter((id) => incoming.get(id) === 0);
  const ordered = [];
  while (queue.length) {
    const id = queue.shift();
    ordered.push(id);
    for (const next of outgoing.get(id)) {
      incoming.set(next, incoming.get(next) - 1);
      if (incoming.get(next) === 0) queue.push(next);
    }
  }
  if (ordered.length !== ids.size) throw new Error("The graph has a cycle.");
  return ordered;
}

function checkerSource() {
  return `function checkerTexture() {
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
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.needsUpdate = true;
  return map;
}`;
}

export function exportGraph(nodes, edges, post, scene) {
  const problem = explainGraph(nodes, edges);
  if (problem) throw new Error(problem);
  const material = nodes.find((node) => node.data.kind === "material");
  if (!material) throw new Error("The graph needs a Material node.");

  const typing = analyze(nodes, edges);
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const incoming = new Map();
  for (const edge of edges) incoming.set(`${edge.target}:${edge.targetHandle}`, edge);
  const used = new Set(["float", "vec2", "vec3", "vec4", "color", "mix", "pass", "saturation"]);
  const lines = [];
  let needsChecker = false;
  let needsAudio = false;

  function sourceExpr(edge) {
    const node = nodeById.get(edge.source);
    const base = varName(node);
    if (node.data.kind === "split") return `${base}.${edge.sourceHandle}`;
    if (node.data.kind === "audio") {
      const outputs = { bass: "audioBass", mid: "audioMid", high: "audioHigh", level: "audioLevel" };
      return outputs[edge.sourceHandle];
    }
    if (node.data.kind === "texture") {
      return edge.sourceHandle === "a" ? `${base}.w` : `${base}.xyz`;
    }
    return base;
  }

  function inputExpr(node, handle, expected, hint) {
    const edge = incoming.get(`${node.id}:${handle}`);
    if (!edge) return literalExpr(expected, hint);
    const sourceNode = nodeById.get(edge.source);
    let from = typing.outputType(edge.source, edge.sourceHandle);
    if (sourceNode.data.kind === "split" && edge.sourceHandle === "z") {
      const inputEdge = incoming.get(`${sourceNode.id}:in`);
      const inputType = inputEdge
        ? typing.outputType(inputEdge.source, inputEdge.sourceHandle)
        : null;
      if (inputType !== "vec3" && inputType !== "color") return literalExpr("float", 0);
    }
    if (sourceNode.data.kind === "split" && edge.sourceHandle === "y") {
      const inputEdge = incoming.get(`${sourceNode.id}:in`);
      const inputType = inputEdge
        ? typing.outputType(inputEdge.source, inputEdge.sourceHandle)
        : null;
      if (inputType !== "vec2" && inputType !== "vec3" && inputType !== "color") {
        return literalExpr("float", 0);
      }
    }
    return castExpr(sourceExpr(edge), from, expected);
  }

  const ids = reachableFrom(material.id, edges);
  const ordered = orderNodes(ids, edges).filter((id) => id !== material.id);

  for (const id of ordered) {
    const node = nodeById.get(id);
    const kind = node.data.kind;
    const values = node.data.values ?? {};
    const name = varName(node);

    if (kind === "uv") {
      used.add("uv");
      lines.push(`  const ${name} = uv();`);
    } else if (kind === "position") {
      used.add("positionLocal");
      lines.push(`  const ${name} = positionLocal;`);
    } else if (kind === "normal") {
      used.add("normalLocal");
      lines.push(`  const ${name} = normalLocal;`);
    } else if (kind === "time") {
      used.add("time");
      lines.push(`  const ${name} = time;`);
    } else if (kind === "float") {
      lines.push(`  const ${name} = float(${finite(values.value, 0)});`);
    } else if (kind === "color") {
      lines.push(
        `  const ${name} = color(${JSON.stringify(hexColor(values.value, "#ffffff"))});`,
      );
    } else if (kind === "vec3") {
      lines.push(
        `  const ${name} = vec3(${finite(values.x, 0)}, ${finite(values.y, 0)}, ${finite(values.z, 0)});`,
      );
    } else if (kind === "combine") {
      lines.push(
        `  const ${name} = vec3(${inputExpr(node, "x", "float", 0)}, ${inputExpr(node, "y", "float", 0)}, ${inputExpr(node, "z", "float", 0)});`,
      );
    } else if (kind === "split") {
      const edge = incoming.get(`${node.id}:in`);
      lines.push(`  const ${name} = ${edge ? sourceExpr(edge) : "vec3(0.0, 0.0, 0.0)"};`);
    } else if (BINARY_FN[kind]) {
      const fn = BINARY_FN[kind];
      used.add(fn);
      const outType = typing.outputType(node.id, "out");
      const defaults = INPUT_DEFAULTS[kind] ?? {};
      const aHandle = kind === "power" ? "base" : "a";
      const bHandle = kind === "power" ? "exp" : "b";
      lines.push(
        `  const ${name} = ${fn}(${inputExpr(node, aHandle, outType, 0)}, ${inputExpr(node, bHandle, outType, defaults[bHandle] ?? 0)});`,
      );
    } else if (UNARY_FN[kind]) {
      const fn = UNARY_FN[kind];
      used.add(fn);
      const edge = incoming.get(`${node.id}:in`);
      lines.push(`  const ${name} = ${fn}(${edge ? sourceExpr(edge) : "float(0)"});`);
    } else if (kind === "clamp" || kind === "smoothstep") {
      used.add(kind);
      const outType = typing.outputType(node.id, "out");
      const defaults = INPUT_DEFAULTS[kind];
      if (kind === "clamp") {
        lines.push(
          `  const ${name} = clamp(${inputExpr(node, "value", outType, 0)}, ${inputExpr(node, "min", outType, defaults.min)}, ${inputExpr(node, "max", outType, defaults.max)});`,
        );
      } else {
        lines.push(
          `  const ${name} = smoothstep(${inputExpr(node, "edge0", outType, defaults.edge0)}, ${inputExpr(node, "edge1", outType, defaults.edge1)}, ${inputExpr(node, "x", outType, 0)});`,
        );
      }
    } else if (kind === "mix") {
      used.add("mix");
      const outType = typing.outputType(node.id, "out");
      const factorEdge = incoming.get(`${node.id}:t`);
      let factor = `float(${INPUT_DEFAULTS.mix.t})`;
      if (factorEdge) {
        const factorType = typing.outputType(factorEdge.source, factorEdge.sourceHandle);
        factor =
          factorType === "float"
            ? sourceExpr(factorEdge)
            : castExpr(sourceExpr(factorEdge), factorType, outType);
      }
      lines.push(
        `  const ${name} = mix(${inputExpr(node, "a", outType, 0)}, ${inputExpr(node, "b", outType, 0)}, ${factor});`,
      );
    } else if (kind === "noise") {
      used.add("mx_noise_float");
      used.add("uv");
      const edge = incoming.get(`${node.id}:p`);
      let coord = "uv()";
      if (edge) {
        const from = typing.outputType(edge.source, edge.sourceHandle);
        const expr = sourceExpr(edge);
        if (from === "vec2" || from === "vec3") coord = expr;
        else coord = `vec3(${expr})`;
      }
      lines.push(
        `  const ${name} = mx_noise_float(${coord}, ${finite(values.amplitude, 1)}, ${finite(values.pivot, 0)});`,
      );
    } else if (kind === "texture") {
      used.add("texture");
      const src = typeof values.src === "string" ? values.src : "";
      const mapName = `map_${name}`;
      if (!src) {
        needsChecker = true;
        lines.push(`  const ${mapName} = checkerTexture();`);
      } else {
        lines.push(
          `  const ${mapName} = new THREE.TextureLoader().load(${JSON.stringify(src)});`,
        );
        lines.push(`  ${mapName}.colorSpace = THREE.SRGBColorSpace;`);
        lines.push(`  ${mapName}.wrapS = THREE.RepeatWrapping;`);
        lines.push(`  ${mapName}.wrapT = THREE.RepeatWrapping;`);
      }
      const edge = incoming.get(`${node.id}:uv`);
      if (!edge) {
        lines.push(`  const ${name} = texture(${mapName});`);
      } else {
        const from = typing.outputType(edge.source, edge.sourceHandle);
        const expr = sourceExpr(edge);
        const uvExpr = from === "float" ? `vec2(${expr})` : expr;
        lines.push(`  const ${name} = texture(${mapName}, ${uvExpr});`);
      }
    } else if (kind === "fourier") {
      used.add("sin");
      used.add("add");
      used.add("mul");
      used.add("time");
      const edge = incoming.get(`${node.id}:t`);
      const sample =
        edge && typing.outputType(edge.source, edge.sourceHandle) === "float"
          ? sourceExpr(edge)
          : "time";
      lines.push(`  const ${name} = ${emitFourier(sample, values)};`);
    } else if (kind === "formula") {
      let emitted;
      const edge = incoming.get(`${node.id}:t`);
      const timeExpr =
        edge && typing.outputType(edge.source, edge.sourceHandle) === "float"
          ? sourceExpr(edge)
          : "time";
      try {
        emitted = emitFormula(parseFormula(values.expr), timeExpr);
      } catch (error) {
        throw new Error(error?.message || "Formula could not be parsed.");
      }
      emitted.used.forEach((symbol) => used.add(symbol));
      lines.push(`  // formula: ${String(values.expr ?? "").replace(/\s+/g, " ").slice(0, 180)}`);
      lines.push(`  const ${name} = ${emitted.code};`);
    } else if (kind === "curve") {
      used.add("mix");
      used.add("clamp");
      used.add("div");
      used.add("sub");
      used.add("step");
      const edge = incoming.get(`${node.id}:t`);
      const sample =
        edge && typing.outputType(edge.source, edge.sourceHandle) === "float"
          ? sourceExpr(edge)
          : "float(0)";
      lines.push(`  const ${name} = ${emitCurve(sample, values.points)};`);
    } else if (kind === "audio") {
      needsAudio = true;
      used.add("uniform");
    } else if (CATALOG[kind]) {
      throw new Error(`Cannot export ${kind}.`);
    }
  }

  const opacityEdge = incoming.get(`${material.id}:opacity`);
  lines.push("  const material = new THREE.MeshStandardNodeMaterial();");
  lines.push(
    `  material.colorNode = ${inputExpr(material, "color", "color", materialHint(material, "color"))};`,
  );
  lines.push(
    `  material.roughnessNode = ${inputExpr(material, "roughness", "float", materialHint(material, "roughness"))};`,
  );
  lines.push(
    `  material.metalnessNode = ${inputExpr(material, "metalness", "float", materialHint(material, "metalness"))};`,
  );
  lines.push(
    `  material.emissiveNode = ${inputExpr(material, "emissive", "color", materialHint(material, "emissive"))};`,
  );
  if (opacityEdge) {
    lines.push(
      `  material.opacityNode = ${inputExpr(material, "opacity", "float", materialHint(material, "opacity"))};`,
    );
    lines.push("  material.transparent = true;");
  }
  lines.push("  return material;");

  const imports = [
    "abs",
    "add",
    "ceil",
    "clamp",
    "color",
    "cos",
    "div",
    "float",
    "floor",
    "fract",
    "max",
    "min",
    "mix",
    "mul",
    "mx_noise_float",
    "normalLocal",
    "positionLocal",
    "pow",
    "sin",
    "smoothstep",
    "sqrt",
    "step",
    "sub",
    "tan",
    "texture",
    "time",
    "uniform",
    "uv",
    "vec2",
    "vec3",
    "vec4",
    "pass",
    "saturation",
  ].filter((name) => used.has(name));

  const helper = `${needsChecker ? `\n${checkerSource()}\n` : ""}${needsAudio ? `\n${audioSource()}\n` : ""}`;
  return `// Generated by tsl-graph. Recreates a MeshStandardNodeMaterial with three/tsl.
import * as THREE from "three/webgpu";
import {
  ${imports.join(",\n  ")},
} from "three/tsl";
${helper}
export function createMaterial() {
${lines.join("\n")}
}
${emitPost(post)}
${emitScene(scene)}`;
}

function audioSource() {
  return `const audioBass = uniform(0);
const audioMid = uniform(0);
const audioHigh = uniform(0);
const audioLevel = uniform(0);

export function createAudioDriver() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const context = new AudioContext();
  const analyser = context.createAnalyser();
  analyser.fftSize = 1024;
  const freq = new Uint8Array(analyser.frequencyBinCount);
  const silent = context.createGain();
  silent.gain.value = 0;
  analyser.connect(silent);
  silent.connect(context.destination);
  let tone = [];

  function band(lo, hi) {
    const nyquist = context.sampleRate / 2;
    const start = Math.max(0, Math.floor((lo / nyquist) * freq.length));
    const end = Math.min(freq.length, Math.max(start + 1, Math.ceil((hi / nyquist) * freq.length)));
    let total = 0;
    for (let index = start; index < end; index += 1) total += freq[index];
    return total / (end - start) / 255;
  }

  function update() {
    analyser.getByteFrequencyData(freq);
    audioBass.value = band(20, 150);
    audioMid.value = band(150, 2000);
    audioHigh.value = band(2000, context.sampleRate / 2);
    audioLevel.value = band(20, context.sampleRate / 2);
  }

  async function startMicrophone() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    context.createMediaStreamSource(stream).connect(analyser);
    await context.resume();
    return stream;
  }

  function startTestTone() {
    tone.forEach((node) => node.stop?.());
    const osc = context.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = 90;
    const lfo = context.createOscillator();
    lfo.frequency.value = 0.45;
    const sweep = context.createGain();
    sweep.gain.value = 1400;
    lfo.connect(sweep);
    sweep.connect(osc.frequency);
    const gain = context.createGain();
    gain.gain.value = 0.6;
    osc.connect(gain);
    gain.connect(analyser);
    osc.start();
    lfo.start();
    tone = [osc, lfo];
    context.resume();
  }

  return { update, startMicrophone, startTestTone };
}`;
}
