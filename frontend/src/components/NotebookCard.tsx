'use client';

import type { NotebookResponse } from '../lib/api';
import { TrashIcon } from '@heroicons/react/24/outline';

interface NotebookCardProps {
  notebook: NotebookResponse;
  onDelete?: (id: number) => void;
  isDeleting?: boolean;
  onEdit?: (id: number) => void;
  isEditing?: boolean;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function NotebookCard({
  notebook,
  onDelete,
  isDeleting = false,
  onEdit,
  isEditing = false,
}: NotebookCardProps) {
  return (
    <article className="glass-panel rounded-xl p-5 shadow-sm backdrop-blur-[30px] transition-shadow hover:shadow-md hover:cursor-pointer flex flex-col">
      <div className="flex flex-col items-start">
        <h3 className="text-lg font-semibold text-slate-900">
          {notebook.title}
        </h3>
        <p className="mt-1 text-sm text-slate-700">
          {notebook.course_code}
        </p>
      </div>

      {notebook.description && (
        <p className="mt-2 line-clamp-2 text-sm text-slate-700">
          {notebook.description}
        </p>
      )}


      <div className="mt-auto flex justify-between items-center pt-4">
        <p className="text-xs text-green-700">
          Created on {formatDate(notebook.created_at)}
        </p>
          <button
            type="button"
            onClick={() => onDelete(notebook.id)}
            disabled={isDeleting}
            aria-label="Delete notebook"
            className="inline-flex items-center justify-center rounded-md p-2 text-slate-600 hover:cursor-pointer hover:text-slate-900 disabled:opacity-50"
          >
            <TrashIcon
              className={isDeleting ? 'size-5 animate-spin' : 'size-5'}
            />
          </button>
        </div>
    </article>
  );
}
 