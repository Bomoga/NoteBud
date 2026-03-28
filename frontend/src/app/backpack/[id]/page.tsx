'use client';

import { useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeftIcon, DocumentArrowUpIcon } from '@heroicons/react/24/outline';
import {
  getNotebook,
  uploadFile,
  getCourses,
  addNotebookTag,
  removeNotebookTag,
  type UploadFileResponse,
  type NotebookTagResponse,
} from '../../../lib/api';
import { useUpdateNotebook } from '../../../hooks/useNotebooks';

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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sourceType, setSourceType] = useState<'content' | 'syllabus'>('content');
  const [uploadResult, setUploadResult] = useState<UploadFileResponse | null>(null);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadFile(id, file, sourceType),
    onSuccess: (data) => setUploadResult(data),
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadResult(null);
    uploadMutation.mutate(file);
  }

  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: getCourses,
  });

  const [tagType, setTagType] = useState<'prerequisite' | 'relates-to'>('prerequisite');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [localTags, setLocalTags] = useState<NotebookTagResponse[]>([]);

  const addTagMutation = useMutation({
    mutationFn: () => addNotebookTag(id, tagType, selectedCourse),
    onSuccess: (data) => {
      setLocalTags((prev) => [...prev, data]);
      setSelectedCourse('');
    },
  });

  const removeTagMutation = useMutation({
    mutationFn: (courseCode: string) => removeNotebookTag(id, courseCode),
    onSuccess: (_, courseCode) => {
      setLocalTags((prev) => prev.filter((t) => t.course_code !== courseCode));
    },
  });

  function startEdit() {
    if (!notebook) return;
    setTitle(notebook.title);
    setCourseCode(notebook.course_code);
    setDescription(notebook.description ?? '');
    setIsEditing(true);
  }

  async function handleSave(e: React.FormEvent) {
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
            <div className="glass-panel rounded-xl p-6 shadow-sm backdrop-blur-[30px]">
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
                    <button
                      type="button"
                      onClick={startEdit}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Edit
                    </button>
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

            {/* File Upload */}
            <div className="mt-6 glass-panel rounded-xl p-6 shadow-sm backdrop-blur-[30px]">
              <h2 className="mb-4 text-base font-semibold text-slate-900">Upload Document</h2>

              <div className="mb-4 flex gap-2">
                {(['content', 'syllabus'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSourceType(type)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                      sourceType === type
                        ? 'bg-emerald-600 text-white'
                        : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 p-8 text-center hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors">
                <DocumentArrowUpIcon className="mb-2 size-8 text-slate-400" />
                <span className="text-sm text-slate-600">
                  {uploadMutation.isPending ? 'Uploading…' : 'Click to select a PDF, DOCX, or PPTX file'}
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.pptx"
                  onChange={handleFileChange}
                  disabled={uploadMutation.isPending}
                  className="hidden"
                />
              </label>

              {uploadMutation.isError && (
                <p className="mt-3 text-sm text-red-600">Upload failed. Please try again.</p>
              )}

              {uploadResult && (
                <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                  <p className="font-medium">{uploadResult.filename}</p>
                  <p className="mt-0.5 text-xs text-emerald-600 break-all">{uploadResult.gcs_uri}</p>
                </div>
              )}
            </div>
            {/* Course Tags */}
            <div className="mt-6 glass-panel rounded-xl p-6 shadow-sm backdrop-blur-[30px]">
              <h2 className="mb-4 text-base font-semibold text-slate-900">Course Tags</h2>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label htmlFor="courseSelect" className="mb-1 block text-sm font-medium text-slate-700">
                    Course
                  </label>
                  <select
                    id="courseSelect"
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">Select a course…</option>
                    {courses.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} — {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="tagType" className="mb-1 block text-sm font-medium text-slate-700">
                    Type
                  </label>
                  <select
                    id="tagType"
                    value={tagType}
                    onChange={(e) => setTagType(e.target.value as 'prerequisite' | 'relates-to')}
                    className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="prerequisite">Prerequisite</option>
                    <option value="relates-to">Relates to</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => addTagMutation.mutate()}
                  disabled={!selectedCourse || addTagMutation.isPending}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {addTagMutation.isPending ? 'Adding…' : 'Add'}
                </button>
              </div>

              {addTagMutation.isError && (
                <p className="mt-2 text-sm text-red-600">Failed to add tag. Please try again.</p>
              )}

              {localTags.length > 0 && (
                <ul className="mt-4 flex flex-wrap gap-2">
                  {localTags.map((tag) => (
                    <li
                      key={tag.course_code}
                      className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-sm text-emerald-800"
                    >
                      <span className="capitalize">{tag.type}</span>
                      <span className="font-medium">{tag.course_code}</span>
                      <button
                        type="button"
                        onClick={() => removeTagMutation.mutate(tag.course_code)}
                        disabled={removeTagMutation.isPending}
                        aria-label={`Remove ${tag.course_code}`}
                        className="ml-1 text-emerald-600 hover:text-emerald-900 disabled:opacity-50"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
