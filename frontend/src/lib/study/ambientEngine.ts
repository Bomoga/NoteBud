export type AmbientTrack = 'off' | 'lofi' | 'rain' | 'white';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const stoppers: Array<() => void> = [];

function getAudioContext(): AudioContext {
  if (typeof window === 'undefined') {
    throw new Error('Audio requires window');
  }
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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

/** Simple soft pad (synth “lo-fi” vibe, no external files). */
function playLofiPad(c: AudioContext, dest: AudioNode) {
  const freqs = [130.81, 164.81, 196.0, 246.94]; // C3, E3, G3, B3
  const oscillators: OscillatorNode[] = [];
  const gains: GainNode[] = [];
  for (const f of freqs) {
    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = f;
    const g = c.createGain();
    g.gain.value = 0.04;
    osc.connect(g);
    g.connect(dest);
    osc.start();
    oscillators.push(osc);
    gains.push(g);
  }
  pushStop(() => {
    for (const osc of oscillators) {
      try {
        osc.stop();
      } catch {
        /* ignore */
      }
      osc.disconnect();
    }
    for (const g of gains) g.disconnect();
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

  const c = getAudioContext();
  clearSounds();

  if (!master) return;

  void c.resume().catch(() => {});

  if (track === 'off') {
    master.gain.value = 0;
    return;
  }

  if (track === 'white') {
    playWhiteNoise(c, master);
  } else if (track === 'rain') {
    playRain(c, master);
  } else {
    playLofiPad(c, master);
  }

  setAmbientMasterVolume(volume01);
}

export function stopAmbient(): void {
  if (typeof window === 'undefined') return;
  clearSounds();
  if (master) master.gain.value = 0;
}
