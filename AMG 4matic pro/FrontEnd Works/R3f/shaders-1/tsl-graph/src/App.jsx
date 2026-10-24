import { ReactFlowProvider, useEdgesState, useNodesState, useReactFlow } from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { setAudioSource } from "./audio/driver.js";
import { CommandPalette } from "./components/CommandPalette.jsx";
import { GraphCanvas } from "./components/GraphCanvas.jsx";
import { Inspector } from "./components/Inspector.jsx";
import { Palette } from "./components/Palette.jsx";
import { PostStack } from "./components/PostStack.jsx";
import { PresetMenu } from "./components/PresetMenu.jsx";
import { Preview } from "./components/Preview.jsx";
import { ScenePanel } from "./components/ScenePanel.jsx";
import { Tutorial } from "./components/Tutorial.jsx";
import { createNode } from "./graph/catalog.js";
import { compileGraph } from "./graph/compiler.js";
import { createExampleGraph } from "./graph/exampleGraph.js";
import { exportGraph } from "./graph/exportCode.js";
import { DEFAULT_POST } from "./graph/post.js";
import { loadGraph, saveGraph } from "./graph/storage.js";
import { DEFAULT_SCENE, sanitizeScene } from "./scene/scene.js";
import { PRESETS } from "./presets/index.js";

