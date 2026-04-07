'use client';

import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useParams } from 'next/navigation';
import { TrashIcon } from '@heroicons/react/24/outline';
import { PencilSquareIcon, DocumentTextIcon, AcademicCapIcon, LockClosedIcon, PlusIcon, FolderPlusIcon, ArrowUpTrayIcon } from '@heroicons/react/24/solid';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import NotesTabs, { type NoteTab } from '../../../../components/NotesTabs';
import FileTree, { type FileTreeNode, type SectionType } from '../../../../components/FileTree';
import NotebookUploadAndCourseTagsModal from '../../../../modals/NotebookUploadAndCourseTagsModal';
import NoteEditor from '../../../../components/editor/NoteEditor';
import ChatPanel from '../../../../components/ChatPanel';
import DocumentViewer from '../../../../components/DocumentViewer';
import { useNotes, useCreateNote, useUpdateNote, useDeleteNote } from '../../../../hooks/useNotes';
import { useDocuments, usePatchDocument } from '../../../../hooks/useDocuments';
import { uploadFile, type NoteResponse, type DocumentResponse } from '../../../../lib/api';

// ---------------------------------------------------------------------------
// buildFileTree — trie-based from folder_path strings
// ---------------------------------------------------------------------------

type FlatItem = { id: string; name: string; folder_path: string; status?: string };

function buildSectionChildren(
  items: FlatItem[],
  fileItemType: FileTreeNode['fileItemType'],
  sectionType: SectionType,
  deletable: boolean,
  extraFolderPaths: string[],
): FileTreeNode[] {
  // Collect all unique folder paths from items + extra (empty locally-created folders)
  const allPaths = new Set<string>([
    ...items.map((i) => i.folder_path ?? '').filter(Boolean),
    ...extraFolderPaths.filter(Boolean),
  ]);

  // Build a map: folderPath → FileTreeNode (folder)
  const folderMap = new Map<string, FileTreeNode>();
  for (const fullPath of allPaths) {
    const parts = fullPath.split('/');
    parts.reduce((parentPath, part) => {
      const path = parentPath ? `${parentPath}/${part}` : part;
      if (!folderMap.has(path)) {
        folderMap.set(path, {
          id: `__folder-${sectionType}-${path}__`,
          name: part,
          type: 'folder',
          folderPath: path,
          renamable: true,
          deletable: true,
          children: [],
        });
      }
      return path;
    }, '');
  }

  // Attach each folder to its parent folder (or to root if top-level)
  const rootFolders: FileTreeNode[] = [];
  for (const [path, node] of folderMap) {
    const lastSlash = path.lastIndexOf('/');
    if (lastSlash === -1) {
      rootFolders.push(node);
    } else {
      const parentPath = path.slice(0, lastSlash);
      folderMap.get(parentPath)?.children?.push(node);
    }
  }

  // Place file nodes into the correct folder (or root)
  const rootFiles: FileTreeNode[] = [];
  for (const item of items) {
    const fileNode: FileTreeNode = {
      id: item.id,
      name: item.name,
      type: 'file',
      fileItemType,
      status: item.status,
      deletable,
    };
    const fp = item.folder_path ?? '';
    if (!fp) {
      rootFiles.push(fileNode);
    } else {
      folderMap.get(fp)?.children?.push(fileNode);
    }
  }

  return [...rootFolders, ...rootFiles];
}

