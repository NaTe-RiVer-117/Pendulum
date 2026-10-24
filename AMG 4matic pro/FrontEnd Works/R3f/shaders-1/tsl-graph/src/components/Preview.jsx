import { Environment, OrbitControls } from "@react-three/drei";
import { Canvas, extend, useFrame, useThree } from "@react-three/fiber";
import { Component, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { bloom } from "three/examples/jsm/tsl/display/BloomNode.js";
import { film } from "three/examples/jsm/tsl/display/FilmNode.js";
import { rgbShift } from "three/examples/jsm/tsl/display/RGBShiftNode.js";
import { mix, pass, saturation, uniform, vec3, vec4 } from "three/tsl";
import * as THREE from "three/webgpu";
import { tickAudio } from "../audio/driver.js";
import { sanitizePost } from "../graph/post.js";
import { geometrySpec, sanitizeScene } from "../scene/scene.js";

extend({
  MeshStandardNodeMaterial: THREE.MeshStandardNodeMaterial,
});

class QuietBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error(error);
  }

  render() {
    if (this.state.error) return null;
    return this.props.children;
  }
}

function PostPass({ post }) {
  const { gl, scene, camera } = useThree();
  const chain = useRef(null);
  const settings = sanitizePost(post);
  const signature = [
    settings.bloom.enabled,
    settings.fringe.enabled,
    settings.grain.enabled,
    settings.grade.enabled,
  ].join("|");
  const live = useRef(settings);
  live.current = settings;

  useEffect(() => {
    const any =
      settings.bloom.enabled ||
      settings.fringe.enabled ||
      settings.grain.enabled ||
      settings.grade.enabled;
    if (!any) {
      chain.current = null;
      return undefined;
    }
    try {
      let color = pass(scene, camera).getTextureNode("output");
      const handles = {};
      if (settings.bloom.enabled) {
        const node = bloom(color, settings.bloom.strength, settings.bloom.radius, settings.bloom.threshold);
        handles.bloom = node;
        color = color.add(node);
      }
      if (settings.fringe.enabled) {
        const node = rgbShift(color, settings.fringe.amount, settings.fringe.angle);
        handles.fringe = node;
        color = node;
      }
      if (settings.grain.enabled) {
        const intensity = uniform(settings.grain.intensity);
        handles.grain = intensity;
        color = film(color, intensity);
      }
      if (settings.grade.enabled) {
        const contrast = uniform(settings.grade.contrast);
        const grade = uniform(settings.grade.saturation);
        handles.grade = { contrast, grade };
        const graded = saturation(mix(vec3(0.5), color.rgb, contrast), grade);
        color = vec4(graded, color.a);
      }
      const processing = new THREE.PostProcessing(gl);
      processing.outputNode = color;
      chain.current = { processing, handles };
      return () => {
        chain.current = null;
        processing.dispose();
      };
    } catch (error) {
      console.error(error);
      chain.current = null;
      return undefined;
    }
  }, [gl, scene, camera, signature]);

  useFrame(() => {
    const current = chain.current;
    const next = live.current;
    if (!current) {
      gl.render(scene, camera);
      return;
    }
    try {
      if (current.handles.bloom) {
        current.handles.bloom.strength.value = next.bloom.strength;
        current.handles.bloom.radius.value = next.bloom.radius;
        current.handles.bloom.threshold.value = next.bloom.threshold;
      }
      if (current.handles.fringe) {
        current.handles.fringe.amount.value = next.fringe.amount;
        current.handles.fringe.angle.value = next.fringe.angle;
      }
      if (current.handles.grain) current.handles.grain.value = next.grain.intensity;
      if (current.handles.grade) {
        current.handles.grade.contrast.value = next.grade.contrast;
        current.handles.grade.grade.value = next.grade.saturation;
      }
      current.processing.render();
    } catch (error) {
      console.error(error);
      chain.current = null;
    }
  }, 1);

  return null;
}

function FrameProbe({ onFrame }) {
  const sent = useRef(0);
  useFrame(() => {
    tickAudio();
    sent.current += 1;
    if (sent.current <= 3) onFrame(sent.current);
  });
  return null;
}

function Geometry({ object }) {
  const spec = geometrySpec(object);
  if (spec.element === "boxGeometry") return <boxGeometry args={spec.args} />;
  if (spec.element === "torusGeometry") return <torusGeometry args={spec.args} />;
  if (spec.element === "torusKnotGeometry") return <torusKnotGeometry args={spec.args} />;
  if (spec.element === "cylinderGeometry") return <cylinderGeometry args={spec.args} />;
  if (spec.element === "icosahedronGeometry") return <icosahedronGeometry args={spec.args} />;
  if (spec.element === "planeGeometry") return <planeGeometry args={spec.args} />;
  return <sphereGeometry args={spec.args} />;
}

