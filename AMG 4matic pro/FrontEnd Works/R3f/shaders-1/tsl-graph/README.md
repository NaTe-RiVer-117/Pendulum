# TSL Graph

A small visual editor for Three.js TSL materials. You build a node graph, preview it on a lit mesh with WebGPU, and export JavaScript that uses `three/tsl`. The app does not run handwritten shader code.

Three.js is pinned to `0.174.0`, the same release as the WebGPU course lessons in this folder. The noise node calls `mx_noise_float` from that build.

## Run

```bash
cd tsl-graph
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). Use a current Chrome or Edge so WebGPU can start. The preview label shows `WebGPU` or `WebGL fallback`.

```bash
npm run build
npm run check
```

`npm run check` validates the example graph, socket rules, and the exported JavaScript. It does not launch a browser.

## Authoring

- Add nodes from the search list. Drag between the colored sockets. A float may feed a vec2, vec3, or color input. Mismatched vectors are refused.
- Click a node and edit its constants. The preview material rebuilds.
- Delete with the inspector button, Backspace, or Delete. The Material node stays.
- Export copies a `createMaterial()` function. Paste it into a WebGPU Three.js app.
- The graph is stored in `localStorage` under `tsl-graph.v1`. Reset example replaces it with the animated starter.

The starter graph scrolls Perlin noise across UV, mixes two colors, pulses emissive with `sin(time)`, and varies roughness. Metalness is high so the sunset environment and the lights show up on the mesh.

## Nodes

UV, Position, Normal, Time, Float, Color, Vec3, Add, Subtract, Multiply, Divide, Mix, Clamp, Smoothstep, Sin, Abs, Power, Fract, Min, Max, Split, Combine, Noise (`mx_noise_float`), Texture (`texture()`), and the fixed Material output (color, roughness, metalness, emissive, opacity).
