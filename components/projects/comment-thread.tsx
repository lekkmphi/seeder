"use client";

import { useEffect, useState, useTransition } from "react";
import {
  ArrowBendUpLeft,
  CircleNotch,
  PaperPlaneTilt,
  X,
} from "@phosphor-icons/react";

import { RichTextEditor, RichTextRenderer } from "@/components/rich-text";
import type { MentionUser } from "@/components/rich-text/rich-text-editor";
import { Avatar } from "@/components/ui/avatar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  parseRichText,
  richTextIsEmpty,
  serializeRichText,
  type RichTextDoc,
} from "@/lib/rich-text";
import { type Locale } from "@/lib/i18n";
import { toast } from "@/lib/toast";
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
  reactions: Array<{ reaction: string; count: number }>;
  viewerReaction: string | null;
};

type Actions = {
  create: (formData: FormData) => Promise<void>;
  update: (formData: FormData) => Promise<void>;
  remove: (formData: FormData) => Promise<void>;
  react: (formData: FormData) => Promise<void>;
};

type ReactionType =
  | "like"
  | "dislike"
  | "heart"
  | "laugh"
  | "wow"
  | "sad"
  | "angry";

const reactionOptions: Array<{
  value: ReactionType;
  icon: string;
  labelVi: string;
  labelEn: string;
}> = [
  { value: "like", icon: "👍", labelVi: "Thích", labelEn: "Like" },
  { value: "dislike", icon: "👎", labelVi: "Không thích", labelEn: "Dislike" },
  { value: "heart", icon: "❤️", labelVi: "Thả tim", labelEn: "Love" },
  { value: "laugh", icon: "😂", labelVi: "Haha", labelEn: "Haha" },
  { value: "wow", icon: "😮", labelVi: "Wow", labelEn: "Wow" },
  { value: "sad", icon: "😢", labelVi: "Buồn", labelEn: "Sad" },
  { value: "angry", icon: "😡", labelVi: "Phẫn nộ", labelEn: "Angry" },
];

const hoverReactionOptions = reactionOptions.filter(
  (option) => option.value !== "dislike",
);

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
  viewerName,
  viewerEmail,
  viewerImage,
  viewerCanModerate,
  mentionUsers,
  actions,
}: {
  comments: CommentItem[];
  projectId: string;
  parentId: string;
  viewerId: string;
  viewerName: string;
  viewerEmail: string;
  viewerImage: string | null;
  viewerCanModerate: boolean;
  mentionUsers: MentionUser[];
  actions: Actions;
}) {
  const locale = useLocale();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const repliesByParent = new Map<string, CommentItem[]>();
  const roots: CommentItem[] = [];
  const commentTargetKey = comments.map((comment) => comment.id).join(",");

  for (const comment of comments) {
    if (comment.parentCommentId) {
      const replies = repliesByParent.get(comment.parentCommentId) ?? [];
      replies.push(comment);
      repliesByParent.set(comment.parentCommentId, replies);
    } else {
      roots.push(comment);
    }
  }

  useEffect(() => {
    if (!comments.length) return;

    let highlightedTarget: HTMLElement | null = null;
    let highlightTimer: number | undefined;

    const scrollToHashComment = () => {
      if (!window.location.hash.startsWith("#comment-")) return;

      const targetId = decodeURIComponent(window.location.hash.slice(1));
      const target = document.getElementById(targetId);
      if (!target) return;

      requestAnimationFrame(() => {
        const scrollContainer = target.closest<HTMLElement>("[data-modal-scroll]");

        if (scrollContainer) {
          const targetRect = target.getBoundingClientRect();
          const containerRect = scrollContainer.getBoundingClientRect();
          const stickyHeaderOffset = 96;
          const nextScrollTop =
            scrollContainer.scrollTop +
            targetRect.top -
            containerRect.top -
            stickyHeaderOffset;

          scrollContainer.scrollTo({
            top: Math.max(0, nextScrollTop),
            behavior: "smooth",
          });
        } else {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }

        highlightedTarget?.classList.remove("comment-target-highlight");
        highlightedTarget = target;
        target.classList.add("comment-target-highlight");
        window.clearTimeout(highlightTimer);
        highlightTimer = window.setTimeout(() => {
          target.classList.remove("comment-target-highlight");
        }, 1800);
      });
    };

    scrollToHashComment();
    window.addEventListener("hashchange", scrollToHashComment);

    return () => {
      window.removeEventListener("hashchange", scrollToHashComment);
      if (highlightTimer) {
        window.clearTimeout(highlightTimer);
      }
      highlightedTarget?.classList.remove("comment-target-highlight");
    };
  }, [commentTargetKey, comments.length]);

  return (
    <section className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[15px] font-semibold text-foreground">
          {locale === "vi" ? "Bình luận" : "Comments"}
        </p>
        <span className="rounded-full bg-surface-subtle px-2.5 py-1 text-[12px] font-medium text-muted">
          {comments.length}
        </span>
      </div>

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
              viewerName={viewerName}
              viewerEmail={viewerEmail}
              viewerImage={viewerImage}
              viewerCanModerate={viewerCanModerate}
              editingId={editingId}
              replyingToId={replyingToId}
              onEdit={setEditingId}
              onReply={setReplyingToId}
              actions={actions}
              locale={locale}
              mentionUsers={mentionUsers}
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
        mentionUsers={mentionUsers}
        viewerName={viewerName}
        viewerEmail={viewerEmail}
        viewerImage={viewerImage}
        onDone={() => setReplyingToId(null)}
      />
    </section>
  );
}