function SceneLight({ light }) {
  if (light.type === "ambient") return <ambientLight color={light.color} intensity={light.intensity} />;
  if (light.type === "directional") {
    return <directionalLight color={light.color} intensity={light.intensity} position={light.position} />;
  }
  if (light.type === "spot") {
    return (
      <spotLight
        color={light.color}
        intensity={light.intensity}
        position={light.position}
        angle={0.6}
        penumbra={0.45}
      />
    );
  }
  return <pointLight color={light.color} intensity={light.intensity} position={light.position} distance={0} />;
}

function ViewRig({ fov }) {
  const camera = useThree((state) => state.camera);
  useLayoutEffect(() => {
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }, [camera, fov]);
  return null;
}

function PreviewMesh({ shown, shownKey, object }) {
  const rotation = object.rotation.map((degrees) => (degrees * Math.PI) / 180);
  return (
    <mesh position={object.position} rotation={rotation} scale={object.scale}>
      <Geometry object={object} />
      {shown ? (
        <meshStandardNodeMaterial
          key={shownKey}
          {...shown.slots}
          transparent={shown.transparent}
        />
      ) : (
        <meshStandardNodeMaterial color="#808080" roughness={0.5} />
      )}
    </mesh>
  );
}

export function Preview({ compiled, materialKey, scene, post, onStatus }) {
  const [frameloop, setFrameloop] = useState("never");
  const [backend, setBackend] = useState("starting");
  const [backendDetail, setBackendDetail] = useState("");
  const [frames, setFrames] = useState(0);
  const good = useRef(null);
  const goodKey = useRef(materialKey);
  const readyRef = useRef((kind, detail) => {
    setBackend(kind);
    setBackendDetail(detail || "");
    if (kind === "webgpu" || kind === "webgl") setFrameloop("always");
  });

  if (compiled.ok) {
    good.current = compiled.result;
    goodKey.current = materialKey;
  }

  const gl = useCallback((canvas) => {
    const renderer = new THREE.WebGPURenderer({
      canvas,
      powerPreference: "high-performance",
      antialias: true,
      alpha: false,
      stencil: false,
    });
    renderer
      .init()
      .then(() => {
        const webgpu = !!renderer.backend?.isWebGPUBackend;
        console.log("WebGPU?", webgpu);
        readyRef.current(webgpu ? "webgpu" : "webgl");
      })
      .catch((error) => {
        console.error(error);
        readyRef.current("error", error?.message || String(error));
      });
    return renderer;
  }, []);

  const view = sanitizeScene(scene);

  const status =
    backend === "starting"
      ? "Starting WebGPU…"
      : backend === "webgpu"
        ? "WebGPU"
        : backend === "webgl"
          ? "WebGL fallback"
          : backendDetail || "WebGPU init failed";

  useEffect(() => {
    onStatus?.(status);
  }, [onStatus, status]);

  return (
    <div
      className="preview"
      data-testid="preview-stage"
      data-material-key={goodKey.current}
      data-backend={backend}
      data-primitive={view.object.primitive}
    >
      <div className="frame-count" data-testid="frame-count">
        {frames}
      </div>
      <Canvas
        className="preview-canvas"
        camera={{ position: [2.6, 1.45, 3.5], fov: view.fov }}
        frameloop={frameloop}
        dpr={[1, 1.5]}
        gl={gl}
      >
        <color attach="background" args={[view.background]} />
        <ViewRig fov={view.fov} />
        {view.lights.map((light) => (
          <SceneLight key={light.id} light={light} />
        ))}
        <Suspense fallback={null}>
          <QuietBoundary>
            <Environment preset="sunset" environmentIntensity={view.environment} />
          </QuietBoundary>
        </Suspense>
        <PreviewMesh shown={good.current} shownKey={goodKey.current} object={view.object} />
        <mesh rotation-x={-Math.PI / 2} position={[0, -1.15, 0]}>
          <circleGeometry args={[4.2, 64]} />
          <meshStandardNodeMaterial color="#1a1d24" roughness={0.92} metalness={0.04} />
        </mesh>
        <FrameProbe onFrame={setFrames} />
        <PostPass post={post} />
        <OrbitControls enableDamping makeDefault />
      </Canvas>
    </div>
  );
}
