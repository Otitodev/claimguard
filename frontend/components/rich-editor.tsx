"use client";

import { useCallback, useEffect, useRef } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  BoldIcon,
  TextItalicIcon,
  Heading01Icon,
  ListStartIcon,
  QuoteDownIcon,
  UndoIcon,
  RedoIcon,
} from "@hugeicons/core-free-icons";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { cn } from "@/lib/utils";

interface RichEditorProps {
  content: string;
  onUpdate: (html: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-40",
        active && "bg-accent text-accent-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function RichEditor({
  content,
  onUpdate,
  disabled = false,
  placeholder = "Edit the appeal letter…",
  className,
}: RichEditorProps) {
  const updateRef = useRef(onUpdate);
  useEffect(() => {
    updateRef.current = onUpdate;
  });

  const editor = useEditor({
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    onUpdate: useCallback(({ editor: e }: { editor: Editor }) => {
      updateRef.current(e.getHTML());
    }, []),
    immediatelyRender: false,
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [editor, content]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [editor, disabled]);

  if (!editor) {
    return (
      <div className={cn("rounded-2xl border border-input bg-input/50 p-4", className)}>
        <div className="h-64 animate-pulse rounded-md bg-muted" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-input bg-input/50 transition-[box-shadow,background-color,color] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30",
        disabled && "opacity-50",
        className,
      )}
    >
      {!disabled && (
        <div className="flex items-center gap-0.5 border-b border-input px-2 py-1">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive("bold")}
          >
            <HugeiconsIcon icon={BoldIcon} className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive("italic")}
          >
            <HugeiconsIcon icon={TextItalicIcon} className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive("heading", { level: 2 })}
          >
            <HugeiconsIcon icon={Heading01Icon} className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive("bulletList")}
          >
            <HugeiconsIcon icon={ListStartIcon} className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive("orderedList")}
          >
            <span className="text-xs font-mono font-bold">1.</span>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive("blockquote")}
          >
            <HugeiconsIcon icon={QuoteDownIcon} className="size-4" />
          </ToolbarButton>

          <div className="mx-1 h-5 w-px bg-border" />

          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
          >
            <HugeiconsIcon icon={UndoIcon} className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
          >
            <HugeiconsIcon icon={RedoIcon} className="size-4" />
          </ToolbarButton>
        </div>
      )}

      <EditorContent
        editor={editor}
        className={cn(
          "prose prose-sm max-w-none p-4",
          "[&_.tiptap]:outline-none",
          "[&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none [&_.tiptap_p.is-editor-empty:first-child::before]:float-left [&_.tiptap_p.is-editor-empty:first-child::before]:h-0 [&_.tiptap_p.is-editor-empty:first-child::before]:text-muted-foreground [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]",
          "[&_.ProseMirror]:min-h-[16rem]",
          "[&_h1]:text-xl [&_h1]:font-semibold [&_h1]:mt-4 [&_h1]:mb-2",
          "[&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2",
          "[&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1",
          "[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-2",
          "[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-2",
          "[&_li]:my-1",
          "[&_blockquote]:border-l-2 [&_blockquote]:border-muted-foreground/30 [&_blockquote]:pl-4 [&_blockquote]:my-3 [&_blockquote]:text-muted-foreground",
          "[&_p]:my-1",
          "[&_strong]:font-semibold",
          "[&_em]:italic",
        )}
      />
    </div>
  );
}