function CommentNode({
  comment,
  repliesByParent,
  depth,
  replyTargetName,
  projectId,
  parentId,
  viewerId,
  viewerName,
  viewerEmail,
  viewerImage,
  viewerCanModerate,
  editingId,
  replyingToId,
  onEdit,
  onReply,
  actions,
  locale,
  mentionUsers,
}: {
  comment: CommentItem;
  repliesByParent: Map<string, CommentItem[]>;
  depth: number;
  replyTargetName?: string;
  projectId: string;
  parentId: string;
  viewerId: string;
  viewerName: string;
  viewerEmail: string;
  viewerImage: string | null;
  viewerCanModerate: boolean;
  editingId: string | null;
  replyingToId: string | null;
  onEdit: (id: string | null) => void;
  onReply: (id: string | null) => void;
  actions: Actions;
  locale: Locale;
  mentionUsers: MentionUser[];
}) {
  const isAuthor = comment.authorId === viewerId;
  const canEdit = isAuthor;
  const canDelete = isAuthor || viewerCanModerate;
  const isEditing = editingId === comment.id;
  const replies = repliesByParent.get(comment.id) ?? [];

  return (
    <li id={`comment-${comment.id}`} className="scroll-mt-24 rounded-[20px]">
      <div className="flex gap-2.5">
        <Avatar
          name={comment.authorName}
          image={comment.authorImage}
          px={32}
          className="mt-0.5 size-8 rounded-full text-[11px]"
        />
        <div className="min-w-0 flex-1">
          {isEditing ? (
            <CommentEditForm
              comment={comment}
              onCancel={() => onEdit(null)}
              onDone={() => onEdit(null)}
              updateAction={actions.update}
              mentionUsers={mentionUsers}
            />
          ) : (
            <>
              <div className="inline-block max-w-full rounded-[18px] bg-surface-subtle px-3 py-2 align-top">
                <div className="mb-0.5 flex min-w-0 items-center gap-2">
                  <span className="truncate text-[13px] font-semibold text-foreground">
                    {comment.authorName}
                  </span>
                  <span className="shrink-0 text-[11px] text-muted">
                    {timeAgo(comment.createdAt, locale)}
                    {comment.updatedAt.getTime() !== comment.createdAt.getTime()
                      ? locale === "vi" ? " · đã sửa" : " · edited"
                      : null}
                  </span>
                </div>
                <div className="flex min-w-0 flex-wrap items-baseline gap-x-1">
                  {replyTargetName ? (
                    <span className="text-[13px] font-semibold text-accent">
                      @{replyTargetName}
                    </span>
                  ) : null}
                  <RichTextRenderer
                    value={comment.content}
                    className="comment-prose min-w-0 text-[13px] leading-5"
                  />
                </div>
              </div>

              <ReactionBar
                comment={comment}
                reactAction={actions.react}
                locale={locale}
                isReplying={replyingToId === comment.id}
                onReply={() =>
                  onReply(replyingToId === comment.id ? null : comment.id)
                }
                onEdit={canEdit ? () => onEdit(comment.id) : null}
                deleteButton={
                  canDelete ? (
                    <DeleteCommentButton
                      commentId={comment.id}
                      deleteAction={actions.remove}
                      locale={locale}
                    />
                  ) : null
                }
              />
            </>
          )}
        </div>
      </div>

      {replyingToId === comment.id ? (
        <div className={cn("mt-2", depth === 0 ? "ml-10" : "ml-0")}>
          <ComposeForm
            projectId={projectId}
            parentId={parentId}
            parentCommentId={
              depth === 0 ? comment.id : comment.parentCommentId ?? comment.id
            }
            createAction={actions.create}
            locale={locale}
            mentionUsers={mentionUsers}
            viewerName={viewerName}
            viewerEmail={viewerEmail}
            viewerImage={viewerImage}
            replyingToName={comment.authorName}
            onDone={() => onReply(null)}
          />
        </div>
      ) : null}

      {replies.length ? (
        <ul className={cn("mt-2 grid gap-2", depth === 0 && "ml-10")}>
          {replies.map((reply) => (
            <CommentNode
              key={reply.id}
              comment={reply}
              repliesByParent={repliesByParent}
              depth={1}
              replyTargetName={comment.authorName}
              projectId={projectId}
              parentId={parentId}
              viewerId={viewerId}
              viewerName={viewerName}
              viewerEmail={viewerEmail}
              viewerImage={viewerImage}
              viewerCanModerate={viewerCanModerate}
              editingId={editingId}
              replyingToId={replyingToId}
              onEdit={onEdit}
              onReply={onReply}
              actions={actions}
              locale={locale}
              mentionUsers={mentionUsers}
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
  mentionUsers,
  viewerName,
  viewerEmail,
  viewerImage,
  replyingToName,
  onDone,
}: {
  projectId: string;
  parentId: string;
  parentCommentId: string | null;
  createAction: (formData: FormData) => Promise<void>;
  locale: Locale;
  mentionUsers: MentionUser[];
  viewerName: string;
  viewerEmail: string;
  viewerImage: string | null;
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
    // Enter posts; Shift+Enter inserts a newline.
    <div
      className="flex items-start gap-2.5"
      onKeyDown={(event) => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          post();
        }
      }}
    >
      <Avatar
        name={viewerName}
        email={viewerEmail}
        image={viewerImage}
        px={32}
        className="mt-0.5 size-8 rounded-full text-[11px]"
      />
      <div className="min-w-0 flex-1 rounded-[22px] bg-surface-subtle px-3 py-2 shadow-sm ring-1 ring-border/70">
        {parentCommentId ? (
          <p className="mb-1 px-1 text-[12px] font-medium text-muted">
            {locale === "vi"
              ? `Trả lời ${replyingToName ?? ""}`
              : `Reply to ${replyingToName ?? "comment"}`}
          </p>
        ) : null}
        <div className="relative">
          <RichTextEditor
            key={resetKey}
            value={serializeRichText(parseRichText(null))}
            onChange={setDoc}
            mentionUsers={mentionUsers}
            submitOnEnter={post}
            placeholder={
              parentCommentId
                ? locale === "vi" ? "Viết phản hồi..." : "Write a reply..."
                : locale === "vi" ? "Viết bình luận..." : "Write a comment..."
            }
            className="comment-composer-editor"
            editorClassName="min-h-10 max-h-40 rounded-none border-0 bg-transparent py-1 pl-0 pr-11 text-[14px] leading-6 focus:border-0"
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
              "absolute right-0 top-1 inline-flex size-8 items-center justify-center rounded-full bg-emerald text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45",
            )}
            title={
              locale === "vi"
                ? "Enter để đăng, Shift+Enter để xuống dòng"
                : "Enter to post, Shift+Enter for a new line"
            }
          >
            {isPending ? (
              <CircleNotch className="size-4 animate-spin" />
            ) : (
              <PaperPlaneTilt className="size-4" weight="fill" />
            )}
            <span className="sr-only">
              {isPending
                ? locale === "vi" ? "Đang đăng..." : "Posting..."
                : parentCommentId
                  ? locale === "vi" ? "Trả lời" : "Reply"
                  : locale === "vi" ? "Bình luận" : "Comment"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

function ReactionBar({
  comment,
  reactAction,
  locale,
  isReplying,
  onReply,
  onEdit,
  deleteButton,
}: {
  comment: CommentItem;
  reactAction: (formData: FormData) => Promise<void>;
  locale: Locale;
  isReplying: boolean;
  onReply: () => void;
  onEdit: (() => void) | null;
  deleteButton: React.ReactNode;
}) {
  const [isPending, startTransition] = useTransition();
  const counts = new Map(
    comment.reactions.map((reaction) => [reaction.reaction, reaction.count]),
  );
  const total = comment.reactions.reduce(
    (sum, reaction) => sum + reaction.count,
    0,
  );
  const selectedReaction = reactionOptions.find(
    (option) => option.value === comment.viewerReaction,
  );
  const likeSelected =
    comment.viewerReaction !== null && comment.viewerReaction !== "dislike";
  const dislikeSelected = comment.viewerReaction === "dislike";

  const react = (reaction: ReactionType) => {
    if (isPending) return;
    const formData = new FormData();
    formData.set("commentId", comment.id);
    formData.set("reaction", reaction);
    startTransition(async () => {
      try {
        await reactAction(formData);
      } catch (error: unknown) {
        toast(
          error instanceof Error
            ? error.message
            : locale === "vi" ? "Không thể thả cảm xúc" : "Could not react",
          "danger",
        );
      }
    });
  };

  return (
    <div className="mt-1 flex flex-wrap items-center gap-3 px-3 text-[12px] font-semibold text-muted">
      <div className="group/reactions relative -ml-1">
        <div className="pointer-events-none absolute bottom-full left-0 z-30 -mb-1 pb-2 opacity-0 transition duration-150 group-hover/reactions:pointer-events-auto group-hover/reactions:opacity-100 group-focus-within/reactions:pointer-events-auto group-focus-within/reactions:opacity-100">
          <div className="flex translate-y-1 items-center gap-1 rounded-full border border-border bg-surface-strong px-1.5 py-1 shadow-lg ring-1 ring-black/5 transition duration-150 group-hover/reactions:translate-y-0 group-focus-within/reactions:translate-y-0">
            {hoverReactionOptions.map((option) => {
              const selected = comment.viewerReaction === option.value;
              const count = counts.get(option.value) ?? 0;
              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={isPending}
                  onClick={() => react(option.value)}
                  aria-pressed={selected}
                  title={locale === "vi" ? option.labelVi : option.labelEn}
                  className={cn(
                    "inline-flex size-9 items-center justify-center rounded-full text-[22px] transition hover:-translate-y-1 hover:scale-110 disabled:cursor-not-allowed disabled:opacity-60",
                    selected && "bg-accent-soft ring-2 ring-accent/40",
                  )}
                >
                  <span aria-hidden>{option.icon}</span>
                  {count ? <span className="sr-only">{count}</span> : null}
                </button>
              );
            })}
          </div>
        </div>
        <button
          type="button"
          disabled={isPending}
          onClick={() => react("like")}
          aria-pressed={likeSelected}
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-1 py-0.5 transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60",
            likeSelected && "text-accent",
          )}
        >
          <span aria-hidden>{likeSelected ? selectedReaction?.icon : "👍"}</span>
          <span className="sr-only">{locale === "vi" ? "Thích" : "Like"}</span>
        </button>
      </div>
      <button
        type="button"
        disabled={isPending}
        onClick={() => react("dislike")}
        aria-pressed={dislikeSelected}
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-1 py-0.5 transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60",
          dislikeSelected && "text-accent",
        )}
      >
        <span aria-hidden>👎</span>
        <span className="sr-only">
          {locale === "vi" ? "Không thích" : "Dislike"}
        </span>
      </button>
      <button
        type="button"
        onClick={onReply}
        aria-pressed={isReplying}
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-1 py-0.5 transition hover:text-foreground",
          isReplying && "text-accent",
        )}
      >
        <ArrowBendUpLeft className="size-3.5" />
        {locale === "vi" ? "Trả lời" : "Reply"}
      </button>
      {onEdit ? (
        <button
          type="button"
          onClick={onEdit}
          className="rounded-full px-1 py-0.5 transition hover:text-foreground"
          title={locale === "vi" ? "Sửa bình luận" : "Edit comment"}
        >
          {locale === "vi" ? "Sửa" : "Edit"}
        </button>
      ) : null}
      {deleteButton}
      {total ? (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted">
          {comment.reactions.slice(0, 3).map((reaction) => {
            const option = reactionOptions.find(
              (item) => item.value === reaction.reaction,
            );
            return option ? (
              <span key={reaction.reaction} aria-hidden>
                {option.icon}
              </span>
            ) : null;
          })}
          {total}
        </span>
      ) : null}
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
        className="transition hover:text-danger disabled:cursor-not-allowed disabled:opacity-60"
        title={locale === "vi" ? "Xóa bình luận" : "Delete comment"}
      >
        {isPending ? (
          <CircleNotch className="size-3.5 animate-spin" />
        ) : (
          locale === "vi" ? "Xóa" : "Delete"
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
  mentionUsers,
}: {
  comment: CommentItem;
  onCancel: () => void;
  onDone: () => void;
  updateAction: (formData: FormData) => Promise<void>;
  mentionUsers: MentionUser[];
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
    // Enter is a newline in the editor, so Cmd/Ctrl+Enter saves and Escape cancels.
    <div
      className="grid gap-2 rounded-2xl bg-surface-subtle p-2"
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
        mentionUsers={mentionUsers}
        editorClassName="min-h-24 max-h-64 rounded-xl border-transparent bg-background/70 px-3 py-2 leading-5 focus:border-border"
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
