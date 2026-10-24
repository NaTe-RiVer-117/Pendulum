import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  addEdge,
  useReactFlow,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { analyze, socketColor, validateConnection } from "../graph/types.js";
import { TslNode } from "./TslNode.jsx";
import { TypeContext } from "./type-context.js";

const nodeTypes = { tsl: TslNode };

function FitView({ token }) {
  const { getNodes, setViewport } = useReactFlow();
  useEffect(() => {
    const handle = setTimeout(() => {
      const pane = document.querySelector("[data-testid='graph']");
      if (!pane) return;
      const rect = pane.getBoundingClientRect();
      let minX = Infinity;
      let minY = Infinity;
      let maxX = 0;
      let maxY = 0;
      for (const node of getNodes()) {
        const width = node.measured?.width || 180;
        const height = node.measured?.height || 88;
        minX = Math.min(minX, node.position.x);
        minY = Math.min(minY, node.position.y);
        maxX = Math.max(maxX, node.position.x + width);
        maxY = Math.max(maxY, node.position.y + height);
      }
      if (!Number.isFinite(minX) || rect.width < 40 || rect.height < 40) return;
      const padding = 32;
      const zoom = Math.min(
        (rect.width - padding * 2) / Math.max(1, maxX - minX),
        (rect.height - padding * 2) / Math.max(1, maxY - minY),
        1.1,
      );
      setViewport(
        {
          x: padding - minX * zoom,
          y: padding - minY * zoom,
          zoom,
        },
        { duration: token === 0 ? 0 : 200 },
      );
    }, 150);
    return () => clearTimeout(handle);
  }, [token, getNodes, setViewport]);
  return null;
}

export function GraphCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  setEdges,
  onNotice,
  fitToken,
}) {
  const connected = useRef(false);
  const lastRefuse = useRef("");

  const structureKey = `${nodes
    .map((node) => `${node.id}:${node.data.kind}`)
    .join("|")}#${edges
    .map((edge) =>
      [edge.id, edge.source, edge.sourceHandle, edge.target, edge.targetHandle, edge.selected].join(":"),
    )
    .join("|")}`;

  const typing = useMemo(() => {
    const analyzed = analyze(nodes, edges);
    return {
      outputType: analyzed.outputType,
      connectedType: analyzed.connectedType,
      color: socketColor,
    };
  }, [structureKey]);

  const styledEdges = useMemo(
    () =>
      edges.map((edge) => ({
        ...edge,
        style: {
          stroke: socketColor(typing.outputType(edge.source, edge.sourceHandle)),
          strokeWidth: 2,
        },
      })),
    [edges, typing],
  );

  const handleNodesChange = useCallback(
    (changes) => {
      onNodesChange(
        changes.filter((change) => {
          if (change.type !== "remove") return true;
          const node = nodes.find((item) => item.id === change.id);
          return node?.data.kind !== "material";
        }),
      );
    },
    [nodes, onNodesChange],
  );

  const isValidConnection = useCallback(
    (connection) => {
      const result = validateConnection(nodes, edges, connection);
      lastRefuse.current = result.ok ? "" : result.reason;
      return result.ok;
    },
    [nodes, edges],
  );

  const onConnect = useCallback(
    (connection) => {
      const result = validateConnection(nodes, edges, connection);
      if (!result.ok) {
        onNotice(result.reason);
        return;
      }
      connected.current = true;
      setEdges((current) => {
        const cleared = current.filter(
          (edge) =>
            !(edge.target === connection.target && edge.targetHandle === connection.targetHandle),
        );
        return addEdge(
          {
            ...connection,
            style: { stroke: socketColor(result.sourceType), strokeWidth: 2 },
          },
          cleared,
        );
      });
      onNotice("Connected.");
    },
    [nodes, edges, onNotice, setEdges],
  );

  return (
    <TypeContext.Provider value={typing}>
      <div className="graph" data-testid="graph">
        <ReactFlow
          nodes={nodes}
          edges={styledEdges}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          isValidConnection={isValidConnection}
          connectionRadius={32}
          nodeTypes={nodeTypes}
          colorMode="dark"
          fitView
          fitViewOptions={{ padding: 0.18 }}
          deleteKeyCode={["Backspace", "Delete"]}
          proOptions={{ hideAttribution: false }}
          onConnectStart={() => {
            connected.current = false;
            lastRefuse.current = "";
          }}
          onConnectEnd={() => {
            if (!connected.current && lastRefuse.current) onNotice(lastRefuse.current);
            connected.current = false;
          }}
        >
          <FitView token={fitToken} />
          <Background gap={18} color="#2a3140" />
          <Controls />
          <MiniMap pannable zoomable />
        </ReactFlow>
      </div>
    </TypeContext.Provider>
  );
}
