'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import PomodoroIcon from '../icons/PomodoroIcon';
import { useUiStore } from '../../lib/store/ui';

export type FocusToggleProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** When set, shows text next to the icon (e.g. mobile menu row). */
  label?: string;
};

/**
 * Toggles `isFocusMode` in global UI state. No side effects beyond Zustand.
 */
const FocusToggle = forwardRef<HTMLButtonElement, FocusToggleProps>(function FocusToggle(
  { className = '', label, type = 'button', onClick, ...props },
  ref,
) {
  const isFocusMode = useUiStore((s) => s.isFocusMode);
  const setIsFocusMode = useUiStore((s) => s.setIsFocusMode);

  return (
    <button
      ref={ref}
      type={type}
      onClick={(e) => {
        setIsFocusMode(!isFocusMode);
        onClick?.(e);
      }}
      className={`inline-flex cursor-pointer items-center gap-2 rounded-md p-2 text-gray-500 hover:bg-white/50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
        isFocusMode ? 'text-emerald-600' : ''
      } ${className}`}
      aria-label={label ? undefined : 'Toggle focus mode'}
      aria-pressed={isFocusMode}
      {...props}
    >
      <PomodoroIcon className="pointer-events-none h-6 w-6 shrink-0" aria-hidden />
      {label ? <span className="text-base font-medium">{label}</span> : null}
    </button>
  );
});

export default FocusToggle;
