'use client';

import { useEffect, useReducer, type Dispatch } from 'react';
import { playPhaseChime } from '../../lib/study/phaseChime';

const FOCUS_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;

type Phase = 'focus' | 'break';
type RunState = 'idle' | 'running' | 'paused';

export type PomodoroState = {
  phase: Phase;
  remaining: number;
  runState: RunState;
};

type PomodoroAction =
  | { type: 'TICK' }
  | { type: 'START' }
  | { type: 'PAUSE' }
  | { type: 'RESET' };

export function formatMmSs(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function reducer(state: PomodoroState, action: PomodoroAction): PomodoroState {
  switch (action.type) {
    case 'RESET':
      return {
        phase: 'focus',
        remaining: FOCUS_SECONDS,
        runState: 'idle',
      };
    case 'START':
      if (state.runState === 'running') return state;
      return { ...state, runState: 'running' };
    case 'PAUSE':
      if (state.runState !== 'running') return state;
      return { ...state, runState: 'paused' };
    case 'TICK': {
      if (state.runState !== 'running') return state;

      if (state.remaining > 1) {
        return { ...state, remaining: state.remaining - 1 };
      }
      if (state.remaining === 1) {
        return { ...state, remaining: 0 };
      }
      playPhaseChime();
      if (state.phase === 'focus') {
        return {
          phase: 'break',
          remaining: BREAK_SECONDS,
          runState: 'running',
        };
      }
      return {
        phase: 'focus',
        remaining: FOCUS_SECONDS,
        runState: 'idle',
      };
    }
    default:
      return state;
  }
}

const initialState: PomodoroState = {
  phase: 'focus',
  remaining: FOCUS_SECONDS,
  runState: 'idle',
};

export function usePomodoroTimer() {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    if (state.runState !== 'running') return;
    const id = window.setInterval(() => dispatch({ type: 'TICK' }), 1000);
    return () => window.clearInterval(id);
  }, [state.runState]);

  return { state, dispatch };
}

type PomodoroTimerProps = {
  className?: string;
  state: PomodoroState;
  dispatch: Dispatch<PomodoroAction>;
};

export default function PomodoroTimer({ className = '', state, dispatch }: PomodoroTimerProps) {
  const label = state.phase === 'focus' ? 'Focus' : 'Break';

  return (
    <div
      className={`glass-panel w-[min(100%,220px)] rounded-xl border border-white/30 px-4 py-3 shadow-sm backdrop-blur-[30px] ${className}`}
    >
      <p className="text-center text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-center font-mono text-3xl tabular-nums text-slate-800">{formatMmSs(state.remaining)}</p>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {state.runState === 'running' ? (
          <button
            type="button"
            onClick={() => dispatch({ type: 'PAUSE' })}
            className="cursor-pointer rounded-lg bg-slate-200/80 px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-300/90"
          >
            Pause
          </button>
        ) : (
          <button
            type="button"
            onClick={() => dispatch({ type: 'START' })}
            className="cursor-pointer rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Start
          </button>
        )}
        <button
          type="button"
          onClick={() => dispatch({ type: 'RESET' })}
          className="cursor-pointer rounded-lg border border-white/40 bg-white/30 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-white/50"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
