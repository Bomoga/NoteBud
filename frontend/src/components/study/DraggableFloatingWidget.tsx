'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';

type Position = { left: number; top: number };

function clampPos(pos: Position, width: number, height: number, margin = 8): Position {
  if (typeof window === 'undefined') return pos;
  return {
    left: Math.min(Math.max(margin, pos.left), Math.max(margin, window.innerWidth - width - margin)),
    top: Math.min(Math.max(margin, pos.top), Math.max(margin, window.innerHeight - height - margin)),
  };
}

type Props = {
  children: React.ReactNode;
  /** Persist position in localStorage (per notebook view). */
  storageKey?: string;
  defaultTop?: number;
  defaultRight?: number;
  className?: string;
  /** Typically exits focus mode so the navbar returns. */
  onClose?: () => void;
};

export default function DraggableFloatingWidget({
  children,
  storageKey = 'notebud-study-widget-pos',
  defaultTop = 72,
  defaultRight = 16,
  className = '',
  onClose,
}: Props) {
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; origin: Position } | null>(null);
  const [position, setPosition] = useState<Position | null>(null);

  useLayoutEffect(() => {
    setPortalEl(document.body);
  }, []);

  const measureAndPlace = useCallback(() => {
    const el = rootRef.current;
    if (!el || typeof window === 'undefined') return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;

    if (storageKey) {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const p = JSON.parse(raw) as Position;
          if (typeof p.left === 'number' && typeof p.top === 'number') {
            setPosition(clampPos(p, w, h));
            return;
          }
        }
      } catch {
        /* ignore */
      }
    }

    setPosition(
      clampPos(
        { left: window.innerWidth - w - defaultRight, top: defaultTop },
        w,
        h,
      ),
    );
  }, [storageKey, defaultTop, defaultRight]);

  // Re-run when `portalEl` becomes available: first effect pass runs before the portaled
  // shell exists, so `rootRef` is null until after `document.body` is set — without
  // `portalEl` in deps, position would stay null and the widget would stay invisible.
  useLayoutEffect(() => {
    measureAndPlace();
  }, [portalEl, measureAndPlace]);

  useEffect(() => {
    function onResize() {
      const el = rootRef.current;
      if (!el) return;
      setPosition((prev) => {
        if (!prev) return prev;
        return clampPos(prev, el.offsetWidth, el.offsetHeight);
      });
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!storageKey || !position) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(position));
    } catch {
      /* ignore */
    }
  }, [storageKey, position]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!position) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origin: { ...position },
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current || !rootRef.current) return;
    const el = rootRef.current;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPosition(
      clampPos(
        {
          left: dragRef.current.origin.left + dx,
          top: dragRef.current.origin.top + dy,
        },
        w,
        h,
      ),
    );
  };

  const onPointerUp = (e: React.PointerEvent) => {
    dragRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const shell = (
    <div
      ref={rootRef}
      className={`fixed z-[100] flex flex-col overflow-hidden rounded-xl border border-white/30 shadow-lg backdrop-blur-[30px] ${position ? '' : 'invisible'} ${className}`}
      style={
        position
          ? { left: position.left, top: position.top }
          : { left: 0, top: 0 }
      }
    >
      <div className="flex min-h-[2.5rem] touch-none select-none items-stretch border-b border-white/25 bg-white/15">
        <div
          className="flex flex-1 cursor-grab items-center justify-center gap-0.5 py-2 active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          aria-label="Drag to move study tools"
        >
          <span className="flex gap-1 rounded-sm px-2 py-0.5">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <span key={i} className="h-1 w-1 rounded-full bg-slate-400/90" />
            ))}
          </span>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="flex shrink-0 items-center justify-center border-l border-white/20 px-2.5 text-slate-500 transition-colors hover:bg-white/20 hover:text-slate-800"
            aria-label="Exit focus mode"
          >
            <XMarkIcon className="h-5 w-5" aria-hidden />
          </button>
        ) : null}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );

  if (!portalEl) return null;
  return createPortal(shell, portalEl);
}
