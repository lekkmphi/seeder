"use client";

import Link from "next/link";
import { useState } from "react";
import {
  NotePencil,
  PencilSimple,
  Plus,
  Trash,
  X,
} from "@phosphor-icons/react";

import { RichTextRenderer } from "@/components/rich-text";
import { RichTextField } from "@/components/rich-text/rich-text-field";
import {
  createProjectNoteAction,
  deleteProjectNoteAction,
  updateProjectNoteAction,
} from "@/lib/actions";
import { t } from "@/lib/i18n";
import { useLocale } from "@/lib/use-locale";
import { cn } from "@/lib/utils";

export type ProjectNoteItem = {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

type Mode = { kind: "idle" } | { kind: "new" } | { kind: "edit"; id: string };

function formatNoteDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ProjectNotesPanel({
  projectId,
  currentPath,
  notes,
  previewLimit,
  manageHref,
}: {
  projectId: string;
  currentPath: string;
  notes: ProjectNoteItem[];
  // When set, only the most recent N notes render with a "View all" link.
  previewLimit?: number;
  manageHref?: string;
}) {
  const locale = useLocale();
  const [mode, setMode] = useState<Mode>({ kind: "idle" });

  const limited =
    previewLimit != null && mode.kind === "idle" && notes.length > previewLimit;
  const visibleNotes = limited ? notes.slice(0, previewLimit) : notes;

  return (
    <div className="space-y-3">
      {mode.kind === "new" ? (
        <form
          action={createProjectNoteAction}
          className="space-y-3 rounded-md border border-border bg-surface px-4 py-4"
          // The note body is a contenteditable, so Enter is a newline and never
          // triggers the form's implicit submission. Cmd/Ctrl+Enter saves.
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              event.currentTarget.requestSubmit();
            }
          }}
        >
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="returnTo" value={currentPath} />
          <RichTextField
            name="content"
            ariaLabel={locale === "vi" ? "Ghi chú mới" : "New note"}
            placeholder={
              locale === "vi"
                ? "Ghi lại quyết định, ghi chú khách hàng, điểm nghẽn hoặc nhắc rà soát tiếp theo..."
                : "Capture a decision, client note, blocker, or next-review prompt..."
            }
          />
          <div className="flex items-center gap-2">
            <button type="submit" className="ui-button-primary">
              {locale === "vi" ? "Lưu ghi chú" : "Save note"}
            </button>
            <button
              type="button"
              onClick={() => setMode({ kind: "idle" })}
              className="ui-button-secondary"
            >
              {t(locale, "cancel")}
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setMode({ kind: "new" })}
          className="ui-button-secondary"
        >
          <Plus className="size-4" />
          {locale === "vi" ? "Thêm ghi chú" : "Add note"}
        </button>
      )}

      {notes.length === 0 && mode.kind !== "new" ? (
        <div className="rounded-md border border-dashed border-border bg-surface px-5 py-10 text-center">
          <div className="mx-auto inline-flex size-10 items-center justify-center rounded-md border border-border bg-background text-muted">
            <NotePencil className="size-5" />
          </div>
          <p className="mt-3 text-[13px] font-medium text-foreground">
            {locale === "vi" ? "Chưa có ghi chú dự án" : "No project notes yet"}
          </p>
          <p className="mt-1 text-[13px] leading-6 text-muted">
            {locale === "vi"
              ? "Ghi quyết định, nghiên cứu và bối cảnh khách hàng ở đây để không làm rối không gian làm việc."
              : "Capture decisions, research, and client context here so it does not crowd the workspace."}
          </p>
        </div>
      ) : null}

      {visibleNotes.map((note) => {
        const isEditing = mode.kind === "edit" && mode.id === note.id;
        const edited = note.updatedAt !== note.createdAt;
        return (
          <div
            key={note.id}
            className="rounded-md border border-border bg-surface px-5 py-4"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-[11px] uppercase tracking-[0.04em] text-muted">
                {formatNoteDate(note.createdAt)}
                {edited ? (locale === "vi" ? " · đã sửa" : " · edited") : null}
              </span>
              {!isEditing ? (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setMode({ kind: "edit", id: note.id })}
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[12px] text-muted transition hover:border-border-strong hover:text-foreground"
                  >
                    <PencilSimple className="size-3.5" />
                    {locale === "vi" ? "Sửa" : "Edit"}
                  </button>
                  <form
                    action={deleteProjectNoteAction}
                    onSubmit={(event) => {
                      if (
                        !window.confirm(
                          locale === "vi" ? "Xóa ghi chú này?" : "Delete this note?",
                        )
                      ) {
                        event.preventDefault();
                      }
                    }}
                  >
                    <input type="hidden" name="projectId" value={projectId} />
                    <input type="hidden" name="noteId" value={note.id} />
                    <input type="hidden" name="returnTo" value={currentPath} />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[12px] text-muted transition hover:border-danger/40 hover:text-danger"
                    >
                      <Trash className="size-3.5" />
                      {locale === "vi" ? "Xóa" : "Delete"}
                    </button>
                  </form>
                </div>
              ) : null}
            </div>

            {isEditing ? (
              <form
                action={updateProjectNoteAction}
                className="space-y-3"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                    event.preventDefault();
                    event.currentTarget.requestSubmit();
                  }
                }}
              >
                <input type="hidden" name="projectId" value={projectId} />
                <input type="hidden" name="noteId" value={note.id} />
                <input type="hidden" name="returnTo" value={currentPath} />
                <RichTextField
                  name="content"
                  defaultValue={note.content}
                  ariaLabel={locale === "vi" ? "Sửa ghi chú" : "Edit note"}
                />
                <div className="flex items-center gap-2">
                  <button type="submit" className="ui-button-primary">
                    {locale === "vi" ? "Lưu thay đổi" : "Save changes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode({ kind: "idle" })}
                    className="ui-button-secondary"
                  >
                    <X className="size-4" />
                    {t(locale, "cancel")}
                  </button>
                </div>
              </form>
            ) : (
              <RichTextRenderer
                value={note.content}
                className={cn("text-sm leading-7 text-foreground")}
                fallback={
                  <p className="text-[13px] italic text-muted">
                    {locale === "vi" ? "Ghi chú trống." : "Empty note."}
                  </p>
                }
              />
            )}
          </div>
        );
      })}

      {limited && manageHref ? (
        <Link
          href={manageHref}
          className="inline-flex text-[13px] font-medium text-accent hover:underline"
        >
          {locale === "vi"
            ? `Xem tất cả ${notes.length} ghi chú ->`
            : `View all ${notes.length} notes ->`}
        </Link>
      ) : null}
    </div>
  );
}
