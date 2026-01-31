'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { useEffect } from 'react';

interface EmailEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** 'email' muestra toolbar completo, 'whatsapp' solo formatos soportados por WA */
  mode?: 'email' | 'whatsapp';
}

export function EmailEditor({ value, onChange, placeholder, mode = 'email' }: EmailEditorProps) {
  const isWhatsApp = mode === 'whatsapp';

  const extensions = isWhatsApp
    ? [StarterKit.configure({ heading: false, code: false, codeBlock: false, blockquote: false, horizontalRule: false })]
    : [
        StarterKit,
        Link.configure({
          openOnClick: false,
          HTMLAttributes: { class: 'text-blue-600 underline' },
        }),
      ];

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content: value,
    editorProps: {
      attributes: {
        class:
          'min-h-[200px] p-4 focus:outline-none text-gray-900 text-sm [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mb-2 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2 [&_li]:mb-1',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Sync external value changes
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!editor) {
    return (
      <div className="border border-gray-300 rounded-lg bg-white">
        <div className="min-h-[200px] p-4 text-gray-400">
          {placeholder || 'Cargando editor...'}
        </div>
      </div>
    );
  }

  const buttonClass = (active: boolean) =>
    `px-2 py-1 text-sm rounded ${
      active
        ? 'bg-blue-100 text-blue-700 font-medium'
        : 'text-gray-600 hover:bg-gray-100'
    }`;

  return (
    <div className="border border-gray-300 rounded-lg bg-white overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-200 bg-gray-50">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={buttonClass(editor.isActive('bold'))}
          title="Negrita → *texto*"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={buttonClass(editor.isActive('italic'))}
          title="Cursiva → _texto_"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={buttonClass(editor.isActive('strike'))}
          title="Tachado → ~texto~"
        >
          <s>S</s>
        </button>
        <div className="w-px h-5 bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={buttonClass(editor.isActive('bulletList'))}
          title="Lista con viñetas"
        >
          Lista
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={buttonClass(editor.isActive('orderedList'))}
          title="Lista numerada"
        >
          1. Lista
        </button>

        {/* Solo en modo email: links y headings */}
        {!isWhatsApp && (
          <>
            <div className="w-px h-5 bg-gray-300 mx-1" />
            <button
              type="button"
              onClick={() => {
                const url = window.prompt('URL del enlace:');
                if (url) {
                  editor.chain().focus().setLink({ href: url }).run();
                }
              }}
              className={buttonClass(editor.isActive('link'))}
              title="Insertar enlace"
            >
              Enlace
            </button>
            {editor.isActive('link') && (
              <button
                type="button"
                onClick={() => editor.chain().focus().unsetLink().run()}
                className="px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                title="Quitar enlace"
              >
                Quitar
              </button>
            )}
            <div className="w-px h-5 bg-gray-300 mx-1" />
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={buttonClass(editor.isActive('heading', { level: 2 }))}
              title="Título"
            >
              H2
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              className={buttonClass(editor.isActive('heading', { level: 3 }))}
              title="Subtítulo"
            >
              H3
            </button>
          </>
        )}

        {isWhatsApp && (
          <span className="ml-auto text-xs text-gray-400">
            Formato WhatsApp: *negrita* _cursiva_ ~tachado~
          </span>
        )}
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  );
}
