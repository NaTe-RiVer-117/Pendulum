import { Environment, OrbitControls } from "@react-three/drei";
import { Canvas, extend, useFrame } from "@react-three/fiber";
import { Component, Suspense, useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three/webgpu";
import { tickAudio } from "../audio/driver.js";

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

function FrameProbe({ onFrame }) {
  const sent = useRef(0);
  useFrame(() => {
    tickAudio();
    sent.current += 1;
    if (sent.current <= 3) onFrame(sent.current);
  });
  return null;
}

function Geometry({ primitive }) {
  if (primitive === "box") return <boxGeometry args={[1.5, 1.5, 1.5]} />;
  if (primitive === "torus") return <torusGeometry args={[0.7, 0.28, 48, 96]} />;
  if (primitive === "knot") return <torusKnotGeometry args={[0.62, 0.2, 128, 24]} />;
  return <sphereGeometry args={[1, 64, 64]} />;
}

function PreviewMesh({ shown, shownKey, primitive }) {
  return (
    <mesh>
      <Geometry primitive={primitive} />
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

export function Preview({ compiled, materialKey, primitive, onStatus }) {
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
    <div className="preview" data-testid="preview-stage" data-material-key={goodKey.current} data-backend={backend}>
      <div className="frame-count" data-testid="frame-count">
        {frames}
      </div>
      <Canvas
        className="preview-canvas"
        camera={{ position: [2.6, 1.45, 3.5], fov: 40 }}
        frameloop={frameloop}
        dpr={[1, 1.5]}
        gl={gl}
      >
        <color attach="background" args={["#07080a"]} />
        <ambientLight intensity={0.28} />
        <directionalLight position={[4.5, 6, 3]} intensity={2.6} />
        <directionalLight position={[-4, 1.6, -2]} intensity={0.55} color="#9ec5ff" />
        <Suspense fallback={null}>
          <QuietBoundary>
            <Environment preset="sunset" environmentIntensity={0.7} />
          </QuietBoundary>
        </Suspense>
        <PreviewMesh shown={good.current} shownKey={goodKey.current} primitive={primitive} />
        <mesh rotation-x={-Math.PI / 2} position={[0, -1.15, 0]}>
          <circleGeometry args={[4.2, 64]} />
          <meshStandardNodeMaterial color="#1a1d24" roughness={0.92} metalness={0.04} />
        </mesh>
        <FrameProbe onFrame={setFrames} />
        <OrbitControls enableDamping makeDefault />
      </Canvas>
    </div>
  );
}
