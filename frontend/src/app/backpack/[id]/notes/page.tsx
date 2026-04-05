'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { TrashIcon } from '@heroicons/react/24/outline';
import NotesTabs, { type NoteTab } from '../../../../components/NotesTabs';
import FileTree, { type FileTreeNode } from '../../../../components/FileTree';
import NotebookUploadAndCourseTagsModal from '../../../../modals/NotebookUploadAndCourseTagsModal';
import NoteEditor from '../../../../components/editor/NoteEditor';
import { useNotes, useCreateNote, useUpdateNote, useDeleteNote } from '../../../../hooks/useNotes';
import { useDocuments } from '../../../../hooks/useDocuments';
import type { NoteResponse, DocumentResponse } from '../../../../lib/api';

function buildFileTree(
  notes: NoteResponse[],
  documents: DocumentResponse[],
): FileTreeNode[] {
  const tree: FileTreeNode[] = [];

  if (notes.length > 0) {
    tree.push({
      id: '__folder-pages__',
      name: 'Pages',
      type: 'folder',
      children: notes.map((n) => ({ id: n.id, name: n.title, type: 'file' as const })),
    });
  }

  const material = documents.filter((d) => d.source_type === 'content');
  if (material.length > 0) {
    tree.push({
      id: '__folder-material__',
      name: 'Material',
      type: 'folder',
      children: material.map((d) => ({ id: d.id, name: d.filename, type: 'file' as const })),
    });
  }

  const courseInfo = documents.filter((d) => d.source_type === 'syllabus');
  if (courseInfo.length > 0) {
    tree.push({
      id: '__folder-course-info__',
      name: 'Course Information',
      type: 'folder',
      children: courseInfo.map((d) => ({ id: d.id, name: d.filename, type: 'file' as const })),
    });
  }

  return tree;
}

