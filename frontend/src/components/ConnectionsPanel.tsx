'use client';

import { useState } from 'react';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  XMarkIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  SparklesIcon,
  PlusIcon,
} from '@heroicons/react/24/solid';
import { useLinks, useCreateLink, useDeleteLink, useSimilarNotebooks } from '../hooks/useLinks';
import { useNotebooks } from '../hooks/useNotebooks';
import type { LinkType } from '../lib/api/links';

const LINK_TYPE_LABELS: Record<LinkType, string> = {
  'prerequisite': 'Prerequisite',
  'related-to': 'Related to',
};

const LINK_TYPE_COLORS: Record<LinkType, string> = {
  'prerequisite': 'text-violet-700 bg-violet-500/10 border-violet-300/60',
  'related-to': 'text-sky-700 bg-sky-500/10 border-sky-300/60',
};

interface Props {
  notebookId: string;
}

export default function ConnectionsPanel({ notebookId }: Props) {
  const [open, setOpen] = useState(false);
  const [linkType, setLinkType] = useState<LinkType>('prerequisite');
  const [targetId, setTargetId] = useState('');
  const [similarEnabled, setSimilarEnabled] = useState(false);

  const { data: links, isLoading: linksLoading } = useLinks(notebookId);
  const { data: allNotebooks = [] } = useNotebooks();
  const createLink = useCreateLink(notebookId);
  const deleteLink = useDeleteLink(notebookId);
  const { data: similar = [], isFetching: similarFetching } = useSimilarNotebooks(notebookId, similarEnabled);

  const outbound = links?.outbound ?? [];
  const inbound = links?.inbound ?? [];
  const totalCount = outbound.length + inbound.length;

  // Notebooks available to link to — exclude self and already-linked outbound targets
  const linkedOutboundIds = new Set(outbound.map((l) => l.to_notebook_id));
  const availableNotebooks = allNotebooks.filter(
    (n) => n.id !== notebookId && !linkedOutboundIds.has(n.id)
  );

  function handleAdd() {
    if (!targetId) return;
    createLink.mutate({ to_notebook_id: targetId, link_type: linkType });
    setTargetId('');
  }

  function handleSuggestLink(suggestedId: string) {
    setTargetId(suggestedId);
    setLinkType('related-to');
  }

  return (
    <div className="flex-shrink-0 border-t border-white/20">
      {/* Toggle row */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-white/10 transition-colors"
      >
        <span className="flex-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Connections
          {totalCount > 0 && (
            <span className="ml-1.5 rounded-full bg-slate-200/60 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
              {totalCount}
            </span>
          )}
        </span>
        {open ? (
          <ChevronDownIcon className="h-3.5 w-3.5 text-slate-400" />
        ) : (
          <ChevronUpIcon className="h-3.5 w-3.5 text-slate-400" />
        )}
      </button>

      {/* Expanded content */}
      {open && (
        <div className="px-3 pb-3 space-y-3 max-h-72 overflow-y-auto">
          {/* Add link form */}
          <div className="flex gap-1.5 items-center">
            <select
              value={linkType}
              onChange={(e) => setLinkType(e.target.value as LinkType)}
              className="rounded-md border border-white/30 bg-white/20 px-2 py-1 text-[12px] text-slate-700 focus:outline-none focus:border-emerald-400"
            >
              <option value="prerequisite">Prerequisite</option>
              <option value="related-to">Related to</option>
            </select>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="flex-1 min-w-0 rounded-md border border-white/30 bg-white/20 px-2 py-1 text-[12px] text-slate-700 focus:outline-none focus:border-emerald-400"
            >
              <option value="">Select notebook…</option>
              {availableNotebooks.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.course_code} — {n.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!targetId || createLink.isPending}
              className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-500/10 disabled:opacity-30 transition-colors"
              title="Add link"
            >
              <PlusIcon className="h-4 w-4" />
            </button>
          </div>

          {linksLoading && (
            <p className="text-[11px] text-slate-400 text-center py-1">Loading…</p>
          )}

          {/* Outbound */}
          {outbound.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1 flex items-center gap-1">
                <ArrowRightIcon className="h-2.5 w-2.5" /> Outbound
              </p>
              <ul className="space-y-1">
                {outbound.map((link) => (
                  <li key={link.id} className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 ${LINK_TYPE_COLORS[link.link_type as LinkType]}`}>
                    <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
                      {LINK_TYPE_LABELS[link.link_type as LinkType]}
                    </span>
                    <span className="flex-1 truncate text-[12px] font-medium">
                      {link.to_notebook_course_code}
                      <span className="ml-1 font-normal opacity-70">{link.to_notebook_title}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteLink.mutate(link.id)}
                      disabled={deleteLink.isPending}
                      className="rounded p-0.5 opacity-50 hover:opacity-100 hover:text-red-500 transition-colors"
                    >
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Inbound */}
          {inbound.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1 flex items-center gap-1">
                <ArrowLeftIcon className="h-2.5 w-2.5" /> Inbound
              </p>
              <ul className="space-y-1">
                {inbound.map((link) => (
                  <li key={link.id} className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 ${LINK_TYPE_COLORS[link.link_type as LinkType]}`}>
                    <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
                      {LINK_TYPE_LABELS[link.link_type as LinkType]}
                    </span>
                    <span className="flex-1 truncate text-[12px] font-medium">
                      {link.from_notebook_course_code}
                      <span className="ml-1 font-normal opacity-70">{link.from_notebook_title}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!linksLoading && outbound.length === 0 && inbound.length === 0 && (
            <p className="text-[11px] text-slate-400 text-center py-1">No connections yet.</p>
          )}

          {/* Suggested */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 flex items-center gap-1">
                <SparklesIcon className="h-2.5 w-2.5" /> Suggested
              </p>
              {!similarEnabled ? (
                <button
                  type="button"
                  onClick={() => setSimilarEnabled(true)}
                  className="text-[10px] text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                >
                  Find similar
                </button>
              ) : similarFetching ? (
                <span className="text-[10px] text-slate-400">Searching…</span>
              ) : null}
            </div>
            {similarEnabled && !similarFetching && similar.length === 0 && (
              <p className="text-[11px] text-slate-400 text-center py-1">No similar notebooks found.</p>
            )}
            {similar.length > 0 && (
              <ul className="space-y-1">
                {similar.map((s) => {
                  const alreadyLinked = linkedOutboundIds.has(s.notebook_id);
                  return (
                    <li key={s.notebook_id} className="flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300/60 bg-slate-500/5 px-2 py-1">
                      <span className="flex-1 truncate text-[12px] text-slate-600">
                        <span className="font-medium">{s.course_code}</span>
                        <span className="ml-1 opacity-70">{s.title}</span>
                      </span>
                      <span className="text-[10px] text-slate-400 tabular-nums">
                        {Math.round(s.avg_score * 100)}%
                      </span>
                      {!alreadyLinked && (
                        <button
                          type="button"
                          onClick={() => handleSuggestLink(s.notebook_id)}
                          className="rounded p-0.5 text-slate-400 hover:text-emerald-600 transition-colors"
                          title="Add as connection"
                        >
                          <PlusIcon className="h-3 w-3" />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
