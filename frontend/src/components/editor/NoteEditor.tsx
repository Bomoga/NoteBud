'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useEditor, EditorContent, type Editor as TiptapEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import { createLowlight, common } from 'lowlight';

import EditorBubbleMenu from './EditorBubbleMenu';
import EditorSlashMenu from './EditorSlashMenu';

const lowlight = createLowlight(common);

interface SlashMenuState {
  open: boolean;
  query: string;
  top: number;
  left: number;
}

const CLOSED_SLASH_MENU: SlashMenuState = { open: false, query: '', top: 0, left: 0 };

interface Props {
  noteId: string;
  content: string;
  onChange: (html: string) => void;
}

export default function NoteEditor({ noteId, content, onChange }: Props) {
  const [slashMenu, setSlashMenu] = useState<SlashMenuState>(CLOSED_SLASH_MENU);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      CodeBlockLowlight.configure({ lowlight }),
      Placeholder.configure({ placeholder: 'Start writing, or type / for commands…' }),
      Typography,
    ],
    content: content || '',
    editorProps: {
      attributes: { class: 'h-full min-h-full focus:outline-none' },
    },
    onUpdate({ editor }) {
      detectSlashCommand(editor);
      onChangeRef.current(editor.getHTML());
    },
    onCreate({ editor }) {
      detectSlashCommand(editor);
    },
  });

  // Reset content when the active note changes (noteId switch, not every keystroke)
  useEffect(() => {
    if (!editor) return;
    const incoming = content || '';
    if (editor.getHTML() !== incoming) {
      editor.commands.setContent(incoming, false);
    }
  }, [noteId]); // eslint-disable-line react-hooks/exhaustive-deps

  function detectSlashCommand(editor: TiptapEditor) {
    const { state } = editor;
    const { from } = state.selection;
    const blockStart = state.doc.resolve(from).start();
    const textBefore = state.doc.textBetween(blockStart, from);

    if (textBefore.startsWith('/')) {
      const coords = editor.view.coordsAtPos(from);
      setSlashMenu({
        open: true,
        query: textBefore.slice(1),
        top: coords.bottom + 6,
        left: coords.left,
      });
    } else {
      setSlashMenu(CLOSED_SLASH_MENU);
    }
  }

  const handleSlashExecute = useCallback(
    (action: (editor: TiptapEditor) => void) => {
      if (!editor) return;

      // Delete the /query text before applying the command
      const { state } = editor;
      const { from } = state.selection;
      const blockStart = state.doc.resolve(from).start();
      editor.chain().focus().deleteRange({ from: blockStart, to: from }).run();

      action(editor);
      setSlashMenu(CLOSED_SLASH_MENU);
    },
    [editor],
  );

  const closeSlashMenu = useCallback(() => setSlashMenu(CLOSED_SLASH_MENU), []);

  if (!editor) return null;

  return (
    <div className="relative flex h-full flex-col">
      <EditorBubbleMenu editor={editor} />

      {slashMenu.open && (
        <EditorSlashMenu
          editor={editor}
          query={slashMenu.query}
          position={{ top: slashMenu.top, left: slashMenu.left }}
          onClose={closeSlashMenu}
          onExecute={handleSlashExecute}
        />
      )}

      <EditorContent
        editor={editor}
        className="flex-1 overflow-y-auto px-6 py-4"
      />
    </div>
  );
}
