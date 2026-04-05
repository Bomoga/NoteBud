'use client';

import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Link2,
  Heading1,
  Heading2,
  Heading3,
} from 'lucide-react';

interface MenuState {
  show: boolean;
  top: number;
  left: number;
}

interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  label: string;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, active, label, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onMouseDown={(e) => {
        e.preventDefault(); // keep editor focused
        onClick();
      }}
      className={`flex items-center justify-center rounded p-1.5 transition-colors ${
        active
          ? 'bg-emerald-500/25 text-emerald-700'
          : 'text-slate-600 hover:bg-white/30 hover:text-slate-800'
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="mx-0.5 h-5 w-px bg-slate-300/60" />;
}

export default function EditorBubbleMenu({ editor }: { editor: Editor }) {
  const [menu, setMenu] = useState<MenuState>({ show: false, top: 0, left: 0 });

  useEffect(() => {
    function update() {
      const { empty } = editor.state.selection;

      if (empty) {
        setMenu((prev) => ({ ...prev, show: false }));
        return;
      }

      const domSel = window.getSelection();
      if (!domSel || domSel.rangeCount === 0) return;

      const rect = domSel.getRangeAt(0).getBoundingClientRect();
      if (rect.width === 0) return;

      setMenu({
        show: true,
        top: rect.top,           // toolbar sits above; translateY(-100%) handles offset
        left: rect.left + rect.width / 2,
      });
    }

    function hide() {
      setMenu((prev) => ({ ...prev, show: false }));
    }

    editor.on('selectionUpdate', update);
    editor.on('blur', hide);

    return () => {
      editor.off('selectionUpdate', update);
      editor.off('blur', hide);
    };
  }, [editor]);

  function handleLink() {
    const existing = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Link URL:', existing ?? '');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }

  if (!menu.show) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: menu.top,
        left: menu.left,
        transform: 'translateX(-50%) translateY(calc(-100% - 8px))',
        zIndex: 50,
      }}
      className="flex items-center gap-0.5 rounded-xl border border-white/40 bg-white/80 px-1 py-1 shadow-lg backdrop-blur-xl"
    >
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={editor.isActive('heading', { level: 1 })}
        label="Heading 1"
      >
        <Heading1 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive('heading', { level: 2 })}
        label="Heading 2"
      >
        <Heading2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive('heading', { level: 3 })}
        label="Heading 3"
      >
        <Heading3 className="h-4 w-4" />
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive('bold')}
        label="Bold"
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive('italic')}
        label="Italic"
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive('underline')}
        label="Underline"
      >
        <Underline className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive('strike')}
        label="Strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        active={editor.isActive('code')}
        label="Inline code"
      >
        <Code className="h-4 w-4" />
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        onClick={handleLink}
        active={editor.isActive('link')}
        label="Link"
      >
        <Link2 className="h-4 w-4" />
      </ToolbarButton>
    </div>
  );
}
