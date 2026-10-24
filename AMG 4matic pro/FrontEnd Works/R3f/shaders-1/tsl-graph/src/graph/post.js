export const DEFAULT_POST = {
  bloom: { enabled: false, strength: 0.85, radius: 0.45, threshold: 0.18 },
  fringe: { enabled: false, amount: 0.004, angle: 0 },
  grain: { enabled: false, intensity: 0.35 },
  grade: { enabled: false, contrast: 1.15, saturation: 1.25 },
};

function number(value, fallback) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

export function sanitizePost(post) {
  const source = post && typeof post === "object" ? post : {};
  return {
    bloom: {
      enabled: Boolean(source.bloom?.enabled),
      strength: number(source.bloom?.strength, DEFAULT_POST.bloom.strength),
      radius: number(source.bloom?.radius, DEFAULT_POST.bloom.radius),
      threshold: number(source.bloom?.threshold, DEFAULT_POST.bloom.threshold),
    },
    fringe: {
      enabled: Boolean(source.fringe?.enabled),
      amount: number(source.fringe?.amount, DEFAULT_POST.fringe.amount),
      angle: number(source.fringe?.angle, DEFAULT_POST.fringe.angle),
    },
    grain: {
      enabled: Boolean(source.grain?.enabled),
      intensity: number(source.grain?.intensity, DEFAULT_POST.grain.intensity),
    },
    grade: {
      enabled: Boolean(source.grade?.enabled),
      contrast: number(source.grade?.contrast, DEFAULT_POST.grade.contrast),
      saturation: number(source.grade?.saturation, DEFAULT_POST.grade.saturation),
    },
  };
}

export function emitPost(post) {
  const stack = sanitizePost(post);
  return `
import { bloom } from "three/examples/jsm/tsl/display/BloomNode.js";
import { film } from "three/examples/jsm/tsl/display/FilmNode.js";
import { rgbShift } from "three/examples/jsm/tsl/display/RGBShiftNode.js";

export function createPost(renderer, scene, camera) {
  const scenePass = pass(scene, camera);
  let color = scenePass.getTextureNode("output");
  if (${stack.bloom.enabled}) {
    const bloomPass = bloom(color, ${stack.bloom.strength}, ${stack.bloom.radius}, ${stack.bloom.threshold});
    color = color.add(bloomPass);
  }
  if (${stack.fringe.enabled}) {
    color = rgbShift(color, ${stack.fringe.amount}, ${stack.fringe.angle});
  }
  if (${stack.grain.enabled}) {
    color = film(color, float(${stack.grain.intensity}));
  }
  if (${stack.grade.enabled}) {
    const graded = saturation(mix(vec3(0.5), color.rgb, float(${stack.grade.contrast})), float(${stack.grade.saturation}));
    color = vec4(graded, color.a);
  }
  const postProcessing = new THREE.PostProcessing(renderer);
  postProcessing.outputNode = color;
  return postProcessing;
}
`;
}
