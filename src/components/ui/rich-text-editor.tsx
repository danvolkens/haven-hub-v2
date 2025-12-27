'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Link as LinkIcon,
  Unlink,
  Undo,
  Redo,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  Palette,
} from 'lucide-react';
import { Button } from './button';
import { useState } from 'react';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

const BRAND_COLORS = [
  { name: 'Charcoal', value: '#36454F' },
  { name: 'Sage', value: '#7c9082' },
  { name: 'Dark', value: '#333333' },
  { name: 'Gray', value: '#666666' },
  { name: 'Light Gray', value: '#999999' },
];

// Custom styles for email-like rendering in the editor
const EDITOR_STYLES = `
  .ProseMirror {
    font-family: 'Plus Jakarta Sans', Helvetica, Arial, sans-serif;
    font-size: 16px;
    line-height: 1.6;
    color: #36454F;
  }
  .ProseMirror h1 {
    font-family: 'Crimson Text', Georgia, serif;
    font-size: 32px;
    font-weight: 400;
    line-height: 1.2;
    margin-top: 0;
    margin-bottom: 20px;
    color: #36454F;
  }
  .ProseMirror h2 {
    font-family: 'Plus Jakarta Sans', Helvetica, Arial, sans-serif;
    font-size: 24px;
    font-weight: 600;
    line-height: 1.3;
    margin-top: 24px;
    margin-bottom: 16px;
    color: #36454F;
  }
  .ProseMirror h3 {
    font-family: 'Plus Jakarta Sans', Helvetica, Arial, sans-serif;
    font-size: 20px;
    font-weight: 600;
    line-height: 1.3;
    margin-top: 20px;
    margin-bottom: 12px;
    color: #36454F;
  }
  .ProseMirror p {
    margin-top: 0;
    margin-bottom: 16px;
  }
  .ProseMirror p:last-child {
    margin-bottom: 0;
  }
  .ProseMirror ul, .ProseMirror ol {
    margin-top: 0;
    margin-bottom: 16px;
    padding-left: 24px;
  }
  .ProseMirror li {
    margin-bottom: 8px;
  }
  .ProseMirror a {
    color: #7c9082;
    text-decoration: underline;
  }
  .ProseMirror strong {
    font-weight: 600;
  }
  .ProseMirror p.is-editor-empty:first-child::before {
    content: attr(data-placeholder);
    float: left;
    color: #adb5bd;
    pointer-events: none;
    height: 0;
  }
`;

function ToolbarButton({
  onClick,
  isActive,
  disabled,
  children,
  title,
}: {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors ${
        isActive ? 'bg-sage/20 text-sage' : 'text-gray-600'
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-6 bg-gray-200 mx-1" />;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Start typing...',
  className = '',
}: RichTextEditorProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      TextStyle,
      Color,
      Placeholder.configure({
        placeholder,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-sage underline',
        },
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[200px] p-4 bg-white',
      },
    },
  });

  // Note: Content is set on mount via useEditor({ content }).
  // We don't sync on prop changes to avoid overwriting user edits.
  // If you need to load a different template, remount the component with a new key.

  if (!editor) {
    return (
      <div className={`border rounded-md ${className}`}>
        <div className="h-[250px] flex items-center justify-center text-gray-400">
          Loading editor...
        </div>
      </div>
    );
  }

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className={`border rounded-md overflow-hidden ${className}`}>
      {/* Inject editor styles */}
      <style dangerouslySetInnerHTML={{ __html: EDITOR_STYLES }} />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 p-2 border-b bg-gray-50">
        {/* Undo/Redo */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo"
        >
          <Undo className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo"
        >
          <Redo className="h-4 w-4" />
        </ToolbarButton>

        <Divider />

        {/* Headings */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive('heading', { level: 3 })}
          title="Heading 3"
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setParagraph().run()}
          isActive={editor.isActive('paragraph')}
          title="Paragraph"
        >
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>

        <Divider />

        {/* Text formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
          title="Underline"
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          title="Strikethrough"
        >
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>

        <Divider />

        {/* Color picker */}
        <div className="relative">
          <ToolbarButton
            onClick={() => setShowColorPicker(!showColorPicker)}
            title="Text Color"
          >
            <Palette className="h-4 w-4" />
          </ToolbarButton>
          {showColorPicker && (
            <div className="absolute top-full left-0 mt-1 p-2 bg-white border rounded-md shadow-lg z-10 flex gap-1">
              {BRAND_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => {
                    editor.chain().focus().setColor(color.value).run();
                    setShowColorPicker(false);
                  }}
                  title={color.name}
                  className="w-6 h-6 rounded border cursor-pointer hover:scale-110 transition-transform"
                  style={{ backgroundColor: color.value }}
                />
              ))}
              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().unsetColor().run();
                  setShowColorPicker(false);
                }}
                title="Remove color"
                className="w-6 h-6 rounded border cursor-pointer hover:scale-110 transition-transform bg-white text-xs"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        <Divider />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>

        <Divider />

        {/* Links */}
        <ToolbarButton
          onClick={setLink}
          isActive={editor.isActive('link')}
          title="Add Link"
        >
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().unsetLink().run()}
          disabled={!editor.isActive('link')}
          title="Remove Link"
        >
          <Unlink className="h-4 w-4" />
        </ToolbarButton>
      </div>

      {/* Editor content */}
      <EditorContent editor={editor} />

      {/* Character count */}
      <div className="px-3 py-1.5 border-t bg-gray-50 text-xs text-gray-500">
        {editor.storage.characterCount?.characters?.() || editor.getText().length} characters
      </div>
    </div>
  );
}
