import { ReactFlowProvider, useEdgesState, useNodesState, useReactFlow } from "@xyflow/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ensureShaderMotion } from "./audio/driver.js";
import { CommandPalette } from "./components/CommandPalette.jsx";
import { GraphCanvas } from "./components/GraphCanvas.jsx";
import { Inspector } from "./components/Inspector.jsx";
import { Preview } from "./components/Preview.jsx";
import { Tutorial, tutorialSeen } from "./components/Tutorial.jsx";
import { createNode } from "./graph/catalog.js";
import { compileGraph } from "./graph/compiler.js";
import { createExampleGraph } from "./graph/exampleGraph.js";
import { exportGraph } from "./graph/exportCode.js";
import { loadGraph, saveGraph } from "./graph/storage.js";
import { PRESETS } from "./presets/index.js";

function hashString(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function presetControls(nodes) {
  const has = (id) => nodes.some((node) => node.id === id);
  const controls = [];
  if (has("speed")) {
    controls.push({ id: "speed", label: "Speed", nodeId: "speed", key: "value", min: 0, max: 3, step: 0.01 });
  }
  if (has("colorA")) {
    controls.push({ id: "colorA", label: "Color A", nodeId: "colorA", key: "value", control: "color" });
  }
  if (has("colorB")) {
    controls.push({ id: "colorB", label: "Color B", nodeId: "colorB", key: "value", control: "color" });
  }
  if (has("gain")) {
    controls.push({ id: "intensity", label: "Intensity", nodeId: "gain", key: "value", min: 0, max: 2, step: 0.01 });
  }
  if (has("fourier")) {
    controls.push({
      id: "harmonics",
      label: "Harmonics",
      nodeId: "fourier",
      key: "harmonics",
      min: 1,
      max: 12,
      step: 1,
    });
  }
  return controls;
}

function Shell() {
  const initial = useMemo(() => loadGraph(), []);
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const [primitive, setPrimitive] = useState("sphere");
  const [notice, setNotice] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const [exportText, setExportText] = useState("");
  const [exportSignal, setExportSignal] = useState(0);
  const [tweakSignal, setTweakSignal] = useState(0);
  const [fitToken, setFitToken] = useState(0);
  const [commandOpen, setCommandOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(() => !tutorialSeen());
  const [tutorialSession, setTutorialSession] = useState(0);
  const [activePreset, setActivePreset] = useState(null);
  const [tab, setTab] = useState("presets");
  const [menuOpen, setMenuOpen] = useState(false);
  const [graphOpens, setGraphOpens] = useState(0);
  const [backendLabel, setBackendLabel] = useState("Starting WebGPU…");
  const { screenToFlowPosition } = useReactFlow();
  const preset = PRESETS.find((item) => item.id === activePreset) ?? null;
  const controls = presetControls(nodes);
  const onStatus = useCallback((label) => setBackendLabel(label), []);

  useEffect(() => {
    const result = saveGraph({ nodes, edges });
    if (!result.ok) setNotice(result.error);
  }, [nodes, edges]);

  const hasAudio = nodes.some((node) => node.data.kind === "audio");
  useEffect(() => {
    if (hasAudio) ensureShaderMotion();
  }, [hasAudio]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    function onPointer(event) {
      if (!event.target.closest?.(".quiet")) setMenuOpen(false);
    }
    window.addEventListener("pointerdown", onPointer);
    return () => window.removeEventListener("pointerdown", onPointer);
  }, [menuOpen]);

  useEffect(() => {
    function onKey(event) {
      const target = event.target;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s" && event.shiftKey) {
        event.preventDefault();
        downloadExport();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "enter" && !typing) {
        event.preventDefault();
        copyExport();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const signature = useMemo(
    () =>
      JSON.stringify({
        nodes: nodes.map((node) => ({
          id: node.id,
          kind: node.data.kind,
          values: node.data.values,
        })),
        edges: edges.map((edge) => [
          edge.source,
          edge.sourceHandle,
          edge.target,
          edge.targetHandle,
        ]),
      }),
    [nodes, edges],
  );

  const compiled = useMemo(() => {
    try {
      return { ok: true, result: compileGraph(nodes, edges) };
    } catch (error) {
      console.error(error);
      return { ok: false, error: error?.message || String(error) };
    }
  }, [signature]);

  const materialKey = hashString(signature);
  const selected = nodes.filter((node) => node.selected);
  const onNotice = useCallback((message) => setNotice(message), []);

  function updateValue(id, key, value) {
    setTweakSignal((signal) => signal + 1);
    setNodes((current) =>
      current.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, values: { ...node.data.values, [key]: value } } }
          : node,
      ),
    );
  }

  function deleteNode(id) {
    setNodes((current) => current.filter((node) => node.id !== id || node.data.kind === "material"));
    setEdges((current) => current.filter((edge) => edge.source !== id && edge.target !== id));
  }

  function addKind(kind) {
    const pane = document.querySelector("[data-testid='graph']");
    const rect = pane?.getBoundingClientRect();
    const position = screenToFlowPosition({
      x: (rect?.left ?? 80) + (rect?.width ?? 600) * 0.45,
      y: (rect?.top ?? 80) + (rect?.height ?? 400) * 0.42,
    });
    position.x += Math.round((Math.random() - 0.5) * 36);
    position.y += Math.round((Math.random() - 0.5) * 36);
    const id = `${kind}-${crypto.randomUUID().slice(0, 8)}`;
    setNodes((current) => current.concat(createNode(kind, id, position)));
    showGraph();
    setNotice(`${kind} added.`);
  }

  function loadGraphState(next, presetId = null) {
    setNodes(next.nodes);
    setEdges(next.edges);
    setActivePreset(presetId);
    setFitToken((token) => token + 1);
    setExportOpen(false);
    setNotice("");
  }

  function loadPreset(nextPreset) {
    loadGraphState(nextPreset.buildGraph(), nextPreset.id);
  }

  function showGraph() {
    setTab("graph");
    setMenuOpen(false);
    setGraphOpens((count) => count + 1);
    setFitToken((token) => token + 1);
  }

  function openTutorial() {
    setMenuOpen(false);
    setTutorialSession((session) => session + 1);
    setTutorialOpen(true);
    setTab("presets");
  }

  async function copyExport() {
    setMenuOpen(false);
    try {
      const code = exportGraph(nodes, edges);
      setExportText(code);
      setExportOpen(true);
      setExportSignal((value) => value + 1);
      try {
        await navigator.clipboard.writeText(code);
        setNotice("Export copied.");
      } catch {
        setNotice("Export is ready.");
      }
    } catch (error) {
      setNotice(error?.message || "Export failed.");
    }
  }

  function downloadExport() {
    setMenuOpen(false);
    try {
      const code = exportGraph(nodes, edges);
      const blob = new Blob([code], { type: "text/javascript" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "material.js";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      setExportText(code);
      setExportOpen(true);
      setExportSignal((value) => value + 1);
      setNotice("Downloaded material.js.");
    } catch (error) {
      setNotice(error?.message || "Download failed.");
    }
  }

  return (
    <div className="app">
      <section className="stage">
        <Preview
          compiled={compiled}
          materialKey={materialKey}
          primitive={primitive}
          onStatus={onStatus}
        />
        <div className="caption">
          <h1 data-testid="preset-name">{preset ? preset.name : "Shader"}</h1>
          <div className="caption-meta">
            <span data-testid="preview-status">{backendLabel}</span>
            <label>
              Mesh
              <select
                data-testid="primitive"
                value={primitive}
                onChange={(event) => setPrimitive(event.target.value)}
              >
                <option value="sphere">Sphere</option>
                <option value="box">Box</option>
                <option value="torus">Torus</option>
                <option value="knot">Torus knot</option>
              </select>
            </label>
          </div>
        </div>
      </section>
      <aside className="side" data-tab={tab}>
        <header className="side-head">
          <div className="switch" role="tablist">
            <button
              type="button"
              role="tab"
              data-testid="panel-presets"
              className={tab === "presets" ? "active" : ""}
              aria-selected={tab === "presets"}
              onClick={() => setTab("presets")}
            >
              Presets
            </button>
            <button
              type="button"
              role="tab"
              data-testid="panel-graph"
              className={tab === "graph" ? "active" : ""}
              aria-selected={tab === "graph"}
              onClick={showGraph}
            >
              Graph
            </button>
          </div>
          <div className="quiet">
            <button
              type="button"
              data-testid="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              Export
            </button>
            {menuOpen && (
              <div className="quiet-menu" role="menu">
                <button type="button" data-testid="export" onClick={copyExport}>
                  Copy export
                </button>
                <button type="button" data-testid="download" onClick={downloadExport}>
                  Download material.js
                </button>
                <button type="button" data-testid="tutorial-open" onClick={openTutorial}>
                  Tutorial
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setCommandOpen(true);
                  }}
                >
                  Add node
                </button>
              </div>
            )}
          </div>
        </header>
        {notice && (
          <p className="note" data-testid="notice">
            {notice}
          </p>
        )}
        {!compiled.ok && (
          <p className="note warn" data-testid="compile-error">
            {compiled.error}
          </p>
        )}
        {tutorialOpen && (
          <Tutorial
            key={tutorialSession}
            activePreset={activePreset}
            tweakSignal={tweakSignal}
            graphOpens={graphOpens}
            exportSignal={exportSignal}
            onClose={() => setTutorialOpen(false)}
          />
        )}
        {tab === "presets" ? (
          <div className="preset-pane" data-testid="presets">
            {preset ? (
              <div className="tweaks" data-testid="tweaks">
                {controls.map((control) => {
                  const node = nodes.find((item) => item.id === control.nodeId);
                  const value = node?.data?.values?.[control.key];
                  if (control.control === "color") {
                    const color = typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#ffffff";
                    return (
                      <label key={control.id}>
                        {control.label}
                        <input
                          type="color"
                          data-testid={`tweak-${control.id}`}
                          value={color}
                          onChange={(event) => updateValue(control.nodeId, control.key, event.target.value)}
                        />
                      </label>
                    );
                  }
                  const number = Number(value);
                  return (
                    <label key={control.id}>
                      {control.label}
                      <input
                        type="range"
                        data-testid={`tweak-${control.id}`}
                        min={control.min}
                        max={control.max}
                        step={control.step}
                        value={Number.isFinite(number) ? number : control.min}
                        onChange={(event) => {
                          const next = Number(event.target.value);
                          updateValue(control.nodeId, control.key, control.step === 1 ? Math.round(next) : next);
                        }}
                      />
                    </label>
                  );
                })}
              </div>
            ) : (
              <p className="lead">Choose a shader. Speed, color, and intensity edit the same nodes as the graph.</p>
            )}
            <ul className="preset-list">
              {PRESETS.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    data-testid={`preset-${item.id}`}
                    className={item.id === activePreset ? "active" : ""}
                    onClick={() => loadPreset(item)}
                  >
                    <img src={item.thumbnail} alt="" />
                    <strong>{item.name}</strong>
                    <span>{item.description}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="graph-pane">
            <GraphCanvas
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              setEdges={setEdges}
              onNotice={onNotice}
              fitToken={fitToken}
            />
            {selected.length === 1 && (
              <Inspector
                selected={selected}
                onChange={updateValue}
                onDelete={deleteNode}
                onNotice={onNotice}
              />
            )}
          </div>
        )}
      </aside>
      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} onAdd={addKind} />
      {exportOpen && (
        <div className="modal" role="dialog" aria-label="Exported TSL">
          <div className="modal-card">
            <header>
              <strong>three/tsl</strong>
              <button type="button" onClick={() => setExportOpen(false)}>
                Close
              </button>
            </header>
            <textarea data-testid="export-code" readOnly value={exportText} />
          </div>
        </div>
      )}
      <button
        type="button"
        className="sr-reset"
        data-testid="reset"
        onClick={() => loadGraphState(createExampleGraph(), null)}
      >
        Reset example
      </button>
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <Shell />
    </ReactFlowProvider>
  );
}
