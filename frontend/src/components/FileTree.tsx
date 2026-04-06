'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  FolderIcon,
  FolderOpenIcon,
  TrashIcon,
} from '@heroicons/react/24/solid';

export type FileTreeNode = {
  id: string;
  name: string;
  type: 'folder' | 'file';
  deletable?: boolean;
  children?: FileTreeNode[];
};

type ContextMenu = { x: number; y: number; node: FileTreeNode };

type FileTreeProps = {
  nodes: FileTreeNode[];
  onSelectFile?: (node: FileTreeNode) => void;
  onDeleteFile?: (node: FileTreeNode) => void;
  selectedId?: string;
  className?: string;
};

const INDENT = 12;
const BASE_PADDING = 6;

function TreeBranch({
  node,
  depth,
  expanded,
  toggleExpanded,
  onSelectFile,
  onContextMenu,
  selectedId,
}: {
  node: FileTreeNode;
  depth: number;
  expanded: Record<string, boolean>;
  toggleExpanded: (id: string) => void;
  onSelectFile?: (node: FileTreeNode) => void;
  onContextMenu?: (e: React.MouseEvent, node: FileTreeNode) => void;
  selectedId?: string;
}) {
  const isFolder = node.type === 'folder';
  const hasChildren = Boolean(node.children?.length);
  const isOpen = expanded[node.id] ?? false;
  const isSelected = node.id === selectedId;
  const indent = BASE_PADDING + depth * INDENT;

  const rowBase =
    'group flex w-full items-center gap-1.5 py-[3px] pr-3 text-left text-[13px] leading-5 cursor-pointer select-none transition-colors duration-75 rounded-sm';

  const rowColor = isSelected
    ? 'bg-emerald-500/20 text-emerald-900'
    : 'text-slate-700 hover:bg-white/30 hover:text-slate-900';

  if (isFolder) {
    return (
      <li>
        <button
          type="button"
          className={`${rowBase} ${rowColor}`}
          style={{ paddingLeft: indent }}
          onClick={() => toggleExpanded(node.id)}
          aria-expanded={isOpen}
        >
          <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center text-slate-400">
            {hasChildren ? (
              isOpen ? <ChevronDownIcon className="h-3 w-3" /> : <ChevronRightIcon className="h-3 w-3" />
            ) : null}
          </span>
          {isOpen ? (
            <FolderOpenIcon className="h-4 w-4 flex-shrink-0 text-amber-400" />
          ) : (
            <FolderIcon className="h-4 w-4 flex-shrink-0 text-amber-400" />
          )}
          <span className="truncate font-medium">{node.name}</span>
        </button>

        {isOpen && hasChildren && (
          <ul className="border-l border-white/20" style={{ marginLeft: indent + 8 }}>
            {node.children!.map((child) => (
              <TreeBranch
                key={child.id}
                node={child}
                depth={depth + 1}
                expanded={expanded}
                toggleExpanded={toggleExpanded}
                onSelectFile={onSelectFile}
                onContextMenu={onContextMenu}
                selectedId={selectedId}
              />
            ))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        className={`${rowBase} ${rowColor}`}
        style={{ paddingLeft: indent + 20 }}
        onClick={() => onSelectFile?.(node)}
        onContextMenu={(e) => onContextMenu?.(e, node)}
      >
        <DocumentTextIcon className="h-4 w-4 flex-shrink-0 text-sky-400" />
        <span className="truncate">{node.name}</span>
      </button>
    </li>
  );
}

function collectFolderIds(nodes: FileTreeNode[]): string[] {
  return nodes.flatMap((node) => {
    if (node.type !== 'folder') return [];
    return [node.id, ...(node.children ? collectFolderIds(node.children) : [])];
  });
}

export default function FileTree({ nodes, onSelectFile, onDeleteFile, selectedId, className = '' }: FileTreeProps) {
  const initialExpanded = useMemo(() => {
    const folderIds = collectFolderIds(nodes);
    const rootFolderIds = nodes.filter((n) => n.type === 'folder').map((n) => n.id);
    return folderIds.reduce<Record<string, boolean>>((acc, id) => {
      acc[id] = rootFolderIds.includes(id);
      return acc;
    }, {});
  }, [nodes]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>(initialExpanded);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggleExpanded = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  function handleContextMenu(e: React.MouseEvent, node: FileTreeNode) {
    if (!node.deletable) return;
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, node });
  }

  function handleDelete() {
    if (contextMenu) onDeleteFile?.(contextMenu.node);
    setContextMenu(null);
  }

  // Close on click outside or Escape
  useEffect(() => {
    if (!contextMenu) return;
    function close(e: MouseEvent | KeyboardEvent) {
      if (e instanceof KeyboardEvent) {
        if (e.key === 'Escape') setContextMenu(null);
        return;
      }
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    }
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [contextMenu]);

  return (
    <>
      <nav className={`w-full overflow-auto ${className}`} aria-label="File tree">
        <ul className="py-1">
          {nodes.map((node) => (
            <TreeBranch
              key={node.id}
              node={node}
              depth={0}
              expanded={expanded}
              toggleExpanded={toggleExpanded}
              onSelectFile={onSelectFile}
              onContextMenu={handleContextMenu}
              selectedId={selectedId}
            />
          ))}
        </ul>
      </nav>

      {contextMenu && (
        <div
          ref={menuRef}
          className="fixed z-50 min-w-[140px] rounded-lg border border-white/30 bg-white/80 py-1 shadow-lg backdrop-blur-[20px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            type="button"
            onClick={handleDelete}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-[13px] text-red-600 hover:bg-red-50/60"
          >
            <TrashIcon className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      )}
    </>
  );
}
