import { Handle, Position } from "@xyflow/react";
import { useContext } from "react";
import { CATALOG } from "../graph/catalog.js";
import { TypeContext } from "./type-context.js";

function restingInput(kind, inputId) {
  if (kind === "material") {
    return inputId === "color" || inputId === "emissive" ? "color" : "float";
  }
  if (kind === "combine") return "float";
  if (kind === "split" || kind === "noise") return "vec3";
  if (kind === "texture") return "vec2";
  return "float";
}

function previewValue(field, values) {
  if (field.control === "image") return values?.src ? "image" : "checker";
  const value = values?.[field.key];
  if (typeof value === "number") return String(Math.round(value * 1000) / 1000);
  return value ?? "";
}

export function TslNode({ id, data, selected }) {
  const def = CATALOG[data.kind];
  const typing = useContext(TypeContext);
  if (!def) return null;

  return (
    <div
      className={`tsl-node${selected ? " selected" : ""}${data.kind === "material" ? " material" : ""}`}
      data-kind={data.kind}
      data-node-id={id}
    >
      <header>{def.label}</header>
      <div className="ports">
        {def.inputs.map((socket) => {
          const connected = typing?.connectedType(id, socket.id);
          const type = connected || restingInput(data.kind, socket.id);
          return (
            <div className="port in" key={socket.id}>
              <Handle
                type="target"
                position={Position.Left}
                id={socket.id}
                title={`${socket.label} (${type})`}
                style={{ background: typing?.color(type) }}
              />
              <span>{socket.label}</span>
              <em>{type}</em>
            </div>
          );
        })}
        {def.outputs.map((socket) => {
          const type = typing?.outputType(id, socket.id) || "float";
          return (
            <div className="port out" key={socket.id}>
              <span>{socket.label}</span>
              <em>{type}</em>
              <Handle
                type="source"
                position={Position.Right}
                id={socket.id}
                title={`${socket.label} (${type})`}
                style={{ background: typing?.color(type) }}
              />
            </div>
          );
        })}
      </div>
      {def.fields.length > 0 && (
        <footer>
          {def.fields.map((field) => (
            <span key={field.key}>
              {field.label} {previewValue(field, data.values)}
            </span>
          ))}
        </footer>
      )}
    </div>
  );
}
