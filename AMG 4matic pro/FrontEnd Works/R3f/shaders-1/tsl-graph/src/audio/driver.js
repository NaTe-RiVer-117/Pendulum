import { uniform } from "three/tsl";

const bands = {
  bass: null,
  mid: null,
  high: null,
  level: null,
};

const smoothed = { bass: 0, mid: 0, high: 0, level: 0 };
const listeners = new Set();

let context = null;
let analyser = null;
let freq = null;
let wave = null;
let micStream = null;
let toneNodes = [];
let keepAlive = null;
let toneTime = 0;
let mic = "unknown";
let source = "none";
let detail = "";

export function audioUniforms() {
  if (!bands.bass) {
    bands.bass = uniform(0);
    bands.mid = uniform(0);
    bands.high = uniform(0);
    bands.level = uniform(0);
  }
  return bands;
}

function snapshot() {
  return {
    mic,
    source,
    detail,
    bass: smoothed.bass,
    mid: smoothed.mid,
    high: smoothed.high,
    level: smoothed.level,
    spectrum: freq ? Array.from(freq) : [],
    waveform: wave ? Array.from(wave) : [],
  };
}

function publish() {
  const next = snapshot();
  listeners.forEach((listener) => listener(next));
}

export function subscribeAudio(listener) {
  listeners.add(listener);
  listener(snapshot());
  return () => listeners.delete(listener);
}

export function getAudioSnapshot() {
  return snapshot();
}

function average(lo, hi) {
  if (!freq || !context) return 0;
  const nyquist = context.sampleRate / 2;
  const start = Math.max(0, Math.floor((lo / nyquist) * freq.length));
  const end = Math.min(freq.length, Math.max(start + 1, Math.ceil((hi / nyquist) * freq.length)));
  let total = 0;
  for (let index = start; index < end; index += 1) total += freq[index];
  return total / (end - start) / 255;
}

function writeBands(next, blend = 0.35) {
  const uniforms = audioUniforms();
  for (const key of Object.keys(next)) {
    smoothed[key] = smoothed[key] * (1 - blend) + next[key] * blend;
    uniforms[key].value = smoothed[key];
  }
}

function paintToneSpectrum(bass, mid, high) {
  if (!freq || freq.length < 64) freq = new Uint8Array(128);
  if (!wave || wave.length < 64) wave = new Uint8Array(128);
  for (let index = 0; index < freq.length; index += 1) {
    const t = index / freq.length;
    const band = t < 0.22 ? bass : t < 0.55 ? mid : high;
    const shape = Math.sin(Math.PI * ((t * 4) % 1));
    freq[index] = Math.max(0, Math.min(255, band * shape * 255));
  }
  for (let index = 0; index < wave.length; index += 1) {
    const cycle = index / wave.length;
    wave[index] = 128 + Math.round(Math.sin(cycle * Math.PI * 8 + toneTime * 6) * bass * 90);
  }
}

export function tickAudio() {
  if (source === "tone") {
    toneTime += 1 / 60;
    const bass = 0.5 + 0.5 * Math.sin(toneTime * 2.4);
    const mid = 0.5 + 0.5 * Math.sin(toneTime * 3.3 + 0.8);
    const high = 0.5 + 0.5 * Math.sin(toneTime * 5.1 + 1.6);
    const level = 0.5 + 0.5 * Math.sin(toneTime * 1.8);
    writeBands({ bass, mid, high, level }, 0.55);
    paintToneSpectrum(bass, mid, high);
    return;
  }
  if (!analyser || !freq || !wave) return;
  if (context?.state === "suspended") context.resume();
  analyser.getByteFrequencyData(freq);
  analyser.getByteTimeDomainData(wave);
  writeBands({
    bass: average(20, 150),
    mid: average(150, 2000),
    high: average(2000, context.sampleRate / 2),
    level: average(20, context.sampleRate / 2),
  });
}

