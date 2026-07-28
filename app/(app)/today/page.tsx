import Link from "next/link";
import {
  ArrowSquareOut,
  CalendarCheck,
  CalendarDots,
  Kanban,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";

import { ActivityFeed } from "@/components/projects/activity-feed";
import { ProjectColorBadge } from "@/components/projects/project-color-badge";
import { StatusBadge } from "@/components/projects/status-badge";
import { requireSession } from "@/lib/auth-server";
import {
  getDailyTasksForUser,
  getTodayViewForUser,
  type TodayView,
} from "@/lib/data";
import { addDays, formatDateKey, startOfDay } from "@/lib/daily";
import { getRequestLocale } from "@/lib/i18n-server";
import { parseRichText, richTextToPlainText } from "@/lib/rich-text";
import { cn, formatDate } from "@/lib/utils";

const statusBadgeTone: Record<"todo" | "doing" | "done", string> = {
  todo: "border-border bg-surface text-muted",
  doing: "border-aether-blue/40 bg-transparent text-aether-blue",
  done: "border-emerald/30 bg-emerald/10 text-emerald",
};

type UnifiedTodayItem = {
  key: string;
  source: "daily" | "board";
  title: string;
  description: string | null;
  status: string;
  // Board items carry their custom status color; daily items leave it null and
  // fall back to the fixed-status tone map.
  statusColor: string | null;
  kindLabel: string;
  isProject: boolean;
  projectColor: string | null;
  code: string | null;
  href: string;
  dueLabel: string | null;
  dueState: string | null;
  isOverdue: boolean;
  linkedStatus: string | null;
  linkedStatusColor: string | null;
  boardHref: string | null;
};

function formatDateLabel(value: Date | null, locale: "vi" | "en") {
  return formatDate(value, locale === "vi" ? "Chưa có hạn" : "No due date");
}

function formatDueState(task: TodayView["overdue"][number], locale: "vi" | "en") {
  if (task.isOverdue) {
    return locale === "vi" ? "Quá hạn" : "Overdue";
  }

  if (task.daysUntilDue === 0) {
    return locale === "vi" ? "Hạn hôm nay" : "Due today";
  }

  if (task.daysUntilDue === 1) {
    return locale === "vi" ? "Hạn ngày mai" : "Due tomorrow";
  }

  if (typeof task.daysUntilDue === "number") {
    return locale === "vi" ? `Còn ${task.daysUntilDue} ngày` : `Due in ${task.daysUntilDue} days`;
  }

  return locale === "vi" ? "Chưa có hạn" : "No due date";
}

function SummaryCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <section className="ui-panel p-4">
      <p className="font-mono text-[11px] font-medium uppercase tracking-[0.04em] text-muted">
        {label}
      </p>
      <p className="mt-1 font-mono text-[28px] font-medium tracking-[-0.022em] text-foreground">
        {value}
      </p>
      <p className="mt-1 text-[13px] leading-6 text-muted">{detail}</p>
    </section>
  );
}

