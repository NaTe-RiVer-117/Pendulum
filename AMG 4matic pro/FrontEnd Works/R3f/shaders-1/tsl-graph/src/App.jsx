import { ReactFlowProvider, useEdgesState, useNodesState, useReactFlow } from "@xyflow/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ensureShaderMotion } from "./audio/driver.js";
import { CommandPalette } from "./components/CommandPalette.jsx";
import { GraphCanvas } from "./components/GraphCanvas.jsx";
import { Inspector } from "./components/Inspector.jsx";
import { Palette } from "./components/Palette.jsx";
import { Preview } from "./components/Preview.jsx";
import { Tutorial } from "./components/Tutorial.jsx";
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

function Shell() {
  const initial = useMemo(() => loadGraph(), []);
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const [primitive, setPrimitive] = useState("sphere");
  const [shaderName, setShaderName] = useState("Untitled");
  const [notice, setNotice] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const [exportText, setExportText] = useState("");
  const [exportSignal, setExportSignal] = useState(0);
  const [tweakSignal, setTweakSignal] = useState(0);
  const [librarySignal, setLibrarySignal] = useState(0);
  const [fitToken, setFitToken] = useState(0);
  const [commandOpen, setCommandOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [tutorialSession, setTutorialSession] = useState(0);
  const [activePreset, setActivePreset] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sheet, setSheet] = useState(null);
  const [backendLabel, setBackendLabel] = useState("Starting WebGPU…");
  const { screenToFlowPosition } = useReactFlow();
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
      x: (rect?.left ?? 80) + (rect?.width ?? 600) * 0.4,
      y: (rect?.top ?? 80) + (rect?.height ?? 400) * 0.4,
    });
    position.x += Math.round((Math.random() - 0.5) * 36);
    position.y += Math.round((Math.random() - 0.5) * 36);
    const id = `${kind}-${crypto.randomUUID().slice(0, 8)}`;
    setNodes((current) => current.concat(createNode(kind, id, position)));
    setLibrarySignal((signal) => signal + 1);
    setSheet(null);
    setNotice(`${kind} added.`);
  }

  function loadGraphState(next, presetId = null, name = null) {
    setNodes(next.nodes);
    setEdges(next.edges);
    setActivePreset(presetId);
    if (name) setShaderName(name);
    setFitToken((token) => token + 1);
    setExportOpen(false);
    setSheet(null);
    setNotice("");
  }

  function loadPreset(nextPreset) {
    setLibrarySignal((signal) => signal + 1);
    loadGraphState(nextPreset.buildGraph(), nextPreset.id, nextPreset.name);
  }

  function openTutorial() {
    setMenuOpen(false);
    setTutorialSession((session) => session + 1);
    setTutorialOpen(true);
    setSheet("library");
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
    <div className="app" data-sheet={sheet || "none"}>
      <header className="top-line">
        <input
          className="shader-name"
          data-testid="shader-name"
          aria-label="Shader name"
          value={shaderName}
          onChange={(event) => setShaderName(event.target.value)}
        />
        <button type="button" className="sheet-toggle" data-testid="open-library" onClick={() => setSheet("library")}>
          Library
        </button>
        <button type="button" className="sheet-toggle" data-testid="open-preview" onClick={() => setSheet("preview")}>
          Preview
        </button>
        <label className="mesh">
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
            </div>
          )}
        </div>
      </header>
      <div className="workspace">
        <div className={`library-wrap${sheet === "library" ? " open" : ""}`}>
          <div className="sheet-bar">
            <strong>Library</strong>
            <button type="button" data-testid="close-library" onClick={() => setSheet(null)}>
              Close
            </button>
          </div>
          {tutorialOpen && (
            <Tutorial
              key={tutorialSession}
              librarySignal={librarySignal}
              tweakSignal={tweakSignal}
              exportSignal={exportSignal}
              onClose={() => setTutorialOpen(false)}
            />
          )}
          <Palette
            onAdd={addKind}
            presets={PRESETS}
            activePreset={activePreset}
            onPreset={loadPreset}
          />
        </div>
        <main className="canvas">
          <GraphCanvas
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            setEdges={setEdges}
            onNotice={onNotice}
            fitToken={fitToken}
          />
        </main>
        <aside className={`preview-column${sheet === "preview" ? " open" : ""}`}>
          <div className="sheet-bar">
            <strong>Preview</strong>
            <button type="button" data-testid="close-preview" onClick={() => setSheet(null)}>
              Close
            </button>
          </div>
          <div className="preview-frame">
            <Preview
              compiled={compiled}
              materialKey={materialKey}
              primitive={primitive}
              onStatus={onStatus}
            />
          </div>
          <p className="backend" data-testid="preview-status">
            {backendLabel}
          </p>
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
          <Inspector
            selected={selected}
            onChange={updateValue}
            onDelete={deleteNode}
            onNotice={onNotice}
          />
        </aside>
      </div>
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
        onClick={() => loadGraphState(createExampleGraph(), null, "Untitled")}
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
