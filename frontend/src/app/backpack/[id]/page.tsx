'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { getNotebook } from '../../../lib/api';
import { useUpdateNotebook } from '../../../hooks/useNotebooks';
import NotebookUploadAndCourseTagsModal from '../../../modals/NotebookUploadAndCourseTagsModal';

export default function NotebookDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: notebook, isLoading, isError } = useQuery({
    queryKey: ['notebook', id],
    queryFn: () => getNotebook(id),
  });

  const updateMutation = useUpdateNotebook();

  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [description, setDescription] = useState('');
  const [editValidationError, setEditValidationError] = useState<string | null>(null);
  const [uploadAndCourseTagsModalOpen, setUploadAndCourseTagsModalOpen] = useState(false);

  function startEdit() {
    if (!notebook) return;
    setTitle(notebook.title);
    setCourseCode(notebook.course_code);
    setDescription(notebook.description ?? '');
    setIsEditing(true);
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedCourseCode = courseCode.trim();
    if (!trimmedTitle || !trimmedCourseCode) {
      setEditValidationError('Title and course code cannot be empty.');
      return;
    }
    setEditValidationError(null);
    try {
      await updateMutation.mutateAsync({
        id,
        title: trimmedTitle,
        course_code: trimmedCourseCode,
        description: description.trim() || null,
      });
      setIsEditing(false);
    } catch (error) {
      // Keep isEditing true so the user can correct issues; error state will be reflected via updateMutation.isError
      console.error('Failed to update notebook:', error);
    }
  }

  const handleOpenUploadAndCourseTagsModal = () => {
    setUploadAndCourseTagsModalOpen(true);
  };

  const handleCloseUploadAndCourseTagsModal = () => {
    setUploadAndCourseTagsModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[url('/forest-bg.png')] bg-center bg-cover bg-no-repeat">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(180,200,190,0.3)_0%,rgba(200,210,200,0.2)_50%,rgba(180,195,185,0.4)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(220,230,225,0.4)_0%,transparent_60%)]" />
      </div>
      <main className="relative z-10 min-h-screen p-6 pt-24 sm:p-8 sm:pt-28">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/backpack"
            className="mb-6 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
          >
            <ArrowLeftIcon className="size-4" />
            Back to Backpack
          </Link>
          <div className="mb-6">
            <Link
              href={`/backpack/${id}/notes`}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white/50 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-white"
            >
              Open Notes
            </Link>
          </div>

          {isLoading && (
            <div className="flex min-h-[200px] items-center justify-center">
              <p className="text-slate-600">Loading notebook…</p>
            </div>
          )}

          {isError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6">
              <p className="font-medium text-red-800">Failed to load notebook</p>
              <p className="mt-1 text-sm text-red-600">Check that the backend is running and try again.</p>
            </div>
          )}

          {notebook && (
            <>
            <div className="glass-panel p-6 shadow-sm backdrop-blur-[30px]">
              {isEditing ? (
                <form onSubmit={handleSave} className="flex flex-col gap-4">
                  <div>
                    <label htmlFor="title" className="mb-1 block text-sm font-medium text-slate-700">
                      Title
                    </label>
                    <input
                      id="title"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="courseCode" className="mb-1 block text-sm font-medium text-slate-700">
                      Course code
                    </label>
                    <input
                      id="courseCode"
                      type="text"
                      value={courseCode}
                      onChange={(e) => setCourseCode(e.target.value)}
                      required
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="description" className="mb-1 block text-sm font-medium text-slate-700">
                      Description
                    </label>
                    <textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  {editValidationError && (
                    <p className="text-sm text-red-600">{editValidationError}</p>
                  )}
                  {updateMutation.isError && (
                    <p className="text-sm text-red-600">Failed to save changes. Please try again.</p>
                  )}
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={updateMutation.isPending}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {updateMutation.isPending ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex items-start justify-between">
                    <div>
                      <h1 className="text-2xl font-bold text-slate-900">{notebook.title}</h1>
                      <p className="mt-1 text-sm font-medium text-slate-600">{notebook.course_code}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleOpenUploadAndCourseTagsModal}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Upload / Tags
                      </button>
                      <button
                        type="button"
                        onClick={startEdit}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                  {notebook.description && (
                    <p className="mt-4 text-sm text-slate-700">{notebook.description}</p>
                  )}
                  <p className="mt-4 text-xs text-slate-500">
                    Created {new Date(notebook.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
                </>
              )}
            </div>

            <NotebookUploadAndCourseTagsModal
              isOpen={uploadAndCourseTagsModalOpen}
              onClose={handleCloseUploadAndCourseTagsModal}

              notebookId={id}
            />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
