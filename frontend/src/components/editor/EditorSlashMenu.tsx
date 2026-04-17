'use client';

import { useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListChecks,
  Code2,
  Quote,
  Minus,
  Type,
} from 'lucide-react';

interface SlashCommand {
  label: string;
  description: string;
  keywords: string[];
  icon: React.ReactNode;
  action: (editor: Editor) => void;
}

const COMMANDS: SlashCommand[] = [
  {
    label: 'Text',
    description: 'Plain paragraph',
    keywords: ['text', 'paragraph', 'plain', 'p'],
    icon: <Type className="h-4 w-4" />,
    action: (e) => e.chain().focus().setParagraph().run(),
  },
  {
    label: 'Heading 1',
    description: 'Large section heading',
    keywords: ['h1', 'heading1', 'heading', 'title'],
    icon: <Heading1 className="h-4 w-4" />,
    action: (e) => e.chain().focus().setHeading({ level: 1 }).run(),
  },
  {
    label: 'Heading 2',
    description: 'Medium section heading',
    keywords: ['h2', 'heading2', 'heading', 'subtitle'],
    icon: <Heading2 className="h-4 w-4" />,
    action: (e) => e.chain().focus().setHeading({ level: 2 }).run(),
  },
  {
    label: 'Heading 3',
    description: 'Small section heading',
    keywords: ['h3', 'heading3', 'heading'],
    icon: <Heading3 className="h-4 w-4" />,
    action: (e) => e.chain().focus().setHeading({ level: 3 }).run(),
  },
  {
    label: 'Bullet List',
    description: 'Unordered list',
    keywords: ['bullet', 'list', 'ul', 'unordered'],
    icon: <List className="h-4 w-4" />,
    action: (e) => e.chain().focus().toggleBulletList().run(),
  },
  {
    label: 'Numbered List',
    description: 'Ordered list',
    keywords: ['numbered', 'ordered', 'ol', 'list', 'number'],
    icon: <ListOrdered className="h-4 w-4" />,
    action: (e) => e.chain().focus().toggleOrderedList().run(),
  },
  {
    label: 'Task List',
    description: 'Checklist with checkboxes',
    keywords: ['task', 'todo', 'checklist', 'check'],
    icon: <ListChecks className="h-4 w-4" />,
    action: (e) => e.chain().focus().toggleTaskList().run(),
  },
  {
    label: 'Code Block',
    description: 'Fenced code with syntax highlighting',
    keywords: ['code', 'codeblock', 'pre', 'snippet'],
    icon: <Code2 className="h-4 w-4" />,
    action: (e) => e.chain().focus().toggleCodeBlock().run(),
  },
  {
    label: 'Quote',
    description: 'Blockquote',
    keywords: ['quote', 'blockquote', 'callout'],
    icon: <Quote className="h-4 w-4" />,
    action: (e) => e.chain().focus().toggleBlockquote().run(),
  },
  {
    label: 'Divider',
    description: 'Horizontal rule',
    keywords: ['divider', 'hr', 'rule', 'separator', 'line'],
    icon: <Minus className="h-4 w-4" />,
    action: (e) => e.chain().focus().setHorizontalRule().run(),
  },
];

interface Props {
  editor: Editor;
  query: string;
  position: { top: number; left: number };
  onClose: () => void;
  onExecute: (action: (editor: Editor) => void) => void;
}

export default function EditorSlashMenu({ editor, query, position, onClose, onExecute }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const filtered = COMMANDS.filter((cmd) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      cmd.label.toLowerCase().includes(q) ||
      cmd.keywords.some((k) => k.includes(q))
    );
  });

  // Reset selection when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % filtered.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) onExecute(filtered[selectedIndex].action);
      } else if (e.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [filtered, selectedIndex, onExecute, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    const el = menuRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (filtered.length === 0) return null;

  return (
    <div
      ref={menuRef}
      style={{ top: position.top, left: position.left }}
      className="fixed z-50 w-64 max-h-72 overflow-y-auto rounded-xl border border-white/40 bg-white/80 shadow-xl backdrop-blur-xl py-1"
    >
      {filtered.map((cmd, i) => (
        <button
          key={cmd.label}
          data-index={i}
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            onExecute(cmd.action);
          }}
          className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
            i === selectedIndex
              ? 'bg-emerald-500/15 text-emerald-800'
              : 'text-slate-700 hover:bg-white/40'
          }`}
        >
          <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-white/60 text-slate-500 shadow-sm">
            {cmd.icon}
          </span>
          <span className="flex flex-col">
            <span className="text-sm font-medium leading-tight">{cmd.label}</span>
            <span className="text-xs text-slate-400">{cmd.description}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
