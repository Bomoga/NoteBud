'use client';

import { useMemo, useState } from 'react';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  FolderIcon,
} from '@heroicons/react/24/outline';

export type FileTreeNode = {
  id: string;
  name: string;
  type: 'folder' | 'file';
  children?: FileTreeNode[];
};

type FileTreeProps = {
  nodes: FileTreeNode[];
  onSelectFile?: (node: FileTreeNode) => void;
  className?: string;
};

function TreeBranch({
  node,
  depth,
  expanded,
  toggleExpanded,
  onSelectFile,
}: {
  node: FileTreeNode;
  depth: number;
  expanded: Record<string, boolean>;
  toggleExpanded: (id: string) => void;
  onSelectFile?: (node: FileTreeNode) => void;
}) {
  const isFolder = node.type === 'folder';
  const hasChildren = Boolean(node.children?.length);
  const isOpen = expanded[node.id] ?? false;
  const paddingLeft = 8 + depth * 14;

  if (isFolder) {
    return (
      <li>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-md py-1 pr-2 text-left text-sm text-slate-800 hover:bg-white/35"
          style={{ paddingLeft }}
          onClick={() => toggleExpanded(node.id)}
          aria-expanded={isOpen}
          aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${node.name}`}
        >
          {hasChildren ? (
            isOpen ? (
              <ChevronDownIcon className="h-4 w-4 shrink-0 text-slate-600" />
            ) : (
              <ChevronRightIcon className="h-4 w-4 shrink-0 text-slate-600" />
            )
          ) : (
            <span className="inline-block h-4 w-4 shrink-0" />
          )}
          <FolderIcon className="h-4 w-4 shrink-0 text-amber-600" />
          <span className="truncate">{node.name}</span>
        </button>

        {isOpen && hasChildren ? (
          <ul className="space-y-0.5">
            {node.children!.map((child) => (
              <TreeBranch
                key={child.id}
                node={child}
                depth={depth + 1}
                expanded={expanded}
                toggleExpanded={toggleExpanded}
                onSelectFile={onSelectFile}
              />
            ))}
          </ul>
        ) : null}
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded-md py-1 pr-2 text-left text-sm text-slate-700 hover:bg-white/35"
        style={{ paddingLeft }}
        onClick={() => onSelectFile?.(node)}
      >
        <span className="inline-block h-4 w-4 shrink-0" />
        <DocumentTextIcon className="h-4 w-4 shrink-0 text-slate-500" />
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

export default function FileTree({ nodes, onSelectFile, className = '' }: FileTreeProps) {
  const initialExpanded = useMemo(() => {
    const folderIds = collectFolderIds(nodes);
    // Open only root-level folders by default for a cleaner first render.
    const rootFolderIds = nodes.filter((n) => n.type === 'folder').map((n) => n.id);
    return folderIds.reduce<Record<string, boolean>>((acc, id) => {
      acc[id] = rootFolderIds.includes(id);
      return acc;
    }, {});
  }, [nodes]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>(initialExpanded);

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <nav className={`w-full overflow-auto ${className}`} aria-label="File tree">
      <ul className="space-y-0.5 py-1">
        {nodes.map((node) => (
          <TreeBranch
            key={node.id}
            node={node}
            depth={0}
            expanded={expanded}
            toggleExpanded={toggleExpanded}
            onSelectFile={onSelectFile}
          />
        ))}
      </ul>
    </nav>
  );
}
