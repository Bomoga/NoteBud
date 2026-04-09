'use client';

import { useEffect, useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import PomodoroTimer from './PomodoroTimer';
import AmbientAudioPlayer from './AmbientAudioPlayer';

type Props = {
  /** Persist open/closed in localStorage (e.g. per notebook). */
  storageKeyExpanded?: string;
};

export default function StudyToolsPanel({ storageKeyExpanded }: Props) {
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (!storageKeyExpanded || typeof window === 'undefined') return;
    try {
      const v = localStorage.getItem(storageKeyExpanded);
      if (v === '0') setExpanded(false);
      if (v === '1') setExpanded(true);
    } catch {
      /* ignore */
    }
  }, [storageKeyExpanded]);

  useEffect(() => {
    if (!storageKeyExpanded || typeof window === 'undefined') return;
    try {
      localStorage.setItem(storageKeyExpanded, expanded ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [expanded, storageKeyExpanded]);

  return (
    <div className="min-w-[220px]">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full cursor-pointer items-center justify-between gap-2 border-b border-white/20 bg-white/10 px-3 py-2 text-left hover:bg-white/15"
        aria-expanded={expanded}
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Study tools</span>
        {expanded ? (
          <ChevronUpIcon className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
        ) : (
          <ChevronDownIcon className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
        )}
      </button>
      <div className={expanded ? 'block' : 'hidden'}>
        <PomodoroTimer className="w-full rounded-none border-0 shadow-none" />
        <AmbientAudioPlayer />
      </div>
    </div>
  );
}
