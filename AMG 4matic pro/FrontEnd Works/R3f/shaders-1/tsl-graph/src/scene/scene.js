const PRIMITIVES = ["sphere", "box", "torus", "knot", "cylinder", "icosahedron", "plane"];

export const DEFAULT_SCENE = {
  background: "#07080a",
  fov: 40,
  environment: 0.7,
  object: {
    primitive: "sphere",
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    widthSegments: 64,
    heightSegments: 32,
    depthSegments: 1,
    radialSegments: 48,
    tubularSegments: 128,
    detail: 0,
  },
  lights: [
    { id: "ambient", type: "ambient", color: "#ffffff", intensity: 0.28 },
    { id: "key", type: "directional", color: "#ffffff", intensity: 2.6, position: [4.5, 6, 3] },
    { id: "rim", type: "directional", color: "#9ec5ff", intensity: 0.55, position: [-4, 1.6, -2] },
  ],
};

function number(value, fallback) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function hex(value, fallback) {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

function vec3(value, fallback) {
  const source = Array.isArray(value) ? value : [];
  return [0, 1, 2].map((index) => number(source[index], fallback[index]));
}

function integer(value, fallback, min, max) {
  return Math.min(max, Math.max(min, Math.round(number(value, fallback))));
}

function sanitizeLight(light, index) {
  const type = ["ambient", "directional", "point", "spot"].includes(light?.type) ? light.type : "point";
  const next = {
    id: typeof light?.id === "string" && light.id ? light.id : `light-${index}`,
    type,
    color: hex(light?.color, "#ffffff"),
    intensity: number(light?.intensity, 1),
  };
  if (type !== "ambient") next.position = vec3(light?.position, [2, 2, 2]);
  return next;
}

export function sanitizeScene(scene) {
  const source = scene && typeof scene === "object" ? scene : {};
  const object = source.object && typeof source.object === "object" ? source.object : {};
  const primitive = PRIMITIVES.includes(object.primitive) ? object.primitive : DEFAULT_SCENE.object.primitive;
  const lights = Array.isArray(source.lights) ? source.lights.map(sanitizeLight) : DEFAULT_SCENE.lights.map((light) => ({ ...light, position: light.position ? light.position.slice() : undefined }));
  return {
    background: hex(source.background, DEFAULT_SCENE.background),
    fov: Math.min(90, Math.max(15, number(source.fov, DEFAULT_SCENE.fov))),
    environment: Math.min(3, Math.max(0, number(source.environment, DEFAULT_SCENE.environment))),
    object: {
      primitive,
      position: vec3(object.position, DEFAULT_SCENE.object.position),
      rotation: vec3(object.rotation, DEFAULT_SCENE.object.rotation),
      scale: vec3(object.scale, DEFAULT_SCENE.object.scale).map((value) => (value === 0 ? 0.05 : value)),
      widthSegments: integer(object.widthSegments, 64, 1, 128),
      heightSegments: integer(object.heightSegments, 32, 1, 64),
      depthSegments: integer(object.depthSegments, 1, 1, 32),
      radialSegments: integer(object.radialSegments, 48, 3, 128),
      tubularSegments: integer(object.tubularSegments, 128, 3, 256),
      detail: integer(object.detail, 0, 0, 4),
    },
    lights: lights.filter(Boolean),
  };
}

export function geometrySpec(object) {
  const item = sanitizeScene({ object }).object;
  if (item.primitive === "box") {
    return { element: "boxGeometry", ctor: "BoxGeometry", args: [1.5, 1.5, 1.5, item.widthSegments, item.heightSegments, item.depthSegments] };
  }
  if (item.primitive === "torus") {
    return { element: "torusGeometry", ctor: "TorusGeometry", args: [0.72, 0.26, item.radialSegments, item.tubularSegments] };
  }
  if (item.primitive === "knot") {
    return { element: "torusKnotGeometry", ctor: "TorusKnotGeometry", args: [0.62, 0.2, item.tubularSegments, item.radialSegments] };
  }
  if (item.primitive === "cylinder") {
    return { element: "cylinderGeometry", ctor: "CylinderGeometry", args: [0.6, 0.6, 1.4, item.radialSegments, item.heightSegments] };
  }
  if (item.primitive === "icosahedron") {
    return { element: "icosahedronGeometry", ctor: "IcosahedronGeometry", args: [1, item.detail] };
  }
  if (item.primitive === "plane") {
    return { element: "planeGeometry", ctor: "PlaneGeometry", args: [1.8, 1.8, item.widthSegments, item.heightSegments] };
  }
  return { element: "sphereGeometry", ctor: "SphereGeometry", args: [1, item.widthSegments, item.heightSegments] };
}

export function createLight(type) {
  const id = `${type}-${crypto.randomUUID().slice(0, 6)}`;
  if (type === "ambient") return { id, type, color: "#ffffff", intensity: 0.3 };
  if (type === "point") return { id, type, color: "#ff4422", intensity: 36, position: [1.3, 0.7, 1.5] };
  if (type === "spot") return { id, type, color: "#ffffff", intensity: 8, position: [1.6, 2.4, 1.4] };
  return { id, type: "directional", color: "#ffffff", intensity: 1.4, position: [3, 4, 2] };
}

function lightLine(light) {
  const color = JSON.stringify(light.color);
  if (light.type === "ambient") return `    new THREE.AmbientLight(${color}, ${light.intensity})`;
  const ctor = { directional: "DirectionalLight", point: "PointLight", spot: "SpotLight" }[light.type];
  const position = light.position.join(", ");
  return `    Object.assign(new THREE.${ctor}(${color}, ${light.intensity}), { position: new THREE.Vector3(${position}) })`;
}

export function emitScene(scene) {
  const next = sanitizeScene(scene);
  const spec = geometrySpec(next.object);
  const rotation = next.object.rotation.map((degrees) => (degrees * Math.PI) / 180);
  const lights = next.lights.map(lightLine).join(",\n");
  return `
export function createScene() {
  const geometry = new THREE.${spec.ctor}(${spec.args.join(", ")});
  const material = createMaterial();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(${next.object.position.join(", ")});
  mesh.rotation.set(${rotation.join(", ")});
  mesh.scale.set(${next.object.scale.join(", ")});
  const lights = [
${lights}
  ];
  return {
    background: ${JSON.stringify(next.background)},
    fov: ${next.fov},
    environment: ${next.environment},
    mesh,
    lights,
  };
}
`;
}