function buildFileTree(
  notes: NoteResponse[],
  documents: DocumentResponse[],
  localFolders: Record<SectionType, string[]>,
): FileTreeNode[] {
  const noteItems: FlatItem[] = notes.map((n) => ({
    id: n.id,
    name: n.title,
    folder_path: n.folder_path ?? '',
  }));
  const contentItems: FlatItem[] = documents
    .filter((d) => d.source_type === 'content')
    .map((d) => ({ id: d.id, name: d.filename, folder_path: d.folder_path ?? '', status: d.status }));
  const syllabusItems: FlatItem[] = documents
    .filter((d) => d.source_type === 'syllabus')
    .map((d) => ({ id: d.id, name: d.filename, folder_path: d.folder_path ?? '', status: d.status }));

  return [
    {
      id: '__section-notes__',
      name: 'Pages',
      type: 'section',
      sectionType: 'notes',
      children: buildSectionChildren(noteItems, 'note', 'notes', true, localFolders.notes),
    },
    {
      id: '__section-material__',
      name: 'Material',
      type: 'section',
      sectionType: 'material',
      children: buildSectionChildren(contentItems, 'content-doc', 'material', false, localFolders.material),
    },
    {
      id: '__section-syllabus__',
      name: 'Syllabus',
      type: 'section',
      sectionType: 'syllabus',
      children: buildSectionChildren(syllabusItems, 'syllabus-doc', 'syllabus', false, localFolders.syllabus),
    },
  ];
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function NotesForNotebookPage() {
  const { id } = useParams<{ id: string }>();

  const [leftPaneOpen, setLeftPaneOpen] = useState(true);
  const [rightPaneOpen, setRightPaneOpen] = useState(true);
  const [uploadAndCourseTagsModalOpen, setUploadAndCourseTagsModalOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionType>('notes');
  const [requestCreateFolder, setRequestCreateFolder] = useState<{ sectionType: SectionType; parentPath: string } | null>(null);

  // Tabs
  const [openNoteIds, setOpenNoteIds] = useState<string[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);

  // Draft editing
  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentUploadRef = useRef<HTMLInputElement>(null);
  const syllabusUploadRef = useRef<HTMLInputElement>(null);

  // Empty locally-created folders (lost on reload if no files placed in them)
  const [localFolders, setLocalFolders] = useState<Record<SectionType, string[]>>({
    notes: [], material: [], syllabus: [],
  });

  const queryClient = useQueryClient();
  const { data: notes = [] } = useNotes(id);
  const { data: documents = [] } = useDocuments(id);
  const createNote = useCreateNote(id);
  const updateNote = useUpdateNote(id);
  const deleteNote = useDeleteNote(id);
  const patchDocument = usePatchDocument(id);

  const uploadMutation = useMutation({
    mutationFn: ({ file, sourceType }: { file: File; sourceType: 'content' | 'syllabus' }) =>
      uploadFile(id, file, sourceType),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents', id] }),
  });

  function handleUploadFile(sectionType: 'material' | 'syllabus', file: File) {
    uploadMutation.mutate({ file, sourceType: sectionType === 'material' ? 'content' : 'syllabus' });
  }

  const activeNote = notes.find((n) => n.id === activeNoteId) ?? null;

  // Sync draft on note switch
  useEffect(() => {
    if (activeNote) {
      setDraftTitle(activeNote.title);
      setDraftContent(activeNote.content);
    }
  }, [activeNoteId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clean up deleted-note tabs
  const noteIdKey = notes.map((n) => n.id).join(',');
  useEffect(() => {
    const noteIds = new Set(notes.map((n) => n.id));
    setOpenNoteIds((prev) => prev.filter((id) => noteIds.has(id)));
    setActiveNoteId((prev) => (prev && noteIds.has(prev) ? prev : null));
  }, [noteIdKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Navigation ────────────────────────────────────────────────────────────

  function openNote(noteId: string) {
    setOpenNoteIds((prev) => (prev.includes(noteId) ? prev : [...prev, noteId]));
    setActiveNoteId(noteId);
    setActiveDocumentId(null);
  }

  function openDocument(documentId: string) {
    setActiveDocumentId(documentId);
    setActiveNoteId(null);
  }

  // ── Editing ───────────────────────────────────────────────────────────────

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

  // ── Tab management ────────────────────────────────────────────────────────

  async function handleAddTab(folderPath = '') {
    const note = await createNote.mutateAsync({ title: 'New Note', content: '', folder_path: folderPath });
    setDraftTitle('New Note');
    setDraftContent('');
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

  // ── Folder management ─────────────────────────────────────────────────────

  function handleCreateFolder(sectionType: SectionType, parentPath: string, name: string) {
    const fullPath = parentPath ? `${parentPath}/${name}` : name;
    setLocalFolders((prev) => ({
      ...prev,
      [sectionType]: prev[sectionType].includes(fullPath)
        ? prev[sectionType]
        : [...prev[sectionType], fullPath],
    }));
  }

  function handleMoveFile(node: FileTreeNode, targetFolderPath: string) {
    if (notes.some((n) => n.id === node.id)) {
      updateNote.mutate({ noteId: node.id, folder_path: targetFolderPath });
    } else if (documents.some((d) => d.id === node.id)) {
      patchDocument.mutate({ documentId: node.id, payload: { folder_path: targetFolderPath } });
    }
  }

  function handleRenameFolder(sectionType: SectionType, oldPath: string, newName: string) {
    // Derive new path: replace last segment of oldPath with newName
    const parts = oldPath.split('/');
    parts[parts.length - 1] = newName;
    const newPath = parts.join('/');

    // Fan-out: update all notes/docs whose folder_path starts with oldPath
    if (sectionType === 'notes') {
      notes
        .filter((n) => (n.folder_path ?? '').startsWith(oldPath))
        .forEach((n) => {
          const updated = (n.folder_path ?? '').replace(oldPath, newPath);
          updateNote.mutate({ noteId: n.id, folder_path: updated });
        });
    } else {
      documents
        .filter((d) => (d.folder_path ?? '').startsWith(oldPath))
        .forEach((d) => {
          const updated = (d.folder_path ?? '').replace(oldPath, newPath);
          patchDocument.mutate({ documentId: d.id, payload: { folder_path: updated } });
        });
    }

    // Update local empty folders too
    setLocalFolders((prev) => ({
      ...prev,
      [sectionType]: prev[sectionType].map((p) => p.startsWith(oldPath) ? p.replace(oldPath, newPath) : p),
    }));
  }

  function handleDeleteFolder(sectionType: SectionType, folderPath: string) {
    // Move all files in folder back to root
    if (sectionType === 'notes') {
      notes
        .filter((n) => (n.folder_path ?? '').startsWith(folderPath))
        .forEach((n) => updateNote.mutate({ noteId: n.id, folder_path: '' }));
    } else {
      documents
        .filter((d) => (d.folder_path ?? '').startsWith(folderPath))
        .forEach((d) => patchDocument.mutate({ documentId: d.id, payload: { folder_path: '' } }));
    }

    // Remove from local empty folders
    setLocalFolders((prev) => ({
      ...prev,
      [sectionType]: prev[sectionType].filter((p) => !p.startsWith(folderPath)),
    }));
  }

  const tabs: NoteTab[] = openNoteIds.flatMap((noteId) => {
    const note = notes.find((n) => n.id === noteId);
    return note ? [{ id: note.id, title: note.title }] : [];
  });

  const treeNodes = buildFileTree(notes, documents, localFolders);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden h-screen">
      <div className="absolute inset-0 bg-[url('/forest-bg.png')] bg-center bg-cover bg-no-repeat">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(180,200,190,0.3)_0%,rgba(200,210,200,0.2)_50%,rgba(180,195,185,0.4)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(220,230,225,0.4)_0%,transparent_60%)]" />
      </div>

      <main className="relative z-10 h-full overflow-hidden">
        <div className="mx-auto max-w-full flex flex-row flex-1 pt-16 h-full gap-0">

          {/* File tree pane (collapsible) */}
          <aside
            className={`overflow-hidden transition-[flex-basis] duration-200 flex-shrink-0 min-w-0 ${
              leftPaneOpen ? 'flex-[0_0_17%]' : 'flex-[0_0_0%]'
            }`}
          >
            {leftPaneOpen && (
              <div className="glass-panel border-r border-white/30 backdrop-blur-[30px] w-full h-full flex flex-col overflow-hidden">
                {/* Hidden upload inputs */}
                <input ref={contentUploadRef} type="file" accept=".pdf,.docx,.pptx" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadFile('material', f); e.target.value = ''; }} />
                <input ref={syllabusUploadRef} type="file" accept=".pdf,.docx,.pptx" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadFile('syllabus', f); e.target.value = ''; }} />

                {/* Section tab bar */}
                <div className="flex flex-shrink-0 items-stretch border-b border-white/30">
                  {/* Tabs */}
                  <div className="flex flex-1">
                    {(
                      [
                        { section: 'notes' as SectionType, Icon: PencilSquareIcon, label: 'Pages', activeColor: 'text-violet-600 border-violet-500', activeBg: 'bg-violet-500/8' },
                        { section: 'material' as SectionType, Icon: DocumentTextIcon, label: 'Material', activeColor: 'text-sky-600 border-sky-500', activeBg: 'bg-sky-500/8' },
                        { section: 'syllabus' as SectionType, Icon: AcademicCapIcon, label: 'Syllabus', activeColor: 'text-amber-600 border-amber-500', activeBg: 'bg-amber-500/8' },
                      ] as const
                    ).map(({ section, Icon, label, activeColor, activeBg }) => {
                      const isActive = activeSection === section;
                      return (
                        <button
                          key={section}
                          type="button"
                          onClick={() => setActiveSection(section)}
                          title={label}
                          className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium border-b-2 transition-colors ${
                            isActive
                              ? `${activeColor} ${activeBg}`
                              : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-white/20'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Action buttons for active section */}
                  <div className="flex items-center gap-0.5 px-1.5 border-l border-white/20">
                    {activeSection === 'notes' && (
                      <>
                        <button type="button" title="New note" onClick={() => handleAddTab()}
                          className="rounded p-1 text-slate-400 hover:text-violet-600 hover:bg-white/30 transition-colors">
                          <PlusIcon className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" title="New folder" onClick={() => setRequestCreateFolder({ sectionType: 'notes', parentPath: '' })}
                          className="rounded p-1 text-slate-400 hover:text-slate-600 hover:bg-white/30 transition-colors">
                          <FolderPlusIcon className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                    {activeSection === 'material' && (
                      <>
                        <button type="button" title="Upload file" onClick={() => contentUploadRef.current?.click()}
                          className="rounded p-1 text-slate-400 hover:text-sky-600 hover:bg-white/30 transition-colors">
                          <ArrowUpTrayIcon className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" title="New folder" onClick={() => setRequestCreateFolder({ sectionType: 'material', parentPath: '' })}
                          className="rounded p-1 text-slate-400 hover:text-slate-600 hover:bg-white/30 transition-colors">
                          <FolderPlusIcon className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                    {activeSection === 'syllabus' && (
                      <button type="button" title="Upload syllabus" onClick={() => syllabusUploadRef.current?.click()}
                        className="rounded p-1 text-slate-400 hover:text-amber-600 hover:bg-white/30 transition-colors">
                        <ArrowUpTrayIcon className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Tree content */}
                <div className="flex-1 overflow-auto p-2">
                  <FileTree
                    nodes={treeNodes.filter((n) => n.sectionType === activeSection)}
                    onSelectFile={(node) => {
                      if (notes.some((n) => n.id === node.id)) openNote(node.id);
                      else if (documents.some((d) => d.id === node.id)) openDocument(node.id);
                    }}
                    onDeleteFile={(node) => deleteNote.mutate(node.id)}
                    onMoveFile={handleMoveFile}
                    onCreateFolder={handleCreateFolder}
                    onRenameFolder={handleRenameFolder}
                    onDeleteFolder={handleDeleteFolder}
                    onAddNote={handleAddTab}
                    onUploadFile={handleUploadFile}
                    showSectionHeaders={false}
                    requestCreateFolder={requestCreateFolder}
                    onCreateFolderHandled={() => setRequestCreateFolder(null)}
                    selectedId={activeNoteId ?? activeDocumentId ?? undefined}
                  />
                </div>
              </div>
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
            <div className="glass-panel flex flex-col backdrop-blur-[30px] border-r border-white/30 flex-1 min-h-0 h-full overflow-hidden">
              <NotesTabs
                tabs={tabs}
                activeTab={activeNoteId ?? ''}
                onSelectTab={(noteId) => openNote(noteId)}
                onAddTab={() => handleAddTab()}
                onCloseTab={handleCloseTab}
                leftPaneOpen={leftPaneOpen}
                rightPaneOpen={rightPaneOpen}
                handleOpenChatPanel={() => setRightPaneOpen(true)}
                handleOpenLeftPane={() => setLeftPaneOpen(true)}
                handleCloseLeftPane={() => setLeftPaneOpen(false)}
                handleCloseChatPanel={() => setRightPaneOpen(false)}
              />
              <div className="flex-1 min-h-0 overflow-auto relative">
                <AnimatePresence mode="wait" initial={false}>
                  {activeNote ? (
                    <motion.div
                      key={activeNote.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 1 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                      className="flex flex-col h-full"
                    >
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
                      <div className="flex-1 min-h-0 overflow-hidden">
                        <NoteEditor
                          noteId={activeNote.id}
                          content={activeNote.content}
                          onChange={handleContentChange}
                        />
                      </div>
                    </motion.div>
                  ) : activeDocumentId ? (
                    (() => {
                      const doc = documents.find((d) => d.id === activeDocumentId);
                      return doc ? (
                        <motion.div
                          key={doc.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 1 }}
                          transition={{ duration: 0.15, ease: 'easeOut' }}
                        >
                          <DocumentViewer document={doc} />
                        </motion.div>
                      ) : null;
                    })()
                  ) : (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="flex h-full items-center justify-center text-slate-400 text-sm"
                    >
                      Select a note from the file tree or press + to create one.
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </section>

          {/* Chat pane (right) */}
          <aside
            className={`overflow-hidden transition-[flex-basis] duration-200 flex-shrink-0 min-w-0 ${
              rightPaneOpen ? 'flex-[0_0_25%]' : 'flex-[0_0_0%]'
            }`}
          >
            {rightPaneOpen && <ChatPanel notebookId={id} />}
          </aside>

        </div>
      </main>
    </div>
  );
}
