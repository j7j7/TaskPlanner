import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Strike from '@tiptap/extension-strike';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import Blockquote from '@tiptap/extension-blockquote';
import { useEffect } from 'react';

interface RichTextDisplayProps {
  content: string;
  className?: string;
  maxLines?: number;
}

// Helper function to check if content is HTML or plain text
function isHTML(str: string): boolean {
  if (!str) return false;
  // Simple check: if it contains HTML tags, it's HTML
  return /<[a-z][\s\S]*>/i.test(str);
}

// Convert plain text to HTML paragraphs for TipTap
function plainTextToHTML(text: string): string {
  if (!text) return '';
  if (isHTML(text)) return text;
  // Convert plain text to HTML paragraphs
  return text.split('\n').map(line => `<p>${line || '<br>'}</p>`).join('');
}

export function RichTextDisplay({
  content,
  className = '',
  maxLines,
}: RichTextDisplayProps) {
  const htmlContent = plainTextToHTML(content || '');
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable heading to prevent font size changes
        heading: false,
        // Disable features we'll use separate extensions for
        strike: false,
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
    content: htmlContent,
    editable: false,
    editorProps: {
      attributes: {
        class: 'rich-text-content',
      },
    },
  });

  useEffect(() => {
    if (editor) {
      const newContent = plainTextToHTML(content || '');
      if (newContent !== editor.getHTML()) {
        editor.commands.setContent(newContent, { emitUpdate: false });
      }
    }
  }, [content, editor]);

  if (!editor) {
    // Fallback to plain text if editor not ready
    return (
      <div className={className} style={maxLines ? { 
        display: '-webkit-box',
        WebkitLineClamp: maxLines,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      } : {}}>
        {content || ''}
      </div>
    );
  }

  return (
    <div className={`${className} ${maxLines ? 'rich-text-clamped' : ''}`} data-max-lines={maxLines}>
      <EditorContent editor={editor} />
    </div>
  );
}

