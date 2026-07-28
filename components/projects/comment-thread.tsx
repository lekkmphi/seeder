"use client";

import { useState, useTransition } from "react";
import { ArrowBendUpLeft, CircleNotch, Pencil, Trash, X } from "@phosphor-icons/react";

import { RichTextEditor, RichTextRenderer } from "@/components/rich-text";
import { Avatar } from "@/components/ui/avatar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  parseRichText,
  richTextIsEmpty,
  serializeRichText,
  type RichTextDoc,
} from "@/lib/rich-text";
import { toast } from "@/lib/toast";
import { type Locale } from "@/lib/i18n";
import { useLocale } from "@/lib/use-locale";
import { cn } from "@/lib/utils";

export type CommentItem = {
  id: string;
  parentCommentId: string | null;
  content: string;
  authorId: string;
  authorName: string;
  authorImage: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type Actions = {
  create: (formData: FormData) => Promise<void>;
  update: (formData: FormData) => Promise<void>;
  remove: (formData: FormData) => Promise<void>;
};

function timeAgo(date: Date, locale: Locale) {
  const diff = Date.now() - date.getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return locale === "vi" ? "vừa xong" : "just now";
  if (diff < hour) {
    const value = Math.floor(diff / minute);
    return locale === "vi" ? `${value} phút trước` : `${value}m ago`;
  }
  if (diff < day) {
    const value = Math.floor(diff / hour);
    return locale === "vi" ? `${value} giờ trước` : `${value}h ago`;
  }
  if (diff < 30 * day) {
    const value = Math.floor(diff / day);
    return locale === "vi" ? `${value} ngày trước` : `${value}d ago`;
  }
  return date.toLocaleDateString(locale === "vi" ? "vi-VN" : undefined);
}

export function CommentThread({
  comments,
  projectId,
  parentId,
  viewerId,
  viewerCanModerate,
  actions,
}: {
  comments: CommentItem[];
  projectId: string;
  parentId: string;
  viewerId: string;
  viewerCanModerate: boolean;
  actions: Actions;
}) {
  const locale = useLocale();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const repliesByParent = new Map<string, CommentItem[]>();
  const roots: CommentItem[] = [];

  for (const comment of comments) {
    if (comment.parentCommentId) {
      const replies = repliesByParent.get(comment.parentCommentId) ?? [];
      replies.push(comment);
      repliesByParent.set(comment.parentCommentId, replies);
    } else {
      roots.push(comment);
    }
  }

  return (
    <div className="grid gap-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
        {locale === "vi" ? "Bình luận" : "Comments"} · {comments.length}
      </p>

      {comments.length ? (
        <ul className="grid gap-3">
          {roots.map((comment) => (
            <CommentNode
              key={comment.id}
              comment={comment}
              repliesByParent={repliesByParent}
              depth={0}
              projectId={projectId}
              parentId={parentId}
              viewerId={viewerId}
              viewerCanModerate={viewerCanModerate}
              editingId={editingId}
              replyingToId={replyingToId}
              onEdit={setEditingId}
              onReply={setReplyingToId}
              actions={actions}
              locale={locale}
            />
          ))}
        </ul>
      ) : (
        <p className="rounded-md border border-dashed border-border bg-surface px-4 py-6 text-center text-[13px] leading-6 text-muted">
          {locale === "vi" ? "Chưa có bình luận." : "No comments yet."}
        </p>
      )}

      <ComposeForm
        projectId={projectId}
        parentId={parentId}
        parentCommentId={null}
        createAction={actions.create}
        locale={locale}
        onDone={() => setReplyingToId(null)}
      />
    </div>
  );
}

function CommentNode({
  comment,
  repliesByParent,
  depth,
  projectId,
  parentId,
  viewerId,
  viewerCanModerate,
  editingId,
  replyingToId,
  onEdit,
  onReply,
  actions,
  locale,
}: {
  comment: CommentItem;
  repliesByParent: Map<string, CommentItem[]>;
  depth: number;
  projectId: string;
  parentId: string;
  viewerId: string;
  viewerCanModerate: boolean;
  editingId: string | null;
  replyingToId: string | null;
  onEdit: (id: string | null) => void;
  onReply: (id: string | null) => void;
  actions: Actions;
  locale: Locale;
}) {
  const isAuthor = comment.authorId === viewerId;
  const canEdit = isAuthor;
  const canDelete = isAuthor || viewerCanModerate;
  const isEditing = editingId === comment.id;
  const replies = repliesByParent.get(comment.id) ?? [];

  return (
    <li className={cn(depth > 0 && "ml-6 border-l border-border pl-3")}>
      <div className="rounded-md border border-border bg-surface p-3">
        {isEditing ? (
          <CommentEditForm
            comment={comment}
            onCancel={() => onEdit(null)}
            onDone={() => onEdit(null)}
            updateAction={actions.update}
          />
        ) : (
          <>
            <div className="mb-1 flex items-center justify-between gap-2 text-[12px]">
              <div className="flex min-w-0 items-center gap-2">
                <Avatar
                  name={comment.authorName}
                  image={comment.authorImage}
                  px={24}
                  className="size-6 text-[10px]"
                />
                <span className="truncate font-medium text-foreground">
                  {comment.authorName}
                </span>
                <span className="font-mono text-[11px] uppercase tracking-[0.04em] text-muted">
                  {timeAgo(comment.createdAt, locale)}
                  {comment.updatedAt.getTime() !== comment.createdAt.getTime()
                    ? locale === "vi" ? " · đã sửa" : " · edited"
                    : null}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {canEdit ? (
                  <button
                    type="button"
                    onClick={() => onEdit(comment.id)}
                    className="inline-flex size-7 items-center justify-center rounded-sm text-muted transition hover:bg-background hover:text-foreground"
                    title={locale === "vi" ? "Sửa bình luận" : "Edit comment"}
                  >
                    <Pencil className="size-3.5" />
                    <span className="sr-only">
                      {locale === "vi" ? "Sửa bình luận" : "Edit comment"}
                    </span>
                  </button>
                ) : null}
                {canDelete ? (
                  <DeleteCommentButton
                    commentId={comment.id}
                    deleteAction={actions.remove}
                    locale={locale}
                  />
                ) : null}
              </div>
            </div>
            <RichTextRenderer value={comment.content} className="text-[13px]" />
            <button
              type="button"
              onClick={() => onReply(replyingToId === comment.id ? null : comment.id)}
              className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-medium text-muted transition hover:text-foreground"
            >
              <ArrowBendUpLeft className="size-3.5" />
              {locale === "vi" ? "Trả lời" : "Reply"}
            </button>
          </>
        )}
      </div>

      {replyingToId === comment.id ? (
        <div className="mt-2 ml-6">
          <ComposeForm
            projectId={projectId}
            parentId={parentId}
            parentCommentId={comment.id}
            createAction={actions.create}
            locale={locale}
            replyingToName={comment.authorName}
            onDone={() => onReply(null)}
          />
        </div>
      ) : null}

      {replies.length ? (
        <ul className="mt-2 grid gap-2">
          {replies.map((reply) => (
            <CommentNode
              key={reply.id}
              comment={reply}
              repliesByParent={repliesByParent}
              depth={Math.min(depth + 1, 2)}
              projectId={projectId}
              parentId={parentId}
              viewerId={viewerId}
              viewerCanModerate={viewerCanModerate}
              editingId={editingId}
              replyingToId={replyingToId}
              onEdit={onEdit}
              onReply={onReply}
              actions={actions}
              locale={locale}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function ComposeForm({
  projectId,
  parentId,
  parentCommentId,
  createAction,
  locale,
  replyingToName,
  onDone,
}: {
  projectId: string;
  parentId: string;
  parentCommentId: string | null;
  createAction: (formData: FormData) => Promise<void>;
  locale: Locale;
  replyingToName?: string;
  onDone?: () => void;
}) {
  const [doc, setDoc] = useState<RichTextDoc>(parseRichText(null));
  const [resetKey, setResetKey] = useState(0);
  const [isPending, startTransition] = useTransition();

  const post = () => {
    if (isPending || richTextIsEmpty(doc)) return;
    const formData = new FormData();
    formData.set("projectId", projectId);
    formData.set("parentId", parentId);
    if (parentCommentId) formData.set("parentCommentId", parentCommentId);
    formData.set("content", serializeRichText(doc));
    startTransition(async () => {
      try {
        await createAction(formData);
        setDoc(parseRichText(null));
        setResetKey((k) => k + 1);
        toast(
          parentCommentId
            ? locale === "vi" ? "Đã đăng trả lời" : "Reply posted"
            : locale === "vi" ? "Đã đăng bình luận" : "Comment posted",
          "success",
        );
        onDone?.();
      } catch (error: unknown) {
        toast(
          error instanceof Error
            ? error.message
            : locale === "vi" ? "Không thể đăng bình luận" : "Could not post comment",
          "danger",
        );
      }
    });
  };

  return (
    // Enter inserts a newline in the editor (it's rich text — paragraphs,
    // lists, pasted screenshots), so Cmd/Ctrl+Enter is the post shortcut.
    <div
      className="grid gap-2 rounded-md border border-border bg-surface p-3"
      onKeyDown={(event) => {
        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          post();
        }
      }}
    >
      <span className="font-mono text-[11px] uppercase tracking-[0.04em] text-muted">
        {parentCommentId
          ? locale === "vi" ? `Trả lời ${replyingToName ?? ""}` : `Reply to ${replyingToName ?? "comment"}`
          : locale === "vi" ? "Thêm bình luận" : "Add comment"}
      </span>
      <RichTextEditor
        key={resetKey}
        value={serializeRichText(parseRichText(null))}
        onChange={setDoc}
        placeholder={
          parentCommentId
            ? locale === "vi"
              ? "Viết phản hồi..."
              : "Write a reply..."
            : locale === "vi"
            ? "Ghi chú, dán ảnh chụp màn hình hoặc thêm liên kết tham khảo."
            : "Drop notes, paste screenshots, or link references."
        }
        ariaLabel={
          parentCommentId
            ? locale === "vi" ? "Trả lời bình luận" : "Reply to comment"
            : locale === "vi" ? "Bình luận mới" : "New comment"
        }
      />
      <button
        type="button"
        onClick={post}
        disabled={isPending || richTextIsEmpty(doc)}
        className={cn(
          "ui-button-primary self-end px-4 disabled:cursor-not-allowed disabled:opacity-60",
        )}
        title={
          locale === "vi"
            ? "Đăng bình luận (⌘/Ctrl + Enter)"
            : "Post comment (⌘/Ctrl + Enter)"
        }
      >
        {isPending ? <CircleNotch className="size-4 animate-spin" /> : null}
        {isPending
          ? locale === "vi" ? "Đang đăng..." : "Posting..."
          : parentCommentId
            ? locale === "vi" ? "Trả lời" : "Reply"
            : locale === "vi" ? "Bình luận" : "Comment"}
      </button>
    </div>
  );
}

function DeleteCommentButton({
  commentId,
  deleteAction,
  locale,
}: {
  commentId: string;
  deleteAction: (formData: FormData) => Promise<void>;
  locale: Locale;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        disabled={isPending}
        className="inline-flex size-7 items-center justify-center rounded-sm text-muted transition hover:bg-danger/10 hover:text-danger"
        title={locale === "vi" ? "Xóa bình luận" : "Delete comment"}
      >
        {isPending ? (
          <CircleNotch className="size-3.5 animate-spin" />
        ) : (
          <Trash className="size-3.5" />
        )}
        <span className="sr-only">
          {locale === "vi" ? "Xóa bình luận" : "Delete comment"}
        </span>
      </button>
      <ConfirmDialog
        open={showConfirm}
        title={locale === "vi" ? "Xóa bình luận?" : "Delete comment?"}
        description={
          locale === "vi"
            ? "Hành động này không thể hoàn tác."
            : "This action cannot be undone."
        }
        confirmLabel={locale === "vi" ? "Xóa" : "Delete"}
        cancelLabel={locale === "vi" ? "Hủy" : "Cancel"}
        variant="danger"
        isPending={isPending}
        onCancel={() => setShowConfirm(false)}
        onConfirm={() => {
          const formData = new FormData();
          formData.set("commentId", commentId);
          startTransition(async () => {
            try {
              await deleteAction(formData);
              setShowConfirm(false);
              toast(locale === "vi" ? "Đã xóa bình luận" : "Comment deleted", "success");
            } catch (error: unknown) {
              toast(
                error instanceof Error
                  ? error.message
                  : locale === "vi" ? "Không thể xóa bình luận" : "Could not delete comment",
                "danger",
              );
            }
          });
        }}
      />
    </>
  );
}

function CommentEditForm({
  comment,
  onCancel,
  onDone,
  updateAction,
}: {
  comment: CommentItem;
  onCancel: () => void;
  onDone: () => void;
  updateAction: (formData: FormData) => Promise<void>;
}) {
  const locale = useLocale();
  const [doc, setDoc] = useState<RichTextDoc>(parseRichText(comment.content));
  const [isPending, startTransition] = useTransition();

  const save = () => {
    if (isPending || richTextIsEmpty(doc)) return;
    const formData = new FormData();
    formData.set("commentId", comment.id);
    formData.set("content", serializeRichText(doc));
    startTransition(async () => {
      try {
        await updateAction(formData);
        toast(locale === "vi" ? "Đã cập nhật bình luận" : "Comment updated", "success");
        onDone();
      } catch (error: unknown) {
        toast(
          error instanceof Error
            ? error.message
            : locale === "vi" ? "Không thể cập nhật bình luận" : "Could not update comment",
          "danger",
        );
      }
    });
  };

  return (
    // Enter is a newline in the editor, so Cmd/Ctrl+Enter saves and Escape
    // backs out — the same pair the composer above uses.
    <div
      className="grid gap-2"
      onKeyDown={(event) => {
        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          save();
          return;
        }
        if (event.key === "Escape" && !isPending) {
          event.preventDefault();
          onCancel();
        }
      }}
    >
      <RichTextEditor
        value={comment.content}
        onChange={setDoc}
        ariaLabel={locale === "vi" ? "Sửa bình luận" : "Edit comment"}
      />
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="ui-button-ghost px-3"
        >
          <X className="size-4" />
          {locale === "vi" ? "Hủy" : "Cancel"}
        </button>
        <button
          type="button"
          onClick={save}
          disabled={isPending || richTextIsEmpty(doc)}
          className="ui-button-primary px-4 disabled:cursor-not-allowed disabled:opacity-60"
          title={locale === "vi" ? "Lưu (⌘/Ctrl + Enter)" : "Save (⌘/Ctrl + Enter)"}
        >
          {isPending ? <CircleNotch className="size-4 animate-spin" /> : null}
          {isPending
            ? locale === "vi" ? "Đang lưu..." : "Saving..."
            : locale === "vi" ? "Lưu" : "Save"}
        </button>
      </div>
    </div>
  );
}