const HISTORY_LIMIT = 50;

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
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [sheet, setSheet] = useState(null);
  const [backendLabel, setBackendLabel] = useState("Starting WebGPU…");
  const [post, setPost] = useState(DEFAULT_POST);
  const [scene, setScene] = useState(DEFAULT_SCENE);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const past = useRef([]);
  const future = useRef([]);
  const present = useRef({});
  const postGesture = useRef(false);
  const sceneGesture = useRef(false);
  const rootRef = useRef(null);
  const { screenToFlowPosition } = useReactFlow();
  const onStatus = useCallback((label) => setBackendLabel(label), []);
  present.current = { nodes, edges, post, scene, shaderName, activePreset };

  function remember() {
    past.current.push(JSON.parse(JSON.stringify(present.current)));
    if (past.current.length > HISTORY_LIMIT) past.current.shift();
    future.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }

  function restore(snap) {
    setNodes(snap.nodes);
    setEdges(snap.edges);
    setPost(snap.post);
    setScene(sanitizeScene(snap.scene));
    setShaderName(snap.shaderName);
    setActivePreset(snap.activePreset);
    setCanUndo(past.current.length > 0);
    setCanRedo(future.current.length > 0);
  }

  function undo() {
    const snap = past.current.pop();
    if (!snap) return;
    future.current.push(JSON.parse(JSON.stringify(present.current)));
    restore(snap);
  }

  function redo() {
    const snap = future.current.pop();
    if (!snap) return;
    past.current.push(JSON.parse(JSON.stringify(present.current)));
    restore(snap);
  }

  useEffect(() => {
    const result = saveGraph({ nodes, edges });
    if (!result.ok) setNotice(result.error);
  }, [nodes, edges]);

  const audioMode = nodes.find((node) => node.data.kind === "audio")?.data.values?.source;
  useEffect(() => {
    if (!audioMode) return;
    setAudioSource(audioMode);
  }, [audioMode]);

  useEffect(() => {
    function endGesture() {
      postGesture.current = false;
      sceneGesture.current = false;
    }
    window.addEventListener("pointerup", endGesture);
    return () => window.removeEventListener("pointerup", endGesture);
  }, []);

  useEffect(() => {
    function onFullscreen() {
      setFullscreen(document.fullscreenElement === rootRef.current);
    }
    function onEscape(event) {
      if (event.key !== "Escape" || document.fullscreenElement !== rootRef.current) return;
      document.exitFullscreen().catch(() => {});
    }
    document.addEventListener("fullscreenchange", onFullscreen);
    window.addEventListener("keydown", onEscape, true);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreen);
      window.removeEventListener("keydown", onEscape, true);
    };
  }, []);

  async function toggleFullscreen() {
    const root = rootRef.current;
    if (!root) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      setSheet(null);
      await root.requestFullscreen();
    } catch (error) {
      setNotice(error?.message || "Fullscreen was blocked.");
    }
  }

  useEffect(() => {
    if (!menuOpen && !presetsOpen) return undefined;
    function onPointer(event) {
      if (menuOpen && !event.target.closest?.(".quiet")) setMenuOpen(false);
      if (presetsOpen && !event.target.closest?.(".preset-pop")) setPresetsOpen(false);
    }
    window.addEventListener("pointerdown", onPointer);
    return () => window.removeEventListener("pointerdown", onPointer);
  }, [menuOpen, presetsOpen]);

  useEffect(() => {
    function onKey(event) {
      const target = event.target;
      const field = target instanceof HTMLElement ? target.getAttribute("data-testid") : "";
      const typing =
        target instanceof HTMLTextAreaElement ||
        field === "shader-name" ||
        field === "palette-search";
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s" && event.shiftKey) {
        event.preventDefault();
        downloadExport();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z" && !typing) {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "y" && !typing) {
        event.preventDefault();
        redo();
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
    const node = nodes.find((item) => item.id === id);
    if (!node) return;
    if (JSON.stringify(node.data.values?.[key]) === JSON.stringify(value)) return;
    remember();
    setTweakSignal((signal) => signal + 1);
    setNodes((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, data: { ...item.data, values: { ...item.data.values, [key]: value } } }
          : item,
      ),
    );
    if (node.data.kind === "audio" && key === "source") setAudioSource(value);
  }

  function deleteNode(id) {
    remember();
    setNodes((current) => current.filter((node) => node.id !== id || node.data.kind === "material"));
    setEdges((current) => current.filter((edge) => edge.source !== id && edge.target !== id));
  }

  function handleNodesChange(changes) {
    if (changes.some((change) => change.type === "remove")) remember();
    onNodesChange(changes);
  }

  function handleEdgesChange(changes) {
    if (changes.some((change) => change.type === "remove")) remember();
    onEdgesChange(changes);
  }

  function commitEdges(updater) {
    remember();
    setEdges(updater);
  }

  function togglePost(id, enabled) {
    remember();
    setPost((current) => ({ ...current, [id]: { ...current[id], enabled } }));
  }

  function beginPost() {
    if (postGesture.current) return;
    postGesture.current = true;
    remember();
  }

  function editPost(id, key, value) {
    setPost((current) => ({ ...current, [id]: { ...current[id], [key]: value } }));
  }

  function beginScene() {
    if (sceneGesture.current) return;
    sceneGesture.current = true;
    remember();
  }

  function editScene(updater) {
    setScene((current) => updater(current));
  }

  function commitScene(updater) {
    remember();
    setScene((current) => updater(current));
  }

  function writeMaterial(key, value) {
    const material = nodes.find((node) => node.data.kind === "material");
    if (!material) return;
    if (edges.some((edge) => edge.target === material.id && edge.targetHandle === key)) return;
    if (JSON.stringify(material.data.values?.[key]) === JSON.stringify(value)) return;
    if (!sceneGesture.current) {
      sceneGesture.current = true;
      remember();
    }
    setTweakSignal((signal) => signal + 1);
    setNodes((current) =>
      current.map((item) =>
        item.id === material.id
          ? { ...item, data: { ...item.data, values: { ...item.data.values, [key]: value } } }
          : item,
      ),
    );
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
    remember();
    setNodes((current) => current.concat(createNode(kind, id, position)));
    setLibrarySignal((signal) => signal + 1);
    setSheet(null);
    setNotice(`${kind} added.`);
  }

  function loadGraphState(next, presetId = null, name = null) {
    remember();
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
    setPresetsOpen(false);
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
      const code = exportGraph(nodes, edges, post, scene);
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
      const code = exportGraph(nodes, edges, post, scene);
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
    <div
      ref={rootRef}
      className={`app${fullscreen ? " is-fullscreen" : ""}`}
      data-sheet={sheet || "none"}
      data-fullscreen={fullscreen ? "true" : "false"}
    >
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
        <div className="history">
          <button type="button" data-testid="undo" disabled={!canUndo} onClick={undo}>
            Undo
          </button>
          <button type="button" data-testid="redo" disabled={!canRedo} onClick={redo}>
            Redo
          </button>
        </div>
        <div className="top-tools">
        <PresetMenu
          presets={PRESETS}
          activePreset={activePreset}
          open={presetsOpen}
          onToggle={() => {
            setMenuOpen(false);
            setPresetsOpen((open) => !open);
          }}
          onPick={loadPreset}
        />
        <div className="quiet">
          <button
            type="button"
            data-testid="menu"
            aria-expanded={menuOpen}
            onClick={() => {
              setPresetsOpen(false);
              setMenuOpen((open) => !open);
            }}
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
        {fullscreen && (
          <button type="button" className="fullscreen-exit" data-testid="fullscreen" onClick={toggleFullscreen}>
            Exit
          </button>
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
          <Palette onAdd={addKind} />
        </div>
        <main className="canvas">
          {!fullscreen && (
            <button type="button" className="fullscreen-toggle" data-testid="fullscreen" onClick={toggleFullscreen}>
              Fullscreen
            </button>
          )}
          <GraphCanvas
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            setEdges={commitEdges}
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
              scene={scene}
              post={post}
              onStatus={onStatus}
            />
          </div>
          <p className="backend" data-testid="preview-status">
            {backendLabel}
          </p>
          <div className="preview-scroll">
            <ScenePanel
              scene={scene}
              materialNode={nodes.find((node) => node.data.kind === "material")}
              driven={{
                color: edges.some(
                  (edge) =>
                    edge.targetHandle === "color" &&
                    edge.target === nodes.find((node) => node.data.kind === "material")?.id,
                ),
                metalness: edges.some(
                  (edge) =>
                    edge.targetHandle === "metalness" &&
                    edge.target === nodes.find((node) => node.data.kind === "material")?.id,
                ),
                roughness: edges.some(
                  (edge) =>
                    edge.targetHandle === "roughness" &&
                    edge.target === nodes.find((node) => node.data.kind === "material")?.id,
                ),
              }}
              onBegin={beginScene}
              onScene={editScene}
              onCommit={commitScene}
              onMaterial={writeMaterial}
            />
            <PostStack post={post} onToggle={togglePost} onBegin={beginPost} onValue={editPost} />
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
            {!fullscreen && (
              <Inspector
                selected={selected}
                onChange={updateValue}
                onDelete={deleteNode}
                onNotice={onNotice}
              />
            )}
          </div>
        </aside>
      </div>
      {fullscreen && selected && (
        <div className="float-inspector">
          <Inspector
            selected={selected}
            onChange={updateValue}
            onDelete={deleteNode}
            onNotice={onNotice}
          />
        </div>
      )}
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
