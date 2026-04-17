'use client';

import {
  DocumentTextIcon,
  DocumentChartBarIcon,
  DocumentIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import type { DocumentResponse } from '../lib/api';

interface Props {
  document: DocumentResponse;
}

function FileTypeIcon({ fileType }: { fileType: string }) {
  const t = fileType.toLowerCase();
  if (t === 'pdf') return <DocumentTextIcon className="h-12 w-12 text-red-400" />;
  if (t === 'pptx' || t === 'ppt') return <DocumentChartBarIcon className="h-12 w-12 text-orange-400" />;
  return <DocumentIcon className="h-12 w-12 text-slate-400" />;
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s === 'ingested' || s === 'completed') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
        <CheckCircleIcon className="h-3.5 w-3.5" />
        Ingested
      </span>
    );
  }
  if (s === 'processing' || s === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
        <ClockIcon className="h-3.5 w-3.5" />
        Processing
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
      <ExclamationCircleIcon className="h-3.5 w-3.5" />
      {status}
    </span>
  );
}

function SourceTypeBadge({ sourceType }: { sourceType: 'content' | 'syllabus' }) {
  return sourceType === 'syllabus' ? (
    <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700">
      Course Information
    </span>
  ) : (
    <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-700">
      Material
    </span>
  );
}

export default function DocumentViewer({ document }: Props) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 py-12 text-center">
      <FileTypeIcon fileType={document.file_type} />

      <h2 className="mt-4 text-lg font-semibold text-slate-800 break-all leading-snug">
        {document.filename}
      </h2>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <SourceTypeBadge sourceType={document.source_type} />
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 uppercase">
          {document.file_type}
        </span>
        <StatusBadge status={document.status} />
      </div>

      <p className="mt-5 max-w-xs text-sm text-slate-500 leading-relaxed">
        This document has been ingested into the notebook. Ask the chat assistant any
        question — it will search this file alongside your notes.
      </p>

      <div className="mt-6 w-full max-w-sm rounded-lg border border-slate-200 bg-white/40 px-4 py-3 text-left">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Storage URI</p>
        <p className="break-all font-mono text-[11px] text-slate-500">{document.gcs_uri}</p>
      </div>
    </div>
  );
}
