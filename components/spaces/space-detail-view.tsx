"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  ArrowSquareOut,
  Crown,
  Lock,
  Trash,
  UserPlus,
} from "@phosphor-icons/react";

import { Avatar } from "@/components/ui/avatar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/lib/toast";
import { useLocale } from "@/lib/use-locale";
import { cn } from "@/lib/utils";

type Member = {
  userId: string;
  name: string;
  email: string;
  image: string | null;
  isLead: boolean;
};
type Project = {
  id: string;
  name: string;
  slug: string | null;
  status: string;
  color: string | null;
  archivedAt: Date | null;
  canAccess: boolean;
};
type Detail = {
  id: string;
  name: string;
  leadName: string | null;
  canManage: boolean;
  members: Member[];
  projects: Project[];
};

type Op =
  | { op: "addMember"; spaceId: string; email: string }
  | { op: "removeMember"; spaceId: string; userId: string }
  | { op: "setLead"; spaceId: string; userId: string }
  | { op: "delete"; spaceId: string };

export function SpaceDetailView({ detail }: { detail: Detail }) {
  const router = useRouter();
  const locale = useLocale();
  const vi = locale === "vi";
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const call = (body: Op, successMessage: string, after?: () => void) =>
    startTransition(async () => {
      const res = await fetch("/api/spaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        toast(data.error ?? (vi ? "Đã có lỗi xảy ra." : "Something went wrong."), "danger");
        return;
      }
      toast(successMessage, "success");
      after?.();
      router.refresh();
    });

  const { canManage } = detail;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      {/* Projects */}
      <section className="ui-panel-soft p-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.04em] text-muted">
          {vi ? "Dự án" : "Projects"} · {detail.projects.length}
        </p>
        <div className="mt-3 grid gap-2">
          {detail.projects.map((p) => {
            const colorStyle = p.color
              ? {
                  borderLeftWidth: 3,
                  borderLeftColor: p.color,
                  backgroundColor: `color-mix(in srgb, ${p.color} 8%, transparent)`,
                }
              : undefined;
            const label = (
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
                {p.name}
                {p.archivedAt ? (
                  <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.04em] text-muted">
                    {vi ? "đã lưu trữ" : "archived"}
                  </span>
                ) : null}
              </span>
            );

            // Locked: shown in the list so members see what's in the space, but
            // not openable until they're invited to the project.
            if (!p.canAccess) {
              return (
                <div
                  key={p.id}
                  title={
                    vi
                      ? "Bạn chưa phải thành viên của dự án này — hãy nhờ chủ dự án hoặc trưởng nhóm thêm bạn vào."
                      : "You're not a member of this project — ask the project owner or a lead to add you."
                  }
                  className={cn(
                    "flex cursor-default items-center gap-3 rounded-md border border-border px-3 py-2.5 opacity-60",
                    p.color ? null : "bg-surface",
                  )}
                  style={colorStyle}
                >
                  {label}
                  <span className="inline-flex shrink-0 items-center gap-1 font-mono text-[10px] uppercase tracking-[0.04em] text-muted">
                    <Lock className="size-3.5" />
                    {vi ? "Không có quyền" : "No access"}
                  </span>
                </div>
              );
            }

            return (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className={cn(
                  "group flex items-center gap-3 rounded-md border border-border px-3 py-2.5 transition hover:border-border-strong",
                  p.color ? null : "bg-surface hover:bg-surface-strong",
                )}
                style={colorStyle}
              >
                {label}
                <ArrowSquareOut className="size-4 text-muted transition group-hover:text-foreground" />
              </Link>
            );
          })}
          {detail.projects.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-muted">
              {vi ? "Nhóm này chưa có dự án nào." : "No projects in this team yet."}
            </p>
          ) : null}
        </div>
      </section>

      {/* Members */}
      <section className="ui-panel-soft p-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.04em] text-muted">
          {vi ? "Thành viên" : "Members"} · {detail.members.length}
        </p>

        {canManage ? (
          <form
            className="mt-3 flex flex-wrap gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (isPending || !email.trim()) return;
              call(
                { op: "addMember", spaceId: detail.id, email: email.trim() },
                vi ? "Đã thêm thành viên" : "Member added",
                () => setEmail(""),
              );
            }}
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@company.com"
              className="ui-input min-w-0 flex-1"
              disabled={isPending}
            />
            <button
              type="submit"
              disabled={isPending || !email.trim()}
              className="ui-button-secondary shrink-0 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <UserPlus className="size-4" />
              {vi ? "Thêm" : "Add"}
            </button>
          </form>
        ) : null}

        <div className="mt-2 divide-y divide-border">
          {detail.members.map((m) => (
            <div key={m.userId} className="flex flex-wrap items-center gap-2.5 py-2">
              <Avatar
                name={m.name}
                email={m.email}
                image={m.image}
                px={32}
                className="size-8 rounded-md text-[11px]"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[13px] font-medium text-foreground">
                    {m.name}
                  </span>
                  {m.isLead ? (
                    <span className="inline-flex items-center gap-1 rounded-sm border border-emerald/30 bg-emerald/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.04em] text-emerald">
                      <Crown className="size-3" />
                      {vi ? "trưởng nhóm" : "lead"}
                    </span>
                  ) : null}
                </div>
                <span className="block truncate font-mono text-[11px] text-muted">
                  {m.email}
                </span>
              </div>
              {canManage && !m.isLead ? (
                <>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      call(
                        { op: "setLead", spaceId: detail.id, userId: m.userId },
                        vi ? `${m.name} giờ là trưởng nhóm` : `${m.name} is now lead`,
                      )
                    }
                    className="text-[12px] text-muted transition hover:text-foreground"
                  >
                    {vi ? "Đặt làm trưởng nhóm" : "Make lead"}
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      call(
                        {
                          op: "removeMember",
                          spaceId: detail.id,
                          userId: m.userId,
                        },
                        vi ? "Đã xóa thành viên" : "Member removed",
                      )
                    }
                    className="ui-button-ghost"
                    title={vi ? "Xóa thành viên" : "Remove member"}
                    aria-label={vi ? `Xóa ${m.name}` : `Remove ${m.name}`}
                  >
                    <Trash className="size-4" />
                  </button>
                </>
              ) : null}
            </div>
          ))}
          {detail.members.length === 0 ? (
            <p className="py-2 text-[12px] text-muted">
              {vi ? "Chưa có thành viên nào." : "No members yet."}
            </p>
          ) : null}
        </div>

        {canManage ? (
          <div className="mt-4 border-t border-border pt-4">
            <button
              type="button"
              disabled={isPending}
              onClick={() => setConfirmDelete(true)}
              className="ui-button-danger"
            >
              <Trash className="size-4" />
              {vi ? "Xóa nhóm" : "Delete team"}
            </button>
          </div>
        ) : null}
      </section>

      <ConfirmDialog
        open={confirmDelete}
        title={vi ? `Xóa "${detail.name}"?` : `Delete "${detail.name}"?`}
        description={
          detail.projects.length > 0
            ? vi
              ? `Nhóm này vẫn còn ${detail.projects.length} dự án — hãy chuyển chúng ra trước; thao tác xóa sẽ bị từ chối.`
              : `This team still has ${detail.projects.length} project${detail.projects.length === 1 ? "" : "s"} — move them out first; deletion will be refused.`
            : vi
              ? "Thao tác này xóa nhóm và toàn bộ thành viên. Không thể hoàn tác."
              : "This removes the team and its membership. Cannot be undone."
        }
        confirmLabel={vi ? "Xóa nhóm" : "Delete team"}
        variant="danger"
        isPending={isPending}
        onConfirm={() =>
          call({ op: "delete", spaceId: detail.id }, vi ? "Đã xóa nhóm" : "Team deleted", () => {
            setConfirmDelete(false);
            router.push("/team");
          })
        }
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
