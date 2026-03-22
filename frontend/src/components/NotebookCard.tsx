'use client';

import type { NotebookResponse } from '../lib/api';

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
    <article className="glass-panel rounded-xl p-5 shadow-sm backdrop-blur-[30px] transition-shadow hover:shadow-md">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
        {notebook.title}
      </h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {notebook.course_code}
      </p>
      {notebook.description && (
        <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
          {notebook.description}
        </p>
      )}
      <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
        Created {formatDate(notebook.created_at)}
      </p>
      {onDelete && (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => onDelete(notebook.id)}
            disabled={isDeleting}
            className="rounded-md bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-200 disabled:opacity-50 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
          >
            {isDeleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      )}
    </article>
  );
}
 