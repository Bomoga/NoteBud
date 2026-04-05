'use client';

import { useMemo, useState } from 'react';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  FolderIcon,
  FolderOpenIcon,
} from '@heroicons/react/24/solid';

export type FileTreeNode = {
  id: string;
  name: string;
  type: 'folder' | 'file';
  children?: FileTreeNode[];
};

type FileTreeProps = {
  nodes: FileTreeNode[];
  onSelectFile?: (node: FileTreeNode) => void;
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
  selectedId,
}: {
  node: FileTreeNode;
  depth: number;
  expanded: Record<string, boolean>;
  toggleExpanded: (id: string) => void;
  onSelectFile?: (node: FileTreeNode) => void;
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
          {/* Chevron */}
          <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center text-slate-400">
            {hasChildren ? (
              isOpen ? (
                <ChevronDownIcon className="h-3 w-3" />
              ) : (
                <ChevronRightIcon className="h-3 w-3" />
              )
            ) : null}
          </span>

          {/* Folder icon */}
          {isOpen ? (
            <FolderOpenIcon className="h-4 w-4 flex-shrink-0 text-amber-400" />
          ) : (
            <FolderIcon className="h-4 w-4 flex-shrink-0 text-amber-400" />
          )}

          <span className="truncate font-medium">{node.name}</span>
        </button>

        {isOpen && hasChildren && (
          <ul
            className="border-l border-white/20"
            style={{ marginLeft: indent + 8 }}
          >
            {node.children!.map((child) => (
              <TreeBranch
                key={child.id}
                node={child}
                depth={depth + 1}
                expanded={expanded}
                toggleExpanded={toggleExpanded}
                onSelectFile={onSelectFile}
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
        style={{ paddingLeft: indent + 20 }} // align with folder label (skip chevron + gap)
        onClick={() => onSelectFile?.(node)}
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

export default function FileTree({ nodes, onSelectFile, selectedId, className = '' }: FileTreeProps) {
  const initialExpanded = useMemo(() => {
    const folderIds = collectFolderIds(nodes);
    const rootFolderIds = nodes.filter((n) => n.type === 'folder').map((n) => n.id);
    return folderIds.reduce<Record<string, boolean>>((acc, id) => {
      acc[id] = rootFolderIds.includes(id);
      return acc;
    }, {});
  }, [nodes]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>(initialExpanded);

  const toggleExpanded = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
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
            selectedId={selectedId}
          />
        ))}
      </ul>
    </nav>
  );
}
