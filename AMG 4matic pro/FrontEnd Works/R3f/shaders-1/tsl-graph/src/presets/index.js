// Add a preset in two steps:
// 1. Create src/presets/your-shader.js exporting id, name, description, thumbnail, and buildGraph().
// 2. Import it and append it here.
//
// import { yourShader } from "./your-shader.js";
// export const PRESETS = [iridescent, warp, rings, interference, stripes, fourier, formula, audio, curve, yourShader];

import { audio } from "./audio.js";
import { curve } from "./curve.js";
import { formula } from "./formula.js";
import { fourier } from "./fourier.js";
import { interference } from "./interference.js";
import { iridescent } from "./iridescent.js";
import { rings } from "./rings.js";
import { stripes } from "./stripes.js";
import { warp } from "./warp.js";

export const PRESETS = [iridescent, warp, rings, interference, stripes, fourier, formula, audio, curve];
