import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Strike from '@tiptap/extension-strike';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import Blockquote from '@tiptap/extension-blockquote';
import { useEffect } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Add a description...',
  disabled = false,
  className = '',
}: RichTextEditorProps) {
  // Sanitize HTML to remove font-size styles
  const sanitizeHTML = (html: string): string => {
    if (!html) return '';
    // Remove font-size styles from all elements
    return html.replace(/style\s*=\s*["'][^"']*font-size[^"']*["']/gi, '')
      .replace(/font-size\s*:\s*[^;]+;?/gi, '')
      .replace(/style\s*=\s*["']\s*["']/gi, '')
      .replace(/<h[1-6][^>]*>/gi, '<p>')
      .replace(/<\/h[1-6]>/gi, '</p>');
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable heading to prevent font size changes
        heading: false,
        // Disable features we'll use separate extensions for
        strike: false,
        underline: false, // Disable underline from StarterKit since we add it separately
        code: false,
        blockquote: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        codeBlock: false,
      }),
      Underline,
      Strike,
      BulletList,
      OrderedList,
      ListItem,
      Blockquote.configure({
        HTMLAttributes: {
          class: 'rich-text-blockquote',
        },
      }),
    ],
    content: value || '',
    editable: !disabled,
    onUpdate: ({ editor }) => {
      // Sanitize output to remove any font-size styles
      const html = sanitizeHTML(editor.getHTML());
      onChange(html);
    },
    editorProps: {
      attributes: {
        class: 'rich-text-content focus:outline-none min-h-[80px] sm:min-h-[100px] px-3 py-2',
      },
    },
  });

  useEffect(() => {
    if (editor) {
      const sanitized = sanitizeHTML(value || '');
      if (sanitized !== editor.getHTML()) {
        editor.commands.setContent(sanitized, { emitUpdate: false });
      }
    }
  }, [value, editor]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [disabled, editor]);

  if (!editor) {
    return null;
  }

  const isEmpty = !editor.getText().trim();

  return (
    <div className={`rich-text-editor relative border border-border rounded-lg bg-background ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
      {!disabled && (
        <div className="flex items-center gap-1 p-2 border-b border-border bg-surfaceLight rounded-t-lg flex-wrap">
          <div className="flex items-center gap-1 border-r border-border pr-1 mr-1">
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBold().run()}
              disabled={!editor.can().chain().focus().toggleBold().run()}
              className={`p-1.5 rounded hover:bg-surface transition-colors ${
                editor.isActive('bold') ? 'bg-surface text-accent' : 'text-textMuted'
              }`}
              data-tooltip="Bold (Ctrl+B)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              disabled={!editor.can().chain().focus().toggleItalic().run()}
              className={`p-1.5 rounded hover:bg-surface transition-colors ${
                editor.isActive('italic') ? 'bg-surface text-accent' : 'text-textMuted'
              }`}
              data-tooltip="Italic (Ctrl+I)"
            >
              <span className="italic font-bold text-sm">I</span>
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              disabled={!editor.can().chain().focus().toggleUnderline().run()}
              className={`p-1.5 rounded hover:bg-surface transition-colors ${
                editor.isActive('underline') ? 'bg-surface text-accent' : 'text-textMuted'
              }`}
              data-tooltip="Underline (Ctrl+U)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19h14M5 5h14" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleStrike().run()}
              disabled={!editor.can().chain().focus().toggleStrike().run()}
              className={`p-1.5 rounded hover:bg-surface transition-colors ${
                editor.isActive('strike') ? 'bg-surface text-accent' : 'text-textMuted'
              }`}
              data-tooltip="Strikethrough"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-1 border-r border-border pr-1 mr-1">
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              disabled={!editor.can().chain().focus().toggleBulletList().run()}
              className={`p-1.5 rounded hover:bg-surface transition-colors ${
                editor.isActive('bulletList') ? 'bg-surface text-accent' : 'text-textMuted'
              }`}
              data-tooltip="Bullet List"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              disabled={!editor.can().chain().focus().toggleOrderedList().run()}
              className={`p-1.5 rounded hover:bg-surface transition-colors ${
                editor.isActive('orderedList') ? 'bg-surface text-accent' : 'text-textMuted'
              }`}
              data-tooltip="Numbered List"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              disabled={!editor.can().chain().focus().toggleBlockquote().run()}
              className={`p-1.5 rounded hover:bg-surface transition-colors ${
                editor.isActive('blockquote') ? 'bg-surface text-accent' : 'text-textMuted'
              }`}
              data-tooltip="Quote"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </button>
          </div>
        </div>
      )}
      <div className="relative">
        <EditorContent editor={editor} />
        {isEmpty && !disabled && (
          <div className="absolute pointer-events-none text-textMuted text-sm px-3 py-2" style={{ top: 0, left: 0 }}>
            {placeholder}
          </div>
        )}
      </div>
    </div>
  );
}

