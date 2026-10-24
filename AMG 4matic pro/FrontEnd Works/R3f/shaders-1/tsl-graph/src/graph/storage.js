import { CATALOG } from "./catalog.js";
import { createExampleGraph } from "./exampleGraph.js";
import { validateConnection } from "./types.js";

export const STORAGE_KEY = "tsl-graph.v1";

function normalizeNode(node) {
  const kind = node?.data?.kind;
  const def = CATALOG[kind];
  if (!def || typeof node.id !== "string") return null;
  const values = { ...def.defaults };
  const incoming = node.data?.values && typeof node.data.values === "object" ? node.data.values : {};
  for (const field of def.fields) {
    if (incoming[field.key] !== undefined) values[field.key] = incoming[field.key];
  }
  return {
    id: node.id,
    type: "tsl",
    position: {
      x: Number(node.position?.x) || 0,
      y: Number(node.position?.y) || 0,
    },
    deletable: kind !== "material",
    selected: false,
    data: { kind, values },
  };
}

export function sanitizeGraph(data) {
  if (!data || !Array.isArray(data.nodes) || !Array.isArray(data.edges)) return null;
  const nodes = data.nodes.map(normalizeNode).filter(Boolean);
  if (!nodes.some((node) => node.data.kind === "material")) return null;
  if (nodes.length !== data.nodes.length) return null;
  const ids = new Set(nodes.map((node) => node.id));
  const edges = [];
  for (const edge of data.edges) {
    if (!edge || !ids.has(edge.source) || !ids.has(edge.target)) continue;
    const candidate = {
      id: String(edge.id || `${edge.source}-${edge.target}`),
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
    };
    if (validateConnection(nodes, edges, candidate).ok) edges.push(candidate);
  }
  return { nodes, edges };
}

export function loadGraph() {
  if (typeof localStorage === "undefined") return createExampleGraph();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createExampleGraph();
    const graph = sanitizeGraph(JSON.parse(raw));
    return graph ?? createExampleGraph();
  } catch {
    return createExampleGraph();
  }
}

export function saveGraph(graph) {
  if (typeof localStorage === "undefined") return { ok: true };
  try {
    const payload = {
      nodes: graph.nodes.map((node) => ({
        id: node.id,
        type: "tsl",
        position: node.position,
        data: node.data,
      })),
      edges: graph.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
      })),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error?.message || "Could not save the graph." };
  }
}
