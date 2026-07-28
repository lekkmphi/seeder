import Link from "next/link";
import { Pulse } from "@phosphor-icons/react/dist/ssr";

import { ActivityFilters } from "@/components/admin/activity-filters";
import { ActivityActionBadge } from "@/components/projects/activity-action-badge";
import { requireRole } from "@/lib/auth-server";
import { getRequestLocale } from "@/lib/i18n-server";
import {
  listProjectsBrief,
  listUsersBrief,
  listWorkspaceActivity,
  type ActivityFilters as ActivityFilterValues,
  type WorkspaceActivityItem,
} from "@/lib/data-admin";

export const dynamic = "force-dynamic";

const DISPLAY_LIMIT = 200;

function formatRelative(date: Date, vi: boolean) {
  const diff = Date.now() - date.getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return vi ? "vừa xong" : "just now";
  if (diff < hour) return vi ? `${Math.floor(diff / minute)} phút trước` : `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return vi ? `${Math.floor(diff / hour)} giờ trước` : `${Math.floor(diff / hour)}h ago`;
  if (diff < 30 * day) return vi ? `${Math.floor(diff / day)} ngày trước` : `${Math.floor(diff / day)}d ago`;
  return date.toLocaleDateString(vi ? "vi-VN" : undefined);
}

function ActivityRow({ item, vi }: { item: WorkspaceActivityItem; vi: boolean }) {
  return (
    <div className="flex flex-wrap items-start gap-3 px-4 py-3">
      <span className="flex w-20 shrink-0">
        <ActivityActionBadge action={item.action} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] text-foreground">
          <span className="font-medium">{item.actorName}</span>{" "}
          <span className="text-muted">{item.label.toLowerCase()}</span>
          {item.detail ? (
            <span className="text-muted"> — {item.detail}</span>
          ) : null}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[11px] text-muted">
          <Link
            href={`/projects/${item.projectId}`}
            className="hover:text-foreground"
          >
            {item.projectName}
          </Link>
          <span>·</span>
          <span className="uppercase tracking-[0.04em]">{item.entityType}</span>
          <span>·</span>
          <span>{formatRelative(item.createdAt, vi)}</span>
        </p>
      </div>
    </div>
  );
}

function parseDateParam(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  // YYYY-MM-DD → start of that day in local TZ.
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  const [, y, m, d] = match;
  const parsed = new Date(Number(y), Number(m) - 1, Number(d));
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function pickFirst(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

type PageProps = {
  searchParams: Promise<{
    from?: string | string[];
    to?: string | string[];
    project?: string | string[];
    actor?: string | string[];
  }>;
};

export default async function AdminActivityPage({ searchParams }: PageProps) {
  await requireRole(["owner", "admin"]);
  const raw = await searchParams;
  const locale = await getRequestLocale();
  const vi = locale === "vi";

  const filters: ActivityFilterValues = {
    from: parseDateParam(pickFirst(raw.from)),
    to: parseDateParam(pickFirst(raw.to)),
    projectId: pickFirst(raw.project) || undefined,
    actorId: pickFirst(raw.actor) || undefined,
  };

  const [items, projects, users] = await Promise.all([
    listWorkspaceActivity(filters, DISPLAY_LIMIT),
    listProjectsBrief(),
    listUsersBrief(),
  ]);

  const fromString = pickFirst(raw.from) ?? "";
  const toString = pickFirst(raw.to) ?? "";
  const projectString = pickFirst(raw.project) ?? "";
  const actorString = pickFirst(raw.actor) ?? "";

  return (
    <div className="space-y-6">
      <section className="ui-panel ui-header p-5 sm:p-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.04em] text-muted">
          {vi ? "Quản trị · Hoạt động" : "Admin · Activity"}
        </p>
        <h1 className="mt-2 text-[24px] font-medium tracking-[-0.022em] text-foreground">
          {vi ? "Dòng hoạt động" : "Activity feed"}
        </h1>
        <p className="mt-1 max-w-prose text-[13px] leading-6 text-muted">
          {vi ? (
            <>
              Mọi sự kiện dự án trong không gian làm việc, mới nhất trước. Hiển
              thị tối đa {DISPLAY_LIMIT} sự kiện khớp; dùng Export CSV để lấy
              toàn bộ.
            </>
          ) : (
            <>
              Every project event across the workspace, newest first. Showing up
              to {DISPLAY_LIMIT} matching events; use Export CSV for the full
              slice.
            </>
          )}
        </p>
      </section>

      <ActivityFilters
        projects={projects}
        users={users}
        initial={{
          from: fromString,
          to: toString,
          projectId: projectString,
          actorId: actorString,
        }}
      />

      <div className="ui-panel-soft divide-y divide-border">
        {items.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-10 text-center text-[13px] leading-7 text-muted">
            <Pulse className="size-5 text-muted" />
            <p className="mt-3">
              {vi
                ? "Không có hoạt động nào khớp với bộ lọc này."
                : "No activity matches these filters."}
            </p>
          </div>
        ) : (
          items.map((item) => <ActivityRow key={item.id} item={item} vi={vi} />)
        )}
      </div>
    </div>
  );
}
