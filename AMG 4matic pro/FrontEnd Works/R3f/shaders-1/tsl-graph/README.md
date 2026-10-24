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

The canvas is the editor. It is visible when the app opens and takes most of the window. The left column is the node library: search, then the Input, Math, Pattern, Audio, and Output groups. Presets live in the Presets menu on the top line. Choosing one loads that shader’s nodes onto the canvas. The right column is a preview viewport with the inspector under it. The top line is the shader name, the mesh, Presets, and Export. On a phone the graph stays on screen, and the library and preview open as sheets.

Add a preset by creating `src/presets/your-shader.js` and one line in `src/presets/index.js`. The file exports `id`, `name`, `description`, `thumbnail`, and `buildGraph()`, which returns nodes and edges the compiler already understands. Save a rendered still at `src/presets/thumbs/your-shader.png`. The comment at the top of `src/presets/index.js` shows the import.

- Start from the current graph, or load a preset and keep editing it. Add nodes, rewire sockets, and change constants on that same graph.
- Presets: iridescent fresnel, domain-warp noise, pulsing rings, sine interference, holographic stripes, Fourier bands, formula plasma, audio pulse, and a curve ramp. Each one is animated with time.
- Add nodes from the library or with Ctrl+K / Cmd+K. Drag between the colored sockets. A float may feed a vec2, vec3, or color input. Mismatched vectors are refused.
- Click a node and edit its constants in the inspector. The preview material rebuilds.
- Delete with the inspector button, Backspace, or Delete. The Material node stays.
- The tutorial is in the Export menu. It asks you to add a node or load a preset, edit a constant, and export.
- Copy export or Download material.js writes a `createMaterial()` function. Paste it into a WebGPU Three.js app. Formula text is parsed into TSL calls. Nothing is passed to `eval`.
- Audio uses the microphone when you allow it. If permission is missing or denied, use the test tone so the material still moves.
- The graph is stored in `localStorage` under `tsl-graph.v1`. Reset replaces it with the animated starter.

The starter graph scrolls Perlin noise across UV, mixes two colors, pulses emissive with `sin(time)`, and varies roughness. Metalness is high so the sunset environment and the lights show up on the mesh.

## Nodes

Input: UV, Position, Normal, Time, Float, Color, Vec3.

Math: Add, Subtract, Multiply, Divide, Mix, Clamp, Smoothstep, Sin, Abs, Power, Fract, Min, Max, Split, Combine.

Pattern: Noise (`mx_noise_float`), Texture (`texture()`), Fourier (sine, square, or saw series), Formula (a small expression compiled through a parser), Curve (a draggable 0–1 ramp).

Audio: bass, mid, high, and level from an `AnalyserNode`, or from the built-in test tone.

Output: the fixed Material node (color, roughness, metalness, emissive, opacity).
