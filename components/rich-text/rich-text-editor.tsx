"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import type { Content } from "@tiptap/core";
import {
  Image as ImageIcon,
  Link as LinkIcon,
  ListBullets,
  ListNumbers,
  TextB,
  TextHThree,
  TextItalic,
  TextStrikethrough,
  Quotes,
  Table as TableIcon,
  TextHTwo,
} from "@phosphor-icons/react";

import { getRichTextExtensions } from "@/components/rich-text/extensions";
import { parseRichText, type RichTextDoc } from "@/lib/rich-text";
import { useLocale } from "@/lib/use-locale";
import { cn } from "@/lib/utils";

export type MentionUser = {
  id: string;
  name: string;
  email?: string | null;
};

type Props = {
  value: string;
  onChange: (next: RichTextDoc) => void;
  placeholder?: string;
  className?: string;
  editorClassName?: string;
  mentionUsers?: MentionUser[];
  submitOnEnter?: () => void;
  uploadEndpoint?: string;
  ariaLabel?: string;
};

async function uploadImage(file: File, endpoint: string): Promise<string> {
  const formData = new FormData();
  formData.set("file", file);

  const response = await fetch(endpoint, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(body || "Upload failed");
  }

  const json = (await response.json()) as { url: string };
  return json.url;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
  editorClassName,
  mentionUsers = [],
  submitOnEnter,
  uploadEndpoint = "/api/uploads/image",
  ariaLabel,
}: Props) {
  const locale = useLocale();
  const vi = locale === "vi";
  const [initialDoc] = useState<RichTextDoc>(() => parseRichText(value));
  const fileInputId = useId();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);

  const editor = useEditor({
    extensions: getRichTextExtensions(placeholder),
    content: initialDoc as Content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn(
          "ui-prose min-h-52 max-h-[60vh] overflow-y-auto rounded-md border border-border bg-background px-3 py-2.5 text-[13px] leading-6 text-foreground focus:outline-none focus:border-border-strong",
          editorClassName,
        ),
        "aria-label": ariaLabel ?? (vi ? "Trình soạn mô tả" : "Description editor"),
      },
      handlePaste(view, event) {
        const files = event.clipboardData?.files;
        if (!files || files.length === 0) return false;
        const file = Array.from(files).find((f) => f.type.startsWith("image/"));
        if (!file) return false;
        event.preventDefault();
        void insertImageFromFile(file);
        return true;
      },
      handleDrop(view, event) {
        const files = event.dataTransfer?.files;
        if (!files || files.length === 0) return false;
        const file = Array.from(files).find((f) => f.type.startsWith("image/"));
        if (!file) return false;
        event.preventDefault();
        void insertImageFromFile(file);
        return true;
      },
      handleKeyDown(view, event) {
        if (
          submitOnEnter &&
          event.key === "Enter" &&
          !event.shiftKey &&
          !event.metaKey &&
          !event.ctrlKey &&
          !event.altKey
        ) {
          event.preventDefault();
          submitOnEnter();
          return true;
        }
        return false;
      },
    },
    onUpdate({ editor }) {
      onChange(editor.getJSON() as RichTextDoc);
      setMentionQuery(readMentionQuery(editor));
    },
    onSelectionUpdate({ editor }) {
      setMentionQuery(readMentionQuery(editor));
    },
  });

  const mentionMatches =
    mentionQuery === null
      ? []
      : mentionUsers
          .filter((member) => {
            const query = mentionQuery.trim().toLowerCase();
            if (!query) return true;
            return (
              member.name.toLowerCase().includes(query) ||
              (member.email ?? "").toLowerCase().includes(query)
            );
          })
          .slice(0, 6);

  const insertMention = (member: MentionUser) => {
    if (!editor || mentionQuery === null) return;
    const { from } = editor.state.selection;
    const start = Math.max(0, from - mentionQuery.length - 1);
    editor
      .chain()
      .focus()
      .deleteRange({ from: start, to: from })
      .insertContent(`@${member.name} `)
      .run();
    setMentionQuery(null);
  };

  const insertImageFromFile = useCallback(
    async (file: File) => {
      if (!editor) return;
      setUploadError(null);
      setIsUploading(true);
      try {
        const url = await uploadImage(file, uploadEndpoint);
        editor.chain().focus().setImage({ src: url, alt: file.name }).run();
      } catch (error: unknown) {
        setUploadError(
          error instanceof Error
            ? error.message
            : vi
              ? "Tải ảnh lên thất bại"
              : "Image upload failed",
        );
      } finally {
        setIsUploading(false);
      }
    },
    [editor, uploadEndpoint],
  );

  useEffect(() => {
    if (!editor) return;
    // Keep editor in sync if the parent value resets (e.g., modal reopened).
    const nextDoc = parseRichText(value);
    const currentJSON = JSON.stringify(editor.getJSON());
    const nextJSON = JSON.stringify(nextDoc);
    if (currentJSON !== nextJSON) {
      editor.commands.setContent(nextDoc as Content, { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (!editor) {
    return (
      <div className="ui-skeleton h-32 rounded-md" aria-hidden />
    );
  }

  return (
    <div className={cn("relative grid gap-1.5", className)}>
      <Toolbar
        editor={editor}
        uploadEndpoint={uploadEndpoint}
        onImageRequest={() => {
          document.getElementById(fileInputId)?.click();
        }}
        isUploading={isUploading}
        vi={vi}
      />
      <input
        id={fileInputId}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void insertImageFromFile(file);
          event.target.value = "";
        }}
      />
      <EditorContent editor={editor} />
      {mentionMatches.length ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-border bg-surface shadow-xl">
          <p className="border-b border-border px-3 py-2 text-[11px] font-medium uppercase tracking-[0.04em] text-muted">
            {vi ? "Gắn thẻ thành viên" : "Mention a member"}
          </p>
          <div className="max-h-56 overflow-y-auto p-1">
            {mentionMatches.map((member) => (
              <button
                key={member.id}
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  insertMention(member);
                }}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left transition hover:bg-surface-strong"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-background text-[11px] font-medium text-foreground">
                  {member.name
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part.charAt(0))
                    .join("")
                    .toUpperCase() || "?"}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium text-foreground">
                    @{member.name}
                  </span>
                  {member.email ? (
                    <span className="block truncate text-[11px] text-muted">
                      {member.email}
                    </span>
                  ) : null}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {uploadError ? (
        <p className="font-mono text-[11px] uppercase tracking-[0.04em] text-danger">
          {uploadError}
        </p>
      ) : null}
    </div>
  );
}

function readMentionQuery(editor: NonNullable<ReturnType<typeof useEditor>>) {
  const { from, empty } = editor.state.selection;
  if (!empty) return null;
  const textBefore = editor.state.doc.textBetween(
    Math.max(0, from - 48),
    from,
    "\n",
    "\n",
  );
  const match = /(^|\s)@([\p{L}\p{N}._ -]{0,32})$/u.exec(textBefore);
  return match ? match[2] : null;
}

function Toolbar({
  editor,
  onImageRequest,
  isUploading,
  vi,
}: {
  editor: ReturnType<typeof useEditor>;
  uploadEndpoint: string;
  onImageRequest: () => void;
  isUploading: boolean;
  vi: boolean;
}) {
  if (!editor) return null;

  const btn = (
    isActive: boolean,
    onClick: () => void,
    icon: React.ReactNode,
    label: string,
  ) => (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={isActive}
      title={label}
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-sm border border-transparent text-muted transition hover:bg-surface hover:text-foreground",
        isActive && "border-border bg-surface text-foreground",
      )}
    >
      {icon}
    </button>
  );

  const promptLink = () => {
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt(vi ? "Đường dẫn liên kết" : "Link URL", previousUrl ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url })
      .run();
  };

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-md border border-border bg-surface px-1.5 py-1">
      {btn(
        editor.isActive("bold"),
        () => editor.chain().focus().toggleBold().run(),
        <TextB className="size-4" />,
        vi ? "Đậm" : "Bold",
      )}
      {btn(
        editor.isActive("italic"),
        () => editor.chain().focus().toggleItalic().run(),
        <TextItalic className="size-4" />,
        vi ? "Nghiêng" : "Italic",
      )}
      {btn(
        editor.isActive("strike"),
        () => editor.chain().focus().toggleStrike().run(),
        <TextStrikethrough className="size-4" />,
        vi ? "Gạch ngang" : "Strikethrough",
      )}
      <span className="mx-0.5 h-5 w-px bg-border" />
      {btn(
        editor.isActive("heading", { level: 2 }),
        () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
        <TextHTwo className="size-4" />,
        vi ? "Tiêu đề 2" : "Heading 2",
      )}
      {btn(
        editor.isActive("heading", { level: 3 }),
        () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
        <TextHThree className="size-4" />,
        vi ? "Tiêu đề 3" : "Heading 3",
      )}
      <span className="mx-0.5 h-5 w-px bg-border" />
      {btn(
        editor.isActive("bulletList"),
        () => editor.chain().focus().toggleBulletList().run(),
        <ListBullets className="size-4" />,
        vi ? "Danh sách chấm" : "Bullet list",
      )}
      {btn(
        editor.isActive("orderedList"),
        () => editor.chain().focus().toggleOrderedList().run(),
        <ListNumbers className="size-4" />,
        vi ? "Danh sách số" : "Numbered list",
      )}
      {btn(
        editor.isActive("blockquote"),
        () => editor.chain().focus().toggleBlockquote().run(),
        <Quotes className="size-4" />,
        vi ? "Trích dẫn" : "Blockquote",
      )}
      <span className="mx-0.5 h-5 w-px bg-border" />
      {btn(
        editor.isActive("link"),
        promptLink,
        <LinkIcon className="size-4" />,
        vi ? "Liên kết" : "Link",
      )}
      {btn(
        false,
        () =>
          editor
            .chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run(),
        <TableIcon className="size-4" />,
        vi ? "Chèn bảng" : "Insert table",
      )}
      {btn(
        false,
        onImageRequest,
        <ImageIcon className="size-4" />,
        isUploading
          ? vi
            ? "Đang tải lên…"
            : "Uploading…"
          : vi
            ? "Chèn ảnh"
            : "Insert image",
      )}
    </div>
  );
}
