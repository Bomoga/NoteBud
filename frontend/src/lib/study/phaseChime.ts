let sharedAudioContext: AudioContext | null = null;

function getSharedAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  const Ctor: (new () => AudioContext) | undefined =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: new () => AudioContext }).webkitAudioContext;
  if (!Ctor) return null;

  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    sharedAudioContext = new Ctor();
  }

  return sharedAudioContext;
}

/**
 * Short soft chime when a Pomodoro phase ends. Uses Web Audio (no network).
 * Call after a user gesture (e.g. Start) so AudioContext is allowed in strict browsers.
 */
export function playPhaseChime(): void {
  const ctx = getSharedAudioContext();
  if (!ctx) return;
  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, t0);
  osc.frequency.exponentialRampToValueAtTime(660, t0 + 0.12);

  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(0.1, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.35);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + 0.4);

  void ctx.resume().catch(() => {});
}
