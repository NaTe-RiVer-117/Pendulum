function finite(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function fourierSettings(values = {}) {
  const harmonics = Math.max(1, Math.min(12, Math.round(finite(values.harmonics, 4))));
  const frequency = finite(values.frequency, 1);
  const falloff = Math.max(0, finite(values.falloff, 1));
  const waveform = values.waveform === "square" || values.waveform === "saw" ? values.waveform : "sine";
  const terms = [];
  for (let index = 1; index <= harmonics; index += 1) {
    const harmonic = waveform === "square" ? index * 2 - 1 : index;
    const magnitude = 1 / harmonic ** falloff;
    const sign = waveform === "saw" && index % 2 === 0 ? -1 : 1;
    terms.push({ harmonic, weight: magnitude * sign, magnitude });
  }
  const norm = terms.reduce((sum, term) => sum + term.magnitude, 0) || 1;
  return { harmonics, frequency, falloff, waveform, terms, norm };
}

export function emitFourier(sample, values) {
  const settings = fourierSettings(values);
  let expr = "float(0)";
  for (const term of settings.terms) {
    const weight = term.weight / settings.norm;
    expr = `add(${expr}, mul(sin(mul(${sample}, float(${settings.frequency * term.harmonic}))), float(${weight})))`;
  }
  return expr;
}

export function compileFourier(sample, values, api) {
  const settings = fourierSettings(values);
  let sum = api.float(0);
  for (const term of settings.terms) {
    const angle = api.mul(sample, api.float(settings.frequency * term.harmonic));
    sum = api.add(sum, api.mul(api.sin(angle), api.float(term.weight / settings.norm)));
  }
  return sum;
}

export const DEFAULT_CURVE = [
  { x: 0, y: 0 },
  { x: 0.35, y: 0.12 },
  { x: 0.62, y: 0.88 },
  { x: 1, y: 1 },
];

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

export function sanitizeCurve(points) {
  const source = Array.isArray(points) ? points : DEFAULT_CURVE;
  const cleaned = source
    .map((point) => ({
      x: clamp01(finite(point?.x, NaN)),
      y: clamp01(finite(point?.y, NaN)),
    }))
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
    .sort((a, b) => a.x - b.x)
    .slice(0, 8);
  if (cleaned.length < 2) return DEFAULT_CURVE.map((point) => ({ ...point }));
  cleaned[0] = { ...cleaned[0], x: 0 };
  for (let index = 1; index < cleaned.length; index += 1) {
    const minX = cleaned[index - 1].x + 0.02;
    if (cleaned[index].x < minX) cleaned[index] = { ...cleaned[index], x: Math.min(1, minX) };
  }
  cleaned[cleaned.length - 1] = { ...cleaned[cleaned.length - 1], x: 1 };
  return cleaned;
}

export function emitCurve(sample, points) {
  const curve = sanitizeCurve(points);
  let expr = `float(${curve[0].y})`;
  for (let index = 0; index < curve.length - 1; index += 1) {
    const a = curve[index];
    const b = curve[index + 1];
    const span = Math.max(b.x - a.x, 0.0001);
    const local = `clamp(div(sub(${sample}, float(${a.x})), float(${span})), float(0), float(1))`;
    const y = `mix(float(${a.y}), float(${b.y}), ${local})`;
    expr = index === 0 ? y : `mix(${expr}, ${y}, step(float(${a.x}), ${sample}))`;
  }
  return expr;
}

export function compileCurve(sample, points, api) {
  const curve = sanitizeCurve(points);
  let result = api.float(curve[0].y);
  for (let index = 0; index < curve.length - 1; index += 1) {
    const a = curve[index];
    const b = curve[index + 1];
    const span = Math.max(b.x - a.x, 0.0001);
    const local = api.clamp(
      api.div(api.sub(sample, api.float(a.x)), api.float(span)),
      api.float(0),
      api.float(1),
    );
    const y = api.mix(api.float(a.y), api.float(b.y), local);
    result = index === 0 ? y : api.mix(result, y, api.step(api.float(a.x), sample));
  }
  return result;
}
