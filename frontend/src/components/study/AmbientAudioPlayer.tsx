'use client';

import { useEffect, useState } from 'react';
import { setAmbientTrack, setAmbientMasterVolume, stopAmbient, type AmbientTrack } from '../../lib/study/ambientEngine';

const OPTIONS: { id: AmbientTrack; label: string }[] = [
  { id: 'off', label: 'Off' },
  { id: 'lofi', label: 'Lo-fi' },
  { id: 'rain', label: 'Rain' },
  { id: 'white', label: 'White' },
];

export default function AmbientAudioPlayer() {
  const [track, setTrack] = useState<AmbientTrack>('off');
  const [volume, setVolume] = useState(45);

  useEffect(() => {
    setAmbientTrack(track, volume / 100);
  }, [track]);

  useEffect(() => {
    if (track === 'off') return;
    setAmbientMasterVolume(volume / 100);
  }, [volume, track]);

  useEffect(() => {
    return () => stopAmbient();
  }, []);

  return (
    <div className="border-t border-white/20 px-3 py-3">
      <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        Ambient
      </p>
      <div className="flex flex-wrap justify-center gap-1">
        {OPTIONS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTrack(id)}
            className={`cursor-pointer rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
              track === id
                ? 'bg-emerald-600 text-white'
                : 'bg-white/25 text-slate-700 hover:bg-white/40'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className="shrink-0 text-[10px] text-slate-500">Vol</span>
        <input
          type="range"
          min={0}
          max={100}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          className="h-1.5 flex-1 cursor-pointer accent-emerald-600"
          aria-label="Ambient volume"
        />
        <span className="w-7 shrink-0 text-right font-mono text-[10px] text-slate-600">{volume}</span>
      </div>
    </div>
  );
}
