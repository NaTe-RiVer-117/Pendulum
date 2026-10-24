import { ReactFlowProvider, useEdgesState, useNodesState, useReactFlow } from "@xyflow/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ensureShaderMotion } from "./audio/driver.js";
import { CommandPalette } from "./components/CommandPalette.jsx";
import { GraphCanvas } from "./components/GraphCanvas.jsx";
import { Inspector } from "./components/Inspector.jsx";
import { Palette } from "./components/Palette.jsx";
import { Preview } from "./components/Preview.jsx";
import { Tutorial, tutorialSeen } from "./components/Tutorial.jsx";
import { createNode } from "./graph/catalog.js";
import { compileGraph } from "./graph/compiler.js";
import { DEMOS } from "./graph/demos.js";
import { createExampleGraph } from "./graph/exampleGraph.js";
import { exportGraph } from "./graph/exportCode.js";
import { loadGraph, saveGraph } from "./graph/storage.js";

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
  const [notice, setNotice] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const [exportText, setExportText] = useState("");
  const [exportSignal, setExportSignal] = useState(0);
  const [fitToken, setFitToken] = useState(0);
  const [demosOpen, setDemosOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(() => !tutorialSeen());
  const [tutorialSession, setTutorialSession] = useState(0);
  const { screenToFlowPosition } = useReactFlow();

  useEffect(() => {
    const result = saveGraph({ nodes, edges });
    if (!result.ok) setNotice(result.error);
  }, [nodes, edges]);

  const hasAudio = nodes.some((node) => node.data.kind === "audio");
  useEffect(() => {
    if (hasAudio) ensureShaderMotion();
  }, [hasAudio]);

  useEffect(() => {
    function onKey(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
      x: (rect?.left ?? 0) + (rect?.width ?? 600) * 0.45,
      y: (rect?.top ?? 0) + (rect?.height ?? 400) * 0.42,
    });
    position.x += Math.round((Math.random() - 0.5) * 36);
    position.y += Math.round((Math.random() - 0.5) * 36);
    const id = `${kind}-${crypto.randomUUID().slice(0, 8)}`;
    setNodes((current) => current.concat(createNode(kind, id, position)));
    setNotice(`${kind} added.`);
  }

  function loadGraphState(next, message) {
    setNodes(next.nodes);
    setEdges(next.edges);
    setFitToken((token) => token + 1);
    setExportOpen(false);
    setDemosOpen(false);
    setNotice(message);
  }

  function resetExample() {
    loadGraphState(createExampleGraph(), "Example graph restored.");
  }

  function loadDemo(demo) {
    loadGraphState(demo.build(), `${demo.label} loaded.`);
  }

  function openTutorial() {
    setTutorialSession((session) => session + 1);
    setTutorialOpen(true);
  }

  async function copyExport() {
    try {
      const code = exportGraph(nodes, edges);
      setExportText(code);
      setExportOpen(true);
      setExportSignal((value) => value + 1);
      try {
        await navigator.clipboard.writeText(code);
        setNotice("Export copied.");
      } catch {
        setNotice("Export is ready in the panel.");
      }
    } catch (error) {
      setNotice(error?.message || "Export failed.");
    }
  }

  function downloadExport() {
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
      <header className="toolbar">
        <div className="brand">
          <strong>TSL Graph</strong>
          <span>Shader editor</span>
        </div>
        <div className="menu">
          <button
            type="button"
            data-testid="demos"
            aria-expanded={demosOpen}
            onClick={() => setDemosOpen((open) => !open)}
          >
            Demos
          </button>
          {demosOpen && (
            <div className="menu-pop" data-testid="demo-menu">
              {DEMOS.map((demo) => (
                <button
                  key={demo.id}
                  type="button"
                  data-testid={`demo-${demo.id}`}
                  onClick={() => loadDemo(demo)}
                >
                  {demo.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button type="button" data-testid="tutorial-open" onClick={openTutorial}>
          Tutorial
        </button>
        <label className="primitive">
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
        <button type="button" data-testid="export" onClick={copyExport}>
          Copy export
        </button>
        <button type="button" data-testid="download" onClick={downloadExport}>
          Download .js
        </button>
        <button type="button" data-testid="reset" onClick={resetExample}>
          Reset
        </button>
        <p className="notice" data-testid="notice">
          {notice}
        </p>
        {!compiled.ok && (
          <p className="compile-error" data-testid="compile-error">
            {compiled.error}
          </p>
        )}
      </header>
      <div className="body">
        <Palette onAdd={addKind} />
        <div className="stage">
          <GraphCanvas
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            setEdges={setEdges}
            onNotice={onNotice}
            fitToken={fitToken}
          />
          {tutorialOpen && (
            <Tutorial
              key={tutorialSession}
              nodes={nodes}
              edges={edges}
              exportSignal={exportSignal}
              onClose={() => setTutorialOpen(false)}
            />
          )}
        </div>
        <div className="side">
          <Preview compiled={compiled} materialKey={materialKey} primitive={primitive} />
          <Inspector
            selected={selected}
            onChange={updateValue}
            onDelete={deleteNode}
            onNotice={onNotice}
          />
        </div>
      </div>
      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} onAdd={addKind} />
      {exportOpen && (
        <div className="modal" role="dialog" aria-label="Exported TSL">
          <div className="modal-card">
            <header>
              <strong>three/tsl export</strong>
              <div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(exportText).then(
                      () => setNotice("Export copied."),
                      () => setNotice("Clipboard was blocked. Copy from the panel."),
                    );
                  }}
                >
                  Copy
                </button>
                <button type="button" onClick={() => setExportOpen(false)}>
                  Close
                </button>
              </div>
            </header>
            <textarea data-testid="export-code" readOnly value={exportText} />
          </div>
        </div>
      )}
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