async function ensureContext() {
  if (context) {
    if (context.state === "suspended") await context.resume();
    return context;
  }
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) {
    mic = "missing";
    detail = "Web Audio is unavailable in this browser.";
    publish();
    throw new Error(detail);
  }
  context = new AudioContext();
  analyser = context.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.65;
  freq = new Uint8Array(analyser.frequencyBinCount);
  wave = new Uint8Array(analyser.fftSize);
  keepAlive = context.createGain();
  keepAlive.gain.value = 0;
  analyser.connect(keepAlive);
  keepAlive.connect(context.destination);
  await context.resume();
  return context;
}

function stopTone() {
  for (const node of toneNodes) {
    if (typeof node.stop === "function") {
      try {
        node.stop();
      } catch {
        /* already stopped */
      }
    }
    if (typeof node.disconnect === "function" && node !== analyser) {
      try {
        node.disconnect();
      } catch {
        /* already disconnected */
      }
    }
  }
  toneNodes = [];
}

function stopMic() {
  micStream?.getTracks().forEach((track) => track.stop());
  micStream = null;
}

export async function startTestTone() {
  await ensureContext();
  stopMic();
  stopTone();
  const osc = context.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.value = 90;
  const lfo = context.createOscillator();
  lfo.frequency.value = 0.45;
  const sweep = context.createGain();
  sweep.gain.value = 1400;
  lfo.connect(sweep);
  sweep.connect(osc.frequency);
  const pulse = context.createOscillator();
  pulse.frequency.value = 0.8;
  const pulseAmount = context.createGain();
  pulseAmount.gain.value = 0.45;
  const gain = context.createGain();
  gain.gain.value = 0.55;
  pulse.connect(pulseAmount);
  pulseAmount.connect(gain.gain);
  osc.connect(gain);
  gain.connect(analyser);
  const high = context.createOscillator();
  high.type = "square";
  high.frequency.value = 2400;
  const highGain = context.createGain();
  highGain.gain.value = 0.18;
  high.connect(highGain);
  highGain.connect(analyser);
  osc.start();
  lfo.start();
  pulse.start();
  high.start();
  toneNodes.push(osc, lfo, sweep, pulse, pulseAmount, gain, high, highGain);
  source = "tone";
  if (mic !== "denied" && mic !== "missing") mic = "unknown";
  detail = "Test tone is driving the shader.";
  publish();
}

export async function startMicrophone() {
  if (!navigator.mediaDevices?.getUserMedia) {
    mic = "missing";
    detail = "This browser has no microphone API.";
    publish();
    await startTestTone();
    mic = "missing";
    detail = "No microphone API. Test tone is driving the shader.";
    publish();
    return;
  }
  mic = "requesting";
  detail = "Asking for microphone access…";
  publish();
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    await ensureContext();
    stopTone();
    stopMic();
    micStream = stream;
    const input = context.createMediaStreamSource(stream);
    input.connect(analyser);
    toneNodes.push(input);
    mic = "live";
    source = "mic";
    detail = "Microphone is live.";
    publish();
  } catch (error) {
    mic = "denied";
    detail = "Microphone permission was denied.";
    publish();
    try {
      await startTestTone();
    } catch (toneError) {
      detail = toneError?.message || detail;
    }
    mic = "denied";
    source = "tone";
    detail = "Microphone denied. Test tone is driving the shader.";
    publish();
  }
}

export async function setAudioSource(mode) {
  if (mode === "tone") {
    if (source === "tone") return;
    await startTestTone();
    return;
  }
  if (mode === "mic") {
    if (source === "mic") return;
    await startMicrophone();
    return;
  }
  stopTone();
  stopMic();
  source = "none";
  detail = "Audio is idle.";
  writeBands({ bass: 0, mid: 0, high: 0, level: 0 }, 1);
  publish();
}

export async function ensureShaderMotion() {
  if (source === "mic" || source === "tone" || mic === "requesting") return;
  try {
    await startTestTone();
  } catch (error) {
    detail = error?.message || "Audio could not start.";
    publish();
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("pointerdown", () => {
    if (context?.state === "suspended") context.resume();
  });
}
