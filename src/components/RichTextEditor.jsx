import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Color from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { useEffect, useRef } from "react";
import {
  Bold, Italic, Strikethrough, List, ListOrdered, Quote,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Heading1, Heading2, Heading3, Minus, Highlighter, Undo, Redo,
  Underline as UnderlineIcon, Palette,
} from "lucide-react";

function ToolBtn({ onClick, active, title, children }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={`p-1.5 rounded transition ${active ? "bg-amber-400 text-slate-900" : "hover:bg-slate-200 text-slate-600"}`}
    >
      {children}
    </button>
  );
}

const COLORS = [
  "#000000", "#374151", "#991b1b", "#b45309", "#065f46",
  "#1e40af", "#6d28d9", "#be185d", "#9ca3af", "#ef4444",
  "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899",
];

function ColorPicker({ onColor }) {
  const ref = useRef(null);

  return (
    <div className="relative">
      <ToolBtn onClick={() => ref.current?.showPicker?.()} title="Warna Teks">
        <Palette size={14} />
      </ToolBtn>
      <input
        ref={ref}
        type="color"
        className="absolute opacity-0 w-0 h-0 pointer-events-none"
        onChange={(e) => onColor(e.target.value)}
      />
    </div>
  );
}

const FONT_SIZES = ["10pt", "11pt", "12pt", "14pt", "16pt", "18pt", "24pt", "36pt"];

export default function RichTextEditor({ content, onChange }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: false }),
      TextStyle,
      Color,
      Underline,
    ],
    content,
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none min-h-[500px] p-6 focus:outline-none",
      },
    },
  });

  useEffect(() => {
    if (editor && content !== undefined && editor.getHTML() !== content) {
      editor.commands.setContent(content || "", false);
    }
  }, [content]);

  if (!editor) return null;

  return (
    <div className="border border-slate-300 rounded-xl overflow-hidden flex flex-col shadow-sm">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-0.5 p-2 border-b border-slate-200 bg-slate-50">

        {/* History */}
        <ToolBtn onClick={() => editor.chain().focus().undo().run()} active={false} title="Undo">
          <Undo size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().redo().run()} active={false} title="Redo">
          <Redo size={14} />
        </ToolBtn>

        <span className="w-px bg-slate-300 mx-1" />

        {/* Headings */}
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Judul 1">
          <Heading1 size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Judul 2">
          <Heading2 size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Judul 3">
          <Heading3 size={14} />
        </ToolBtn>

        <span className="w-px bg-slate-300 mx-1" />

        {/* Inline formatting */}
        <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Tebal (Bold)">
          <Bold size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Miring (Italic)">
          <Italic size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Garis Bawah">
          <UnderlineIcon size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Coret">
          <Strikethrough size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive("highlight")} title="Sorot">
          <Highlighter size={14} />
        </ToolBtn>

        {/* Color picker */}
        <div className="relative group">
          <ToolBtn onClick={() => {}} active={false} title="Warna Teks">
            <Palette size={14} />
          </ToolBtn>
          <div className="absolute hidden group-hover:flex top-full left-0 z-10 mt-1 p-2 bg-white border border-slate-200 rounded-lg shadow-lg flex-wrap gap-1 w-44">
            {COLORS.map(c => (
              <button
                key={c}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  editor.chain().focus().setColor(c).run();
                }}
                style={{ background: c }}
                className="w-5 h-5 rounded border border-slate-300 hover:scale-110 transition"
                title={c}
              />
            ))}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().unsetColor().run();
              }}
              className="w-5 h-5 rounded border border-slate-300 bg-white text-xs flex items-center justify-center hover:bg-slate-100"
              title="Reset warna"
            >✕</button>
          </div>
        </div>

        <span className="w-px bg-slate-300 mx-1" />

        {/* Alignment */}
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Rata Kiri">
          <AlignLeft size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Tengah">
          <AlignCenter size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Rata Kanan">
          <AlignRight size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign("justify").run()} active={editor.isActive({ textAlign: "justify" })} title="Rata Kanan-Kiri">
          <AlignJustify size={14} />
        </ToolBtn>

        <span className="w-px bg-slate-300 mx-1" />

        {/* Lists */}
        <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="List Poin">
          <List size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="List Angka">
          <ListOrdered size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Kutipan">
          <Quote size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} active={false} title="Garis Pemisah">
          <Minus size={14} />
        </ToolBtn>
      </div>

      {/* Editor area */}
      <div className="flex-1 bg-white overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
