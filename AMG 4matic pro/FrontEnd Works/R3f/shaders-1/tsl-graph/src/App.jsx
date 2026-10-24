import { ReactFlowProvider, useEdgesState, useNodesState, useReactFlow } from "@xyflow/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ensureShaderMotion } from "./audio/driver.js";
import { CommandPalette } from "./components/CommandPalette.jsx";
import { GraphCanvas } from "./components/GraphCanvas.jsx";
import { Inspector } from "./components/Inspector.jsx";
import { Palette } from "./components/Palette.jsx";
import { PresetShelf, TweakBar } from "./components/PresetShelf.jsx";
import { Preview } from "./components/Preview.jsx";
import { Tutorial, tutorialSeen } from "./components/Tutorial.jsx";
import { createNode } from "./graph/catalog.js";
import { compileGraph } from "./graph/compiler.js";
import { PRESETS } from "./graph/demos.js";
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
  const [tweakSignal, setTweakSignal] = useState(0);
  const [fitToken, setFitToken] = useState(0);
  const [commandOpen, setCommandOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(() => !tutorialSeen());
  const [tutorialSession, setTutorialSession] = useState(0);
  const [activePreset, setActivePreset] = useState(null);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [workspaceTab, setWorkspaceTab] = useState("graph");
  const [graphOpens, setGraphOpens] = useState(0);
  const { screenToFlowPosition } = useReactFlow();
  const preset = PRESETS.find((item) => item.id === activePreset) ?? null;

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
    openWorkspace("graph");
    setNotice(`${kind} added.`);
  }

  function loadGraphState(next, message, presetId = null) {
    setNodes(next.nodes);
    setEdges(next.edges);
    setActivePreset(presetId);
    setFitToken((token) => token + 1);
    setExportOpen(false);
    setNotice(message);
  }

  function loadPreset(nextPreset) {
    loadGraphState(nextPreset.build(), `${nextPreset.name} loaded.`, nextPreset.id);
  }

  function openWorkspace(tab = "graph") {
    setWorkspaceTab(tab);
    setWorkspaceOpen(true);
    setGraphOpens((count) => count + 1);
    setFitToken((token) => token + 1);
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
    <div className={`app${workspaceOpen ? " workspace-open" : ""}`}>
      <header className="topbar">
        <div className="brand">
          <strong>TSL Graph</strong>
          <span>Shader studio</span>
        </div>
        <div className="top-actions">
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
          <button type="button" data-testid="open-graph" onClick={() => openWorkspace("graph")}>
            Graph
          </button>
          <button type="button" data-testid="open-library" onClick={() => openWorkspace("library")}>
            Library
          </button>
          <button type="button" data-testid="open-inspector" onClick={() => openWorkspace("inspector")}>
            Inspector
          </button>
          <button type="button" data-testid="tutorial-open" onClick={openTutorial}>
            Tutorial
          </button>
          <button type="button" data-testid="export" onClick={copyExport}>
            Copy export
          </button>
          <button type="button" data-testid="download" onClick={downloadExport}>
            Download .js
          </button>
        </div>
      </header>
      <div className="stage">
        <section className="hero">
          <Preview compiled={compiled} materialKey={materialKey} primitive={primitive} />
          <TweakBar preset={preset} nodes={nodes} onChange={updateValue} />
          {notice && (
            <p className="toast" data-testid="notice">
              {notice}
            </p>
          )}
          {!compiled.ok && (
            <p className="compile-error hero-error" data-testid="compile-error">
              {compiled.error}
            </p>
          )}
        </section>
        <PresetShelf presets={PRESETS} activeId={activePreset} onPick={loadPreset} />
        <section
          className={`workspace${workspaceOpen ? " open" : ""}`}
          data-testid="workspace"
          data-open={workspaceOpen ? "true" : "false"}
          hidden={!workspaceOpen}
        >
          <header className="workspace-bar">
            <div className="workspace-tabs" role="tablist">
              <button
                type="button"
                data-testid="tab-library"
                className={workspaceTab === "library" ? "active" : ""}
                onClick={() => setWorkspaceTab("library")}
              >
                Library
              </button>
              <button
                type="button"
                data-testid="tab-graph"
                className={workspaceTab === "graph" ? "active" : ""}
                onClick={() => setWorkspaceTab("graph")}
              >
                Graph
              </button>
              <button
                type="button"
                data-testid="tab-inspector"
                className={workspaceTab === "inspector" ? "active" : ""}
                onClick={() => setWorkspaceTab("inspector")}
              >
                Inspector
              </button>
            </div>
            <button type="button" data-testid="close-workspace" onClick={() => setWorkspaceOpen(false)}>
              Close
            </button>
          </header>
          <div className="workspace-body" data-tab={workspaceTab}>
            <Palette onAdd={addKind} />
            <GraphCanvas
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              setEdges={setEdges}
              onNotice={onNotice}
              fitToken={fitToken}
            />
            <Inspector
              selected={selected}
              onChange={updateValue}
              onDelete={deleteNode}
              onNotice={onNotice}
            />
          </div>
        </section>
      </div>
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
      <button type="button" className="sr-reset" data-testid="reset" onClick={() => loadGraphState(createExampleGraph(), "Example graph restored.")}>
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