export default function NotesForNotebookPage() {
  const { id } = useParams<{ id: string }>();

  const [leftPaneOpen, setLeftPaneOpen] = useState(true);
  const [rightPaneOpen, setRightPaneOpen] = useState(true);
  const [uploadAndCourseTagsModalOpen, setUploadAndCourseTagsModalOpen] = useState(false);

  // Open tab IDs and active tab
  const [openNoteIds, setOpenNoteIds] = useState<string[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  // Local draft for the active note's content (title + body), for optimistic editing
  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: notes = [] } = useNotes(id);
  const { data: documents = [] } = useDocuments(id);
  const createNote = useCreateNote(id);
  const updateNote = useUpdateNote(id);
  const deleteNote = useDeleteNote(id);

  const activeNote = notes.find((n) => n.id === activeNoteId) ?? null;

  // Sync draft when active note changes
  useEffect(() => {
    if (activeNote) {
      setDraftTitle(activeNote.title);
      setDraftContent(activeNote.content);
    }
  }, [activeNoteId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Remove open tabs whose notes have been deleted.
  // Use a stable string of IDs as the dependency — notes is a new array
  // reference on every React Query render, which would cause an infinite loop.
  const noteIdKey = notes.map((n) => n.id).join(',');
  useEffect(() => {
    const noteIds = new Set(notes.map((n) => n.id));
    setOpenNoteIds((prev) => prev.filter((id) => noteIds.has(id)));
    setActiveNoteId((prev) => (prev && noteIds.has(prev) ? prev : null));
  }, [noteIdKey]); // eslint-disable-line react-hooks/exhaustive-deps

  function openNote(noteId: string) {
    setOpenNoteIds((prev) => (prev.includes(noteId) ? prev : [...prev, noteId]));
    setActiveNoteId(noteId);
  }

  function scheduleSave(noteId: string, title: string, content: string) {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      updateNote.mutate({ noteId, title, content });
    }, 800);
  }

  function handleTitleChange(value: string) {
    setDraftTitle(value);
    if (activeNoteId) scheduleSave(activeNoteId, value, draftContent);
  }

  function handleContentChange(value: string) {
    setDraftContent(value);
    if (activeNoteId) scheduleSave(activeNoteId, draftTitle, value);
  }

  async function handleAddTab() {
    const note = await createNote.mutateAsync({ title: 'New Note', content: '' });
    openNote(note.id);
  }

  function handleCloseTab(noteId: string) {
    setOpenNoteIds((prev) => {
      const next = prev.filter((id) => id !== noteId);
      if (activeNoteId === noteId) setActiveNoteId(next[next.length - 1] ?? null);
      return next;
    });
  }

  function handleDeleteActiveNote() {
    if (!activeNoteId) return;
    deleteNote.mutate(activeNoteId);
  }

  const tabs: NoteTab[] = openNoteIds.flatMap((noteId) => {
    const note = notes.find((n) => n.id === noteId);
    return note ? [{ id: note.id, title: note.title }] : [];
  });

  return (
    <div className="fixed inset-0 z-0 overflow-hidden h-screen">
      <div className="absolute inset-0 bg-[url('/forest-bg.png')] bg-center bg-cover bg-no-repeat">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(180,200,190,0.3)_0%,rgba(200,210,200,0.2)_50%,rgba(180,195,185,0.4)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(220,230,225,0.4)_0%,transparent_60%)]" />
      </div>

      <main className="relative z-10 h-full overflow-hidden">
        <div className="mx-auto max-w-full flex flex-row flex-1 pt-16 h-full">

          {/* File tree pane (left) */}
          <aside
            className={`overflow-hidden transition-[flex-basis] duration-200 flex-shrink-0 min-w-0 flex flex-col justify-end ${
              leftPaneOpen ? 'flex-[0_0_15%]' : 'flex-[0_0_0%]'
            }`}
          >
            {leftPaneOpen && (
              <section className="flex flex-col h-full justify-between p-4">
                <div className="w-full h-full flex items-start mt-4 justify-start p-4">
                  <FileTree
                    nodes={buildFileTree(notes, documents)}
                    onSelectFile={(node) => {
                      // Only notes are openable; document files are display-only
                      if (notes.some((n) => n.id === node.id)) openNote(node.id);
                    }}
                    selectedId={activeNoteId ?? undefined}
                  />
                </div>
              </section>
            )}
          </aside>

          {/* Upload / course tags modal */}
          <NotebookUploadAndCourseTagsModal
            isOpen={uploadAndCourseTagsModalOpen}
            onClose={() => setUploadAndCourseTagsModalOpen(false)}
            notebookId={id}
          />

          {/* Notes pane (center) */}
          <section className="relative h-full flex-1 min-w-0 overflow-hidden flex flex-col">
            <NotesTabs
              tabs={tabs}
              activeTab={activeNoteId ?? ''}
              onSelectTab={(noteId) => openNote(noteId)}
              onAddTab={handleAddTab}
              onCloseTab={handleCloseTab}
              leftPaneOpen={leftPaneOpen}
              rightPaneOpen={rightPaneOpen}
              handleOpenChatPanel={() => setRightPaneOpen(true)}
              handleOpenLeftPane={() => setLeftPaneOpen(true)}
              handleCloseLeftPane={() => setLeftPaneOpen(false)}
              handleCloseChatPanel={() => setRightPaneOpen(false)}
            />

            <div className="min-h-0 overflow-hidden flex flex-col h-full">
              <div className="p-2 glass-panel flex flex-col backdrop-blur-[30px] border-2 border-gray-300 rounded-xl flex-1 min-h-0 w-full h-full overflow-auto">
                {activeNote ? (
                  <div className="flex flex-col h-full">
                    {/* Note header: title + delete */}
                    <div className="flex items-center gap-2 px-6 pt-4 pb-1 border-b border-white/30">
                      <input
                        className="flex-1 bg-transparent text-xl font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none"
                        value={draftTitle}
                        onChange={(e) => handleTitleChange(e.target.value)}
                        placeholder="Note title"
                      />
                      <button
                        type="button"
                        onClick={handleDeleteActiveNote}
                        aria-label="Delete note"
                        className="rounded-md p-1 text-slate-400 hover:text-red-500 hover:bg-white/20"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                    {/* Rich text editor */}
                    <div className="flex-1 min-h-0 overflow-hidden">
                      <NoteEditor
                        noteId={activeNote.id}
                        content={activeNote.content}
                        onChange={handleContentChange}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-400 text-sm">
                    Select a note from the file tree or press + to create one.
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Chat pane (right) */}
          <aside
            className={`overflow-hidden transition-[flex-basis] duration-200 flex-shrink-0 min-w-0 flex flex-col justify-end ${
              rightPaneOpen ? 'flex-[0_0_25%]' : 'flex-[0_0_0%]'
            }`}
          >
            {rightPaneOpen && (
              <section className="flex flex-col h-full justify-between pl-2">
                <div />
                <div className="glass-panel border-2 border-gray-300 rounded-xl flex flex-col h-1/4 w-full items-start justify-start p-4 bg-white/10 backdrop-blur-[30px]">
                  How can I help you today?
                  <div className="mt-4 background-white/10 backdrop-blur-[30px] rounded-xl p-4 border-2 border-gray-300 w-full h-full" />
                </div>
              </section>
            )}
          </aside>

        </div>
      </main>
    </div>
  );
}
