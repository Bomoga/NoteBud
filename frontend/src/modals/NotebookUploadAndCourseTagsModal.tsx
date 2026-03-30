'use client';

import { type ReactNode } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import NotebookUploadAndCourseTags from './NotebookUploadAndCourseTags';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (notebookId: string, courseTags: string[]) => void;
  notebookId?: string | null;
  children?: ReactNode;
};

export default function NotebookUploadAndCourseTagsModal({
  isOpen,
  onClose,
  notebookId,
}: Props) {
  if (!isOpen) return null;

  return (
    // Modal panel — 30% from top of the viewport
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />

      {/* Modal panel */}
      <div className="relative z-10 w-full max-w-3xl max-h-[min(90vh,900px)] overflow-hidden flex flex-col">
        <div className="glass-panel flex max-h-[min(90vh,900px)] flex-col overflow-hidden rounded-xl border border-white/40 bg-white/80 shadow-lg backdrop-blur-[30px]">
          <div className="flex items-center justify-between border-b border-white/40 px-6 py-4">
            <h2
              id="notebook-upload-modal-title"
              className="text-base font-semibold text-slate-900"
            >
              Upload document & course tags
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-md p-2 text-slate-700 hover:bg-white/60 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              aria-label="Close"
            >
              <XMarkIcon className="size-5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            {notebookId ? (
              <NotebookUploadAndCourseTags notebookId={notebookId} />
            ) : (
              <p className="text-sm text-red-600">
                Missing notebook context. Open notes from a notebook:{' '}
                <code className="rounded bg-red-50 px-1">/backpack/[id]/notes</code>.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

