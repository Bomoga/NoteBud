'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  FolderIcon,
  FolderOpenIcon,
  FolderPlusIcon,
  PencilSquareIcon,
  DocumentTextIcon,
  AcademicCapIcon,
  LockClosedIcon,
  TrashIcon,
  PlusIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/solid';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FileItemType = 'note' | 'content-doc' | 'syllabus-doc';
export type SectionType = 'notes' | 'material' | 'syllabus';

export type FileTreeNode = {
  id: string;
  name: string;
  type: 'section' | 'folder' | 'file';
  fileItemType?: FileItemType;    // files only
  sectionType?: SectionType;      // sections only
  folderPath?: string;            // folders only — the full path this node represents
  status?: string;                // files only — document processing status
  deletable?: boolean;
  renamable?: boolean;
  children?: FileTreeNode[];
};

type ContextMenuState =
  | { kind: 'file'; x: number; y: number; node: FileTreeNode }
  | { kind: 'folder'; x: number; y: number; node: FileTreeNode };

type FileTreeProps = {
  nodes: FileTreeNode[];
  onSelectFile?: (node: FileTreeNode) => void;
  onDeleteFile?: (node: FileTreeNode) => void;
  onMoveFile?: (node: FileTreeNode, targetFolderPath: string) => void;
  onCreateFolder?: (sectionType: SectionType, parentPath: string, name: string) => void;
  onRenameFolder?: (sectionType: SectionType, oldPath: string, newName: string) => void;
  onDeleteFolder?: (sectionType: SectionType, folderPath: string) => void;
  onAddNote?: (folderPath: string) => void;
  onUploadFile?: (sectionType: 'material' | 'syllabus', file: File) => void;
  selectedId?: string;
  className?: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const INDENT = 14;
const BASE_PADDING = 4;

function sectionMeta(sectionType: SectionType) {
  switch (sectionType) {
    case 'notes':
      return { label: 'Pages', colorClass: 'text-violet-600', bgClass: 'bg-violet-500/5' };
    case 'material':
      return { label: 'Material', colorClass: 'text-sky-600', bgClass: 'bg-sky-500/5' };
    case 'syllabus':
      return { label: 'Syllabus', colorClass: 'text-amber-600', bgClass: 'bg-amber-500/5' };
  }
}

function fileIcon(fileItemType: FileItemType, processing: boolean) {
  const cls = processing ? 'text-amber-400' : fileItemType === 'note'
    ? 'text-violet-500'
    : fileItemType === 'content-doc'
      ? 'text-sky-500'
      : 'text-amber-500';
  const Icon = fileItemType === 'note'
    ? PencilSquareIcon
    : fileItemType === 'content-doc'
      ? DocumentTextIcon
      : AcademicCapIcon;
  return <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${cls}`} />;
}

function collectFolders(nodes: FileTreeNode[]): FileTreeNode[] {
  return nodes.flatMap((n) => {
    if (n.type === 'folder') return [n, ...collectFolders(n.children ?? [])];
    if (n.type === 'section') return collectFolders(n.children ?? []);
    return [];
  });
}

function countFiles(node: FileTreeNode): number {
  if (node.type === 'file') return 1;
  return (node.children ?? []).reduce((s, c) => s + countFiles(c), 0);
}

// ---------------------------------------------------------------------------
// Inline folder-name input
// ---------------------------------------------------------------------------

function InlineFolderInput({
  depth,
  onConfirm,
  onCancel,
}: {
  depth: number;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      const v = ref.current?.value.trim() ?? '';
      if (v) onConfirm(v);
      else onCancel();
    }
    if (e.key === 'Escape') onCancel();
  }

  return (
    <li>
      <div
        className="flex items-center gap-1.5 py-[3px] pr-3"
        style={{ paddingLeft: BASE_PADDING + depth * INDENT + 20 }}
      >
        <FolderIcon className="h-3.5 w-3.5 flex-shrink-0 text-amber-400" />
        <input
          ref={ref}
          onKeyDown={handleKey}
          onBlur={onCancel}
          className="flex-1 min-w-0 rounded bg-white/40 px-1 text-[13px] text-slate-800 focus:outline-none border border-white/60"
          placeholder="Folder name…"
        />
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// TreeBranch
// ---------------------------------------------------------------------------

function TreeBranch({
  node,
  depth,
  expanded,
  toggleExpanded,
  onSelectFile,
  onContextMenu,
  onAddFolder,
  creatingIn,
  onFolderConfirm,
  onFolderCancel,
  selectedId,
  renamingPath,
  onRenameConfirm,
  onRenameCancel,
  onAddNote,
  onTriggerUpload,
}: {
  node: FileTreeNode;
  depth: number;
  expanded: Record<string, boolean>;
  toggleExpanded: (id: string) => void;
  onSelectFile?: (node: FileTreeNode) => void;
  onContextMenu?: (e: React.MouseEvent, node: FileTreeNode) => void;
  onAddFolder?: (sectionType: SectionType, parentPath: string) => void;
  creatingIn: { sectionType: SectionType; parentPath: string } | null;
  onFolderConfirm: (name: string) => void;
  onFolderCancel: () => void;
  selectedId?: string;
  renamingPath: string | null;
  onRenameConfirm: (newName: string) => void;
  onRenameCancel: () => void;
  onAddNote?: (folderPath: string) => void;
  onTriggerUpload?: (sectionType: 'material' | 'syllabus') => void;
}) {
  const isOpen = expanded[node.id] ?? true;
  const isSelected = node.id === selectedId;
  const indent = BASE_PADDING + depth * INDENT;
  const rowBase =
    'group flex w-full items-center gap-1.5 py-[3px] pr-2 text-left text-[13px] leading-5 cursor-pointer select-none transition-colors duration-75 rounded-sm';

  // ── SECTION ──────────────────────────────────────────────────────────────
  if (node.type === 'section') {
    const meta = sectionMeta(node.sectionType!);
    const fileCount = countFiles(node);
    const isCreatingHere =
      creatingIn?.sectionType === node.sectionType && creatingIn?.parentPath === '';

    return (
      <li>
        {/* Section header */}
        <div
          className={`group flex w-full items-center gap-1 py-[3px] pr-2 rounded-sm ${meta.bgClass}`}
          style={{ paddingLeft: indent }}
        >
          <span className={`flex-1 text-[11px] font-semibold uppercase tracking-wide ${meta.colorClass}`}>
            {meta.label}
          </span>
          {node.sectionType === 'syllabus' && (
            <LockClosedIcon
              className="h-3 w-3 text-amber-400 flex-shrink-0"
              title="Not included in AI search"
            />
          )}
          <span className="text-[10px] text-slate-400 tabular-nums mr-1">{fileCount}</span>
          {node.sectionType === 'notes' && (
            <>
              <button
                type="button"
                title="New note"
                onClick={() => onAddNote?.('')}
                className="opacity-0 group-hover:opacity-100 rounded p-0.5 text-slate-400 hover:text-violet-600 focus:opacity-100 hover:bg-white/30"
              >
                <PlusIcon className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                title="New folder"
                onClick={() => onAddFolder?.(node.sectionType!, '')}
                className="opacity-0 group-hover:opacity-100 rounded p-0.5 text-slate-400 hover:text-slate-600 focus:opacity-100 hover:bg-white/30"
              >
                <FolderPlusIcon className="h-3.5 w-3.5" />
              </button>
            </>
          )}
          {(node.sectionType === 'material' || node.sectionType === 'syllabus') && (
            <button
              type="button"
              title="Upload file"
              onClick={() => onTriggerUpload?.(node.sectionType as 'material' | 'syllabus')}
              className="opacity-0 group-hover:opacity-100 rounded p-0.5 text-slate-400 hover:text-sky-600 focus:opacity-100 hover:bg-white/30"
            >
              <ArrowUpTrayIcon className="h-3.5 w-3.5" />
            </button>
          )}
          {node.sectionType === 'material' && (
            <button
              type="button"
              title="New folder"
              onClick={() => onAddFolder?.(node.sectionType!, '')}
              className="opacity-0 group-hover:opacity-100 rounded p-0.5 text-slate-400 hover:text-slate-600 focus:opacity-100 hover:bg-white/30"
            >
              <FolderPlusIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Children + inline creation */}
        <ul>
          {(node.children ?? []).map((child) => (
            <TreeBranch
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              toggleExpanded={toggleExpanded}
              onSelectFile={onSelectFile}
              onContextMenu={onContextMenu}
              onAddFolder={onAddFolder}
              creatingIn={creatingIn}
              onFolderConfirm={onFolderConfirm}
              onFolderCancel={onFolderCancel}
              selectedId={selectedId}
              renamingPath={renamingPath}
              onRenameConfirm={onRenameConfirm}
              onRenameCancel={onRenameCancel}
              onAddNote={onAddNote}
              onTriggerUpload={onTriggerUpload}
            />
          ))}
          {isCreatingHere && (
            <InlineFolderInput
              depth={depth + 1}
              onConfirm={onFolderConfirm}
              onCancel={onFolderCancel}
            />
          )}
          {fileCount === 0 && !isCreatingHere && (
            <li
              className="text-[11px] text-slate-400 italic py-[3px]"
              style={{ paddingLeft: BASE_PADDING + (depth + 1) * INDENT + 20 }}
            >
              Nothing here yet
            </li>
          )}
        </ul>
      </li>
    );
  }

  // ── FOLDER ────────────────────────────────────────────────────────────────
  if (node.type === 'folder') {
    const hasChildren = Boolean(node.children?.length);
    const isCreatingHere =
      creatingIn?.parentPath === node.folderPath;
    const isRenaming = renamingPath === node.folderPath;

    if (isRenaming) {
      return (
        <li>
          <InlineFolderInput
            depth={depth}
            onConfirm={onRenameConfirm}
            onCancel={onRenameCancel}
          />
        </li>
      );
    }

    return (
      <li>
        <button
          type="button"
          className={`${rowBase} text-slate-600 hover:bg-white/30 hover:text-slate-900`}
          style={{ paddingLeft: indent }}
          onClick={() => toggleExpanded(node.id)}
          onContextMenu={(e) => onContextMenu?.(e, node)}
          aria-expanded={isOpen}
        >
          <span className="flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center text-slate-400">
            {hasChildren || isCreatingHere ? (
              isOpen ? <ChevronDownIcon className="h-2.5 w-2.5" /> : <ChevronRightIcon className="h-2.5 w-2.5" />
            ) : null}
          </span>
          {isOpen ? (
            <FolderOpenIcon className="h-3.5 w-3.5 flex-shrink-0 text-amber-400" />
          ) : (
            <FolderIcon className="h-3.5 w-3.5 flex-shrink-0 text-amber-400" />
          )}
          <span className="truncate text-[13px]">{node.name}</span>
        </button>

        {isOpen && (
          <ul className="border-l border-white/20" style={{ marginLeft: indent + 7 }}>
            {(node.children ?? []).map((child) => (
              <TreeBranch
                key={child.id}
                node={child}
                depth={depth + 1}
                expanded={expanded}
                toggleExpanded={toggleExpanded}
                onSelectFile={onSelectFile}
                onContextMenu={onContextMenu}
                onAddFolder={onAddFolder}
                creatingIn={creatingIn}
                onFolderConfirm={onFolderConfirm}
                onFolderCancel={onFolderCancel}
                selectedId={selectedId}
                renamingPath={renamingPath}
                onRenameConfirm={onRenameConfirm}
                onRenameCancel={onRenameCancel}
              />
            ))}
            {isCreatingHere && (
              <InlineFolderInput
                depth={depth + 1}
                onConfirm={onFolderConfirm}
                onCancel={onFolderCancel}
              />
            )}
          </ul>
        )}
      </li>
    );
  }

  // ── FILE ──────────────────────────────────────────────────────────────────
  const processing = node.status === 'processing';
  const rowColor = isSelected
    ? 'bg-emerald-500/20 text-emerald-900'
    : 'text-slate-700 hover:bg-white/30 hover:text-slate-900';

  return (
    <li>
      <button
        type="button"
        className={`${rowBase} ${rowColor}`}
        style={{ paddingLeft: indent + 20 }}
        onClick={() => onSelectFile?.(node)}
        onContextMenu={(e) => onContextMenu?.(e, node)}
      >
        {fileIcon(node.fileItemType ?? 'note', false)}
        <span className="truncate flex-1">{node.name}</span>
        {processing && (
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
        )}
      </button>
    </li>
  );
}

// ---------------------------------------------------------------------------
// FileTree root
// ---------------------------------------------------------------------------

export default function FileTree({
  nodes,
  onSelectFile,
  onDeleteFile,
  onMoveFile,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onAddNote,
  onUploadFile,
  selectedId,
  className = '',
}: FileTreeProps) {
  // All folders start open
  const initialExpanded = useMemo(() => {
    const allIds = collectFolderIds(nodes);
    return allIds.reduce<Record<string, boolean>>((acc, id) => { acc[id] = true; return acc; }, {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [expanded, setExpanded] = useState<Record<string, boolean>>(initialExpanded);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [creatingIn, setCreatingIn] = useState<{ sectionType: SectionType; parentPath: string } | null>(null);
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const contentInputRef = useRef<HTMLInputElement>(null);
  const syllabusInputRef = useRef<HTMLInputElement>(null);

  function handleTriggerUpload(sectionType: 'material' | 'syllabus') {
    if (sectionType === 'material') contentInputRef.current?.click();
    else syllabusInputRef.current?.click();
  }

  function handleFileInputChange(sectionType: 'material' | 'syllabus', e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onUploadFile?.(sectionType, file);
    e.target.value = '';
  }

  const toggleExpanded = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  // Derive available folders per section for "Move to..." menu
  const foldersBySection = useMemo(() => {
    const map: Record<SectionType, FileTreeNode[]> = { notes: [], material: [], syllabus: [] };
    nodes.forEach((section) => {
      if (section.type === 'section' && section.sectionType) {
        map[section.sectionType] = collectFolders(section.children ?? []);
      }
    });
    return map;
  }, [nodes]);

  function handleContextMenu(e: React.MouseEvent, node: FileTreeNode) {
    e.preventDefault();
    if (node.type === 'file' && (node.deletable || onMoveFile)) {
      setContextMenu({ kind: 'file', x: e.clientX, y: e.clientY, node });
    } else if (node.type === 'folder' && node.renamable) {
      setContextMenu({ kind: 'folder', x: e.clientX, y: e.clientY, node });
    }
  }

  function handleAddFolder(sectionType: SectionType, parentPath: string) {
    setCreatingIn({ sectionType, parentPath });
    setContextMenu(null);
  }

  function handleFolderConfirm(name: string) {
    if (creatingIn) {
      const fullPath = creatingIn.parentPath ? `${creatingIn.parentPath}/${name}` : name;
      onCreateFolder?.(creatingIn.sectionType, creatingIn.parentPath, name);
      // Ensure new folder is expanded — we need its id which is derived deterministically
      const newId = `__folder-${creatingIn.sectionType}-${fullPath}__`;
      setExpanded((p) => ({ ...p, [newId]: true }));
    }
    setCreatingIn(null);
  }

  function handleRenameConfirm(newName: string) {
    if (renamingPath !== null && contextMenu?.kind === 'folder') {
      // derive sectionType from node
      const section = nodes.find(
        (n) => n.type === 'section' && collectFolders(n.children ?? []).some((f) => f.folderPath === renamingPath)
      );
      if (section?.sectionType) {
        onRenameFolder?.(section.sectionType, renamingPath, newName);
      }
    }
    setRenamingPath(null);
    setContextMenu(null);
  }

  // Close context menu on outside click / Escape
  useEffect(() => {
    if (!contextMenu) return;
    function close(e: MouseEvent | KeyboardEvent) {
      if (e instanceof KeyboardEvent) { if (e.key === 'Escape') setContextMenu(null); return; }
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setContextMenu(null);
    }
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, [contextMenu]);

  // Determine which section a file belongs to (for Move To menu)
  function sectionOfNode(node: FileTreeNode): SectionType | null {
    for (const section of nodes) {
      if (section.type === 'section' && section.sectionType) {
        if (allFileIds(section).has(node.id)) return section.sectionType;
      }
    }
    return null;
  }

  return (
    <>
      {/* Hidden file inputs for in-tree uploads */}
      <input
        ref={contentInputRef}
        type="file"
        accept=".pdf,.docx,.pptx"
        className="hidden"
        onChange={(e) => handleFileInputChange('material', e)}
      />
      <input
        ref={syllabusInputRef}
        type="file"
        accept=".pdf,.docx,.pptx"
        className="hidden"
        onChange={(e) => handleFileInputChange('syllabus', e)}
      />

      <nav className={`w-full overflow-auto ${className}`} aria-label="File tree">
        <ul className="py-1 space-y-1">
          {nodes.map((node) => (
            <TreeBranch
              key={node.id}
              node={node}
              depth={0}
              expanded={expanded}
              toggleExpanded={toggleExpanded}
              onSelectFile={onSelectFile}
              onContextMenu={handleContextMenu}
              onAddFolder={handleAddFolder}
              creatingIn={creatingIn}
              onFolderConfirm={handleFolderConfirm}
              onFolderCancel={() => setCreatingIn(null)}
              selectedId={selectedId}
              renamingPath={renamingPath}
              onRenameConfirm={handleRenameConfirm}
              onRenameCancel={() => { setRenamingPath(null); setContextMenu(null); }}
              onAddNote={onAddNote}
              onTriggerUpload={handleTriggerUpload}
            />
          ))}
        </ul>
      </nav>

      {/* Context menu */}
      {contextMenu && (
        <div
          ref={menuRef}
          className="fixed z-50 min-w-[160px] rounded-lg border border-white/30 bg-white/85 py-1 shadow-lg backdrop-blur-[20px] text-[13px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          {contextMenu.kind === 'file' && (
            <>
              {/* Move to... */}
              {onMoveFile && (() => {
                const sec = sectionOfNode(contextMenu.node);
                const folders = sec ? foldersBySection[sec] : [];
                return (
                  <div className="border-b border-slate-200/60 pb-1 mb-1">
                    <p className="px-3 pt-1 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Move to
                    </p>
                    <button
                      type="button"
                      onClick={() => { onMoveFile(contextMenu.node, ''); setContextMenu(null); }}
                      className="flex w-full items-center gap-2 px-3 py-1 text-slate-600 hover:bg-slate-100/60"
                    >
                      Root
                    </button>
                    {folders.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => { onMoveFile(contextMenu.node, f.folderPath!); setContextMenu(null); }}
                        className="flex w-full items-center gap-2 px-3 py-1 text-slate-600 hover:bg-slate-100/60"
                      >
                        <FolderIcon className="h-3.5 w-3.5 text-amber-400" />
                        {f.name}
                      </button>
                    ))}
                  </div>
                );
              })()}
              {/* Delete */}
              {contextMenu.node.deletable && (
                <button
                  type="button"
                  onClick={() => { onDeleteFile?.(contextMenu.node); setContextMenu(null); }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-red-600 hover:bg-red-50/60"
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                  Delete
                </button>
              )}
            </>
          )}

          {contextMenu.kind === 'folder' && (
            <>
              <button
                type="button"
                onClick={() => { setRenamingPath(contextMenu.node.folderPath!); }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-slate-700 hover:bg-slate-100/60"
              >
                <PencilSquareIcon className="h-3.5 w-3.5 text-slate-400" />
                Rename
              </button>
              <button
                type="button"
                onClick={() => {
                  const sec = nodes.find(
                    (n) => n.type === 'section' && collectFolders(n.children ?? []).some((f) => f.folderPath === contextMenu.node.folderPath)
                  );
                  if (sec?.sectionType) onDeleteFolder?.(sec.sectionType, contextMenu.node.folderPath!);
                  setContextMenu(null);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-red-600 hover:bg-red-50/60"
              >
                <TrashIcon className="h-3.5 w-3.5" />
                Delete folder
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function collectFolderIds(nodes: FileTreeNode[]): string[] {
  return nodes.flatMap((node) => {
    if (node.type === 'folder') return [node.id, ...collectFolderIds(node.children ?? [])];
    if (node.type === 'section') return collectFolderIds(node.children ?? []);
    return [];
  });
}

function allFileIds(node: FileTreeNode): Set<string> {
  const ids = new Set<string>();
  function walk(n: FileTreeNode) {
    if (n.type === 'file') { ids.add(n.id); return; }
    (n.children ?? []).forEach(walk);
  }
  walk(node);
  return ids;
}
