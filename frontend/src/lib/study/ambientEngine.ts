export type AmbientTrack = 'off' | 'lofi' | 'rain' | 'white';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const stoppers: Array<() => void> = [];
/** Invalidates in-flight `resume().then(...)` when a new `setAmbientTrack` runs. */
let ambientGeneration = 0;

function getAudioContext(): AudioContext {
  if (typeof window === 'undefined') {
    throw new Error('Audio requires window');
  }
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) {
      throw new Error('Web Audio API is not supported in this browser');
    }
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
  }
  return ctx;
}

function clearSounds() {
  for (const s of stoppers) {
    try {
      s();
    } catch {
      /* ignore */
    }
  }
  stoppers.length = 0;
}

function pushStop(fn: () => void) {
  stoppers.push(fn);
}

/** White noise loop (~2s buffer). */
function playWhiteNoise(c: AudioContext, dest: AudioNode) {
  const dur = 2;
  const n = c.sampleRate * dur;
  const buffer = c.createBuffer(1, n, c.sampleRate);
  const ch = buffer.getChannelData(0);
  for (let i = 0; i < n; i++) ch[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  const g = c.createGain();
  g.gain.value = 0.35;
  src.connect(g);
  g.connect(dest);
  src.start();
  pushStop(() => {
    src.stop();
    src.disconnect();
    g.disconnect();
  });
}

/** Rain: filtered noise. */
function playRain(c: AudioContext, dest: AudioNode) {
  const dur = 2;
  const n = c.sampleRate * dur;
  const buffer = c.createBuffer(1, n, c.sampleRate);
  const ch = buffer.getChannelData(0);
  for (let i = 0; i < n; i++) ch[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  const bp = c.createBiquadFilter();
  bp.type = 'lowpass';
  bp.frequency.value = 900;
  bp.Q.value = 0.7;
  const g = c.createGain();
  g.gain.value = 0.45;
  src.connect(bp);
  bp.connect(g);
  g.connect(dest);
  src.start();
  pushStop(() => {
    src.stop();
    src.disconnect();
    bp.disconnect();
    g.disconnect();
  });
}

/**
 * Soft pad (“lo-fi” vibe, no external files).
 * Uses a looping buffer like white/rain so playback matches those code paths
 * (OscillatorNode output can be silent until `AudioContext` has fully resumed).
 * Integer Hz + 1s buffer so the loop seam stays phase-aligned.
 */
function playLofiPad(c: AudioContext, dest: AudioNode) {
  const dur = 1;
  const freqs = [110, 130, 165, 196];
  const n = c.sampleRate * dur;
  const buffer = c.createBuffer(1, n, c.sampleRate);
  const ch = buffer.getChannelData(0);
  for (let i = 0; i < n; i++) {
    const t = i / c.sampleRate;
    let s = 0;
    for (const f of freqs) {
      s += Math.sin(2 * Math.PI * f * t);
    }
    ch[i] = s * 0.16;
  }
  const src = c.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  const g = c.createGain();
  g.gain.value = 0.38;
  src.connect(g);
  g.connect(dest);
  src.start();
  pushStop(() => {
    try {
      src.stop();
    } catch {
      /* ignore */
    }
    src.disconnect();
    g.disconnect();
  });
}

/**
 * Live master level while a track is playing (0–1). No-op when off.
 */
export function setAmbientMasterVolume(volume01: number): void {
  if (!master) return;
  const v = Math.max(0, Math.min(1, volume01)) * 0.5;
  master.gain.value = stoppers.length > 0 ? v : 0;
}

/**
 * Sets ambient bed. Volume 0–1. Safe to call repeatedly; replaces previous sound.
 */
export function setAmbientTrack(track: AmbientTrack, volume01: number): void {
  if (typeof window === 'undefined') return;

  const gen = ++ambientGeneration;
  const c = getAudioContext();
  clearSounds();

  if (!master) return;

  const vol = Math.max(0, Math.min(1, volume01));

  if (track === 'off') {
    master.gain.value = 0;
    void c.resume().catch(() => {});
    return;
  }

  // Buffers + BufferSource must start after the context is running; a fire-and-forget
  // `resume()` leaves `state === 'suspended'` long enough that playback is silent.
  void c.resume().then(() => {
    if (gen !== ambientGeneration) return;
    if (!master) return;

    if (track === 'white') {
      playWhiteNoise(c, master);
    } else if (track === 'rain') {
      playRain(c, master);
    } else if (track === 'lofi') {
      playLofiPad(c, master);
    }

    setAmbientMasterVolume(vol);
  });
}

export function stopAmbient(): void {
  if (typeof window === 'undefined') return;
  clearSounds();
  if (master) master.gain.value = 0;
}
