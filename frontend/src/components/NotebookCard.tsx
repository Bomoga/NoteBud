'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import type { NotebookResponse } from '../lib/api';
import { EllipsisVerticalIcon, TrashIcon, CameraIcon } from '@heroicons/react/24/outline';
import { getNotebookBannerUrl } from '../lib/api/notebooks';
import { useUploadNotebookBanner } from '../hooks/useNotebooks';

interface NotebookCardProps {
  notebook: NotebookResponse;
  onDelete?: (id: string) => void;
  isDeleting?: boolean;
}

const CARD_GRADIENTS = [
  'from-violet-400 to-violet-600',
  'from-sky-400 to-sky-600',
  'from-emerald-400 to-emerald-600',
  'from-amber-400 to-amber-600',
  'from-rose-400 to-rose-600',
  'from-indigo-400 to-indigo-600',
  'from-teal-400 to-teal-600',
  'from-orange-400 to-orange-600',
];

function cardGradient(str: string) {
  let hash = 0;
  for (const c of str) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
  return CARD_GRADIENTS[hash % CARD_GRADIENTS.length];
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return iso; }
}

export default function NotebookCard({ notebook, onDelete, isDeleting = false }: NotebookCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadBanner = useUploadNotebookBanner();

  const gradient = cardGradient(notebook.course_code || notebook.title);
  const initial = (notebook.course_code || notebook.title).charAt(0).toUpperCase();
  const hasBanner = !!notebook.banner_gcs_uri;

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadBanner.mutate({ notebookId: notebook.id, file });
    e.target.value = '';
  };

  return (
    <div className="border rounded-lg glass-panel flex flex-col overflow-hidden shadow-sm transition-shadow hover:shadow-md">
      {/* Header — banner image or gradient, with hover upload overlay */}
      <div className="relative group h-24 overflow-hidden">
        <Link href={`/backpack/${notebook.id}/notes`} className="block w-full h-full">
          {hasBanner ? (
            <img
              src={getNotebookBannerUrl(notebook.id)}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div className={`bg-gradient-to-br ${gradient} w-full h-full flex items-end p-3`}>
              <span className="flex size-10 items-center justify-center rounded-lg bg-white/20 text-lg font-bold text-white backdrop-blur-sm">
                {initial}
              </span>
            </div>
          )}
        </Link>

        {/* Upload overlay */}
        <label
          className={`absolute inset-0 flex flex-col items-center justify-center gap-1 cursor-pointer transition-opacity ${
            uploadBanner.isPending
              ? 'bg-black/50 opacity-100'
              : 'bg-black/40 opacity-0 group-hover:opacity-100'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {uploadBanner.isPending ? (
            <div className="size-5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
          ) : (
            <CameraIcon className="size-6 text-white drop-shadow" />
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onClick={(e) => e.stopPropagation()}
            onChange={handleFileChange}
          />
        </label>
      </div>

      {/* Card body */}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/backpack/${notebook.id}/notes`} className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-slate-900 leading-snug line-clamp-2">
              {notebook.title}
            </h3>
          </Link>

          {/* Three-dot menu */}
          <div ref={menuRef} className="relative flex-shrink-0">
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); setMenuOpen((v) => !v); }}
              className="flex items-center justify-center rounded-md p-1 text-slate-400 hover:text-slate-700 hover:bg-white/40 transition-colors"
              aria-label="Notebook options"
            >
              <EllipsisVerticalIcon className="size-5" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-lg bg-white/90 backdrop-blur-md shadow-lg border border-white/50 overflow-hidden">
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); setMenuOpen(false); onDelete?.(notebook.id); }}
                  disabled={isDeleting}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                >
                  <TrashIcon className="size-4" />
                  {isDeleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="mt-1 text-xs font-medium text-slate-500">{notebook.course_code}</p>

        {notebook.description && (
          <p className="mt-2 text-xs text-slate-500 line-clamp-2">{notebook.description}</p>
        )}

        <p className="mt-auto pt-3 text-xs text-slate-400">{formatDate(notebook.created_at)}</p>
      </div>
    </div>
  );
}
