'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DocumentArrowUpIcon } from '@heroicons/react/24/outline';

import {
  uploadFile,
  getCourses,
  addNotebookTag,
  removeNotebookTag,
  type UploadFileResponse,
  type NotebookTagResponse,
  type CourseResponse,
} from '../lib/api';

type Props = {
  notebookId: string;
  notebookCourseCode?: string;
  className?: string;
};

export default function NotebookUploadAndCourseTags({
  notebookId,
  notebookCourseCode,
  className,
}: Props) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sourceType, setSourceType] = useState<'content' | 'syllabus'>('content');
  const [uploadResult, setUploadResult] = useState<UploadFileResponse | null>(null);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadFile(notebookId, file, sourceType),
    onSuccess: (data) => {
      setUploadResult(data);
      queryClient.invalidateQueries({ queryKey: ['documents', notebookId] });
    },
  });

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
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
    mutationFn: () => addNotebookTag(notebookId, tagType, selectedCourse),
    onSuccess: (data) => {
      setLocalTags((prev) => {
        const exists = prev.some((t) => t.course_code === data.course_code);
        return exists ? prev : [...prev, data];
      });
      setSelectedCourse('');
    },
  });

  const removeTagMutation = useMutation({
    mutationFn: (courseCode: string) => removeNotebookTag(notebookId, courseCode),
    onSuccess: (_, courseCode) => {
      setLocalTags((prev) => prev.filter((t) => t.course_code !== courseCode));
    },
  });

  const filteredCourses: CourseResponse[] = (courses || []).filter((c) =>
    notebookCourseCode ? c.code !== notebookCourseCode : true
  );

  return (
    <div className={`flex flex-col gap-6 ${className ?? ''}`}>
      {/* File Upload */}
      <div className="glass-panel rounded-xl p-6 shadow-sm backdrop-blur-[30px]">
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
      <div className="glass-panel rounded-xl p-6 shadow-sm backdrop-blur-[30px]">
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
              {filteredCourses.map((c) => (
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
    </div>
  );
}

