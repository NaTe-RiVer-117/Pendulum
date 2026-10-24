export const DEFAULT_POST = {
  bloom: { present: true, enabled: false, strength: 0.85, radius: 0.45, threshold: 0.18 },
  fringe: { present: true, enabled: false, amount: 0.004, angle: 0 },
  grain: { present: true, enabled: false, intensity: 0.35 },
  grade: { present: true, enabled: false, contrast: 1.15, saturation: 1.25 },
};

function number(value, fallback) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function effect(block, defaults, fields) {
  if (block && block.present === false) return null;
  const source = block && typeof block === "object" ? block : defaults;
  const next = { present: true, enabled: Boolean(source.enabled) };
  for (const [key, fallback] of fields) next[key] = number(source[key], fallback);
  return next;
}

export function sanitizePost(post) {
  const source = post && typeof post === "object" ? post : {};
  return {
    bloom: effect(source.bloom, DEFAULT_POST.bloom, [
      ["strength", DEFAULT_POST.bloom.strength],
      ["radius", DEFAULT_POST.bloom.radius],
      ["threshold", DEFAULT_POST.bloom.threshold],
    ]),
    fringe: effect(source.fringe, DEFAULT_POST.fringe, [
      ["amount", DEFAULT_POST.fringe.amount],
      ["angle", DEFAULT_POST.fringe.angle],
    ]),
    grain: effect(source.grain, DEFAULT_POST.grain, [["intensity", DEFAULT_POST.grain.intensity]]),
    grade: effect(source.grade, DEFAULT_POST.grade, [
      ["contrast", DEFAULT_POST.grade.contrast],
      ["saturation", DEFAULT_POST.grade.saturation],
    ]),
  };
}

function live(effect) {
  return Boolean(effect && effect.present !== false && effect.enabled);
}

export function emitPost(post) {
  const stack = sanitizePost(post);
  const imports = [];
  const body = [];
  if (live(stack.bloom)) {
    imports.push(`import { bloom } from "three/examples/jsm/tsl/display/BloomNode.js";`);
    body.push(
      `  const bloomPass = bloom(color, ${stack.bloom.strength}, ${stack.bloom.radius}, ${stack.bloom.threshold});`,
    );
    body.push("  color = color.add(bloomPass);");
  }
  if (live(stack.fringe)) {
    imports.push(`import { rgbShift } from "three/examples/jsm/tsl/display/RGBShiftNode.js";`);
    body.push(`  color = rgbShift(color, ${stack.fringe.amount}, ${stack.fringe.angle});`);
  }
  if (live(stack.grain)) {
    imports.push(`import { film } from "three/examples/jsm/tsl/display/FilmNode.js";`);
    body.push(`  color = film(color, float(${stack.grain.intensity}));`);
  }
  if (live(stack.grade)) {
    body.push(
      `  const graded = saturation(mix(vec3(0.5), color.rgb, float(${stack.grade.contrast})), float(${stack.grade.saturation}));`,
    );
    body.push("  color = vec4(graded, color.a);");
  }
  return `
${imports.join("\n")}
export function createPost(renderer, scene, camera) {
  const scenePass = pass(scene, camera);
  let color = scenePass.getTextureNode("output");
${body.join("\n")}
  const postProcessing = new THREE.PostProcessing(renderer);
  postProcessing.outputNode = color;
  return postProcessing;
}
`;
}