function TaskSection({
  title,
  description,
  items,
  emptyCopy,
  locale,
}: {
  title: string;
  description: string;
  items: TodayView["overdue"];
  emptyCopy: string;
  locale: "vi" | "en";
}) {
  return (
    <section className="ui-panel p-5 sm:p-6">
      <div className="mb-4">
        <h2 className="text-[17px] font-medium tracking-[-0.022em] text-foreground">
          {title}
        </h2>
        <p className="mt-1 max-w-2xl text-[13px] leading-6 text-muted">
          {description}
        </p>
      </div>

      {items.length ? (
        <div className="grid gap-2 xl:grid-cols-2">
          {items.map((task) => (
            <Link
              key={task.id}
              href={task.href}
              className="group rounded-md border border-border bg-surface px-4 py-3 transition hover:border-border-strong hover:bg-surface-strong"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    <ProjectColorBadge
                      name={task.projectName}
                      color={task.projectColor}
                    />
                    <StatusBadge name={task.statusName} color={task.statusColor} />
                  </div>
                  <div>
                    {task.code ? (
                      <p className="font-mono text-[10px] uppercase tracking-[0.06em] text-muted">
                        {task.code}
                      </p>
                    ) : null}
                    <h3 className="text-[15px] font-medium tracking-[-0.011em] text-foreground">
                      {task.title}
                    </h3>
                    <p className="mt-1 text-[13px] leading-6 text-muted line-clamp-3">
                      {richTextToPlainText(parseRichText(task.description)) ||
                        (locale === "vi" ? "Chưa có ngữ cảnh thêm cho công việc." : "No extra task context yet.")}
                    </p>
                  </div>
                </div>
                <ArrowSquareOut className="mt-1 size-4 text-muted transition group-hover:text-foreground" />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-3 font-mono text-[11px] uppercase tracking-[0.04em] text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDots className="size-3.5" />
                  {formatDateLabel(task.dueDate, locale)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <WarningCircle className="size-3.5" />
                  {formatDueState(task, locale)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-border bg-surface px-5 py-10 text-center">
          <div className="mx-auto inline-flex size-10 items-center justify-center rounded-md border border-border bg-background text-muted">
            <CalendarDots className="size-5" />
          </div>
          <p className="mt-3 text-[13px] font-medium text-foreground">
            {locale === "vi" ? "Ổn cả" : "All clear"}
          </p>
          <p className="mt-1 text-[13px] leading-6 text-muted">{emptyCopy}</p>
        </div>
      )}
    </section>
  );
}

function UnifiedTodaySection({ items, locale }: { items: UnifiedTodayItem[]; locale: "vi" | "en" }) {
  return (
    <section className="ui-panel p-5 sm:p-6">
      <div className="mb-4">
        <h2 className="text-[17px] font-medium tracking-[-0.022em] text-foreground">
          {locale === "vi" ? "Hôm nay" : "Today"}
        </h2>
        <p className="mt-1 max-w-2xl text-[13px] leading-6 text-muted">
          {locale === "vi"
            ? "Mọi việc trên bàn hôm nay, gồm việc đã lên kế hoạch và việc đến hạn, trong một danh sách."
            : "Everything on your plate today — what you planned and what is due — in one list."}
        </p>
      </div>

      {items.length ? (
        <div className="grid gap-2 xl:grid-cols-2">
          {items.map((item) => {
            const cardStyle = item.projectColor
              ? {
                  backgroundColor: `color-mix(in srgb, ${item.projectColor} 10%, var(--surface))`,
                }
              : undefined;
            return (
              <Link
                key={item.key}
                href={item.href}
                className="group rounded-md border border-border bg-surface px-4 py-3 transition hover:border-border-strong hover:bg-surface-strong"
                style={cardStyle}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {item.isProject ? (
                        <ProjectColorBadge
                          name={item.kindLabel}
                          color={item.projectColor}
                        />
                      ) : (
                        <span className="ui-badge">{item.kindLabel}</span>
                      )}
                      {item.statusColor ? (
                        <StatusBadge name={item.status} color={item.statusColor} />
                      ) : (
                        <span
                          className={cn(
                            "inline-flex rounded-sm border px-1.5 py-0.5 font-mono text-[11px] font-medium uppercase tracking-[0.04em]",
                            statusBadgeTone[
                              item.status as "todo" | "doing" | "done"
                            ] ?? "border-border bg-surface text-muted",
                          )}
                        >
                          {item.status}
                        </span>
                      )}
                      <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-muted">
                        {item.source === "daily"
                          ? locale === "vi" ? "Đã lên lịch" : "Planned"
                          : locale === "vi" ? "Bảng" : "Board"}
                      </span>
                    </div>
                    <div>
                      {item.code ? (
                        <p className="font-mono text-[10px] uppercase tracking-[0.06em] text-muted">
                          {item.code}
                        </p>
                      ) : null}
                      <h3 className="text-[15px] font-medium tracking-[-0.011em] text-foreground">
                        {item.title}
                      </h3>
                    </div>
                  </div>
                  <ArrowSquareOut className="mt-1 size-4 shrink-0 text-muted transition group-hover:text-foreground" />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-3 font-mono text-[11px] uppercase tracking-[0.04em] text-muted">
                  {item.source === "board" ? (
                    <>
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDots className="size-3.5" />
                        {item.dueLabel}
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5",
                          item.isOverdue && "text-danger",
                        )}
                      >
                        <WarningCircle className="size-3.5" />
                        {item.dueState}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarCheck className="size-3.5" />
                        {locale === "vi" ? "Đã lên lịch hôm nay" : "Planned today"}
                      </span>
                      {item.linkedStatus ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Kanban className="size-3.5" />
                          {locale === "vi" ? "bảng:" : "board:"}{" "}
                          <StatusBadge
                            name={item.linkedStatus}
                            color={item.linkedStatusColor}
                          />
                        </span>
                      ) : null}
                    </>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-border bg-surface px-5 py-10 text-center">
          <div className="mx-auto inline-flex size-10 items-center justify-center rounded-md border border-border bg-background text-muted">
            <CalendarCheck className="size-5" />
          </div>
          <p className="mt-3 text-[13px] font-medium text-foreground">
            {locale === "vi" ? "Hôm nay chưa có việc đã lên lịch hoặc đến hạn" : "Nothing planned or due today"}
          </p>
          <p className="mt-1 text-[13px] leading-6 text-muted">
            {locale === "vi" ? "Lên kế hoạch ngày ở " : "Plan your day on the "}
            <Link href="/daily" className="text-accent hover:underline">
              {locale === "vi" ? "Lịch ngày" : "Daily planner"}
            </Link>
            .
          </p>
        </div>
      )}
    </section>
  );
}

export default async function TodayPage() {
  const session = await requireSession();
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const todayKey = formatDateKey(today);

  const [todayView, dailyToday, locale] = await Promise.all([
    getTodayViewForUser(session.user.id),
    getDailyTasksForUser(session.user.id, today, tomorrow),
    getRequestLocale(),
  ]);

  // Board tasks already represented by a linked daily item are deduped out.
  const linkedIds = new Set(
    dailyToday
      .filter((item) => item.linkedTaskId)
      .map((item) => item.linkedTaskId as string),
  );

  const boardToUnified = (
    task: TodayView["overdue"][number],
  ): UnifiedTodayItem => ({
    key: `board-${task.id}`,
    source: "board",
    title: task.title,
    description: task.description,
    status: task.statusName,
    statusColor: task.statusColor,
    kindLabel: task.projectName,
    isProject: true,
    projectColor: task.projectColor,
    code: task.code,
    href: task.href,
    dueLabel: formatDateLabel(task.dueDate, locale),
    dueState: formatDueState(task, locale),
    isOverdue: task.isOverdue,
    linkedStatus: null,
    linkedStatusColor: null,
    boardHref: null,
  });

  const dailyToUnified = (
    item: (typeof dailyToday)[number],
  ): UnifiedTodayItem => ({
    key: `daily-${item.id}`,
    source: "daily",
    title: item.title,
    description: item.description,
    status: item.status,
    statusColor: null,
    kindLabel:
      item.kind === "project"
        ? item.projectName ?? (locale === "vi" ? "Dự án" : "Project")
        : locale === "vi" ? "Việc lẻ" : "Adhoc",
    isProject: item.kind === "project",
    projectColor: item.projectColor,
    code: item.projectCode,
    href: `/daily?date=${todayKey}`,
    dueLabel: null,
    dueState: null,
    isOverdue: false,
    linkedStatus: item.linkedTaskId ? item.linkedStatus : null,
    linkedStatusColor: item.linkedTaskId ? item.linkedStatusColor : null,
    boardHref: item.boardHref,
  });

  // Overdue board work first, then today's plan, then other due-today tasks.
  const mergedToday: UnifiedTodayItem[] = [
    ...todayView.overdue.filter((task) => !linkedIds.has(task.id)).map(boardToUnified),
    ...dailyToday.map(dailyToUnified),
    ...todayView.dueToday.filter((task) => !linkedIds.has(task.id)).map(boardToUnified),
  ];

  return (
    <div className="grid gap-6">
      <section className="ui-panel ui-header p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl space-y-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.04em] text-muted">
              {locale === "vi" ? "Hôm nay" : "Today"}
            </p>
            <h1 className="text-3xl font-medium tracking-tighter text-foreground sm:text-[40px]">
              {locale === "vi" ? "Hàng đợi hôm nay" : "Today queue"}
            </h1>
            <p className="max-w-2xl text-[13px] leading-6 text-muted sm:text-[15px]">
              {locale === "vi"
                ? "Xem việc đang trễ, việc sắp đến hạn và việc đang chạy nhưng chưa có hạn."
                : "See what is late, what is due next, and what is moving without a deadline."}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <Link
              href="/daily"
              className="inline-flex min-h-9 items-center gap-2 rounded-md border border-border-strong bg-surface-strong px-3 py-1.5 text-[13px] font-medium text-foreground transition hover:bg-surface"
            >
              <CalendarCheck className="size-4" />
              {locale === "vi" ? "Việc hằng ngày" : "Daily Task"}
            </Link>
            <div className="ui-panel-soft px-4 py-3 font-mono text-[11px] uppercase tracking-[0.04em] text-muted">
              <p>{session.user.email}</p>
              <p className="mt-1 normal-case tracking-normal text-[13px] font-sans">
                {locale === "vi" ? "Thay đổi gần đây ở bên phải. Việc đến hạn ở phía trước." : "Recent changes on the right. Due work in front."}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label={locale === "vi" ? "Đã lên lịch hôm nay" : "Planned today"}
          value={dailyToday.length.toString()}
          detail={locale === "vi" ? "Việc bạn đã lên lịch cho hôm nay." : "Items you planned for today."}
        />
        <SummaryCard
          label={locale === "vi" ? "Quá hạn" : "Overdue"}
          value={todayView.summary.overdue.toString()}
          detail={locale === "vi" ? "Công việc đã trễ hạn." : "Tasks that already slipped."}
        />
        <SummaryCard
          label={locale === "vi" ? "Hạn hôm nay" : "Due today"}
          value={todayView.summary.dueToday.toString()}
          detail={locale === "vi" ? "Công việc nên hoàn tất hôm nay." : "Tasks that should close today."}
        />
        <SummaryCard
          label={locale === "vi" ? "7 ngày tới" : "Next 7 days"}
          value={todayView.summary.upcoming.toString()}
          detail={locale === "vi" ? "Công việc sắp tới đáng để theo dõi." : "Upcoming tasks worth keeping visible."}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-6">
          <UnifiedTodaySection items={mergedToday} locale={locale} />
          <TaskSection
            title={locale === "vi" ? "7 ngày tới" : "Next 7 days"}
            description={locale === "vi" ? "Các việc ngắn hạn để tuần này không bị bất ngờ." : "Short-horizon work so the week does not surprise you."}
            items={todayView.upcoming}
            emptyCopy={locale === "vi" ? "Không có việc đến hạn trong bảy ngày tới." : "Nothing is due in the next seven days."}
            locale={locale}
          />
          <TaskSection
            title={locale === "vi" ? "Đang làm nhưng chưa có hạn" : "Doing without due date"}
            description={locale === "vi" ? "Các việc đang hoạt động nhưng chưa có mốc hoàn tất." : "Active tasks with no finish line yet."}
            items={todayView.activeWithoutDate}
            emptyCopy={locale === "vi" ? "Mọi việc đang làm đều đã có hạn." : "Everything in progress already has a due date."}
            locale={locale}
          />
        </div>

        <ActivityFeed
          title={locale === "vi" ? "Hoạt động gần đây" : "Recent activity"}
          description={locale === "vi" ? "Dòng thời gian nhỏ của các thay đổi mới nhất trong dự án đang mở." : "Small timeline of the latest changes across open projects."}
          items={todayView.recentActivity}
          showProjectName
          className="h-fit"
        />
      </div>
    </div>
  );
}
