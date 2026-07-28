import Link from "next/link";
import { ShieldCheck } from "@phosphor-icons/react/dist/ssr";

import type { DashboardData } from "@/lib/data";
import { t, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function PressureTable({
  data,
  locale = "en",
}: {
  data: DashboardData["pressureLeaderboard"];
  locale?: Locale;
}) {
  if (data.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border bg-surface px-5 py-10 text-center">
        <div className="mx-auto inline-flex size-10 items-center justify-center rounded-md border border-border bg-background text-muted">
          <ShieldCheck className="size-5" />
        </div>
        <p className="mt-3 text-[13px] font-medium text-foreground">{t(locale, "allClear")}</p>
        <p className="mx-auto mt-1 max-w-sm text-[13px] leading-6 text-muted">
          {t(locale, "allClearDetail")}
        </p>
      </div>
    );
  }

  const metrics = (project: (typeof data)[number]) => [
    { label: t(locale, "open"), value: project.openTasks, strong: false },
    { label: t(locale, "inbox"), value: project.requestCounts.inbox, strong: false },
    { label: t(locale, "overdue"), value: project.taskCounts.overdue, strong: false },
    { label: t(locale, "score"), value: project.pressureScore, strong: true },
  ];

  return (
    <>
      {/* Mobile: stacked cards so the 5 columns don't squash below ~85px. */}
      <div className="space-y-2 sm:hidden">
        {data.map((project) => (
          <div
            key={project.id}
            className="rounded-md border border-border bg-surface p-3"
          >
            <Link
              href={`/projects/${project.id}`}
              className="text-[13px] font-medium text-foreground hover:underline"
            >
              {project.name}
            </Link>
            <div className="mt-2 grid grid-cols-4 gap-2 text-center">
              {metrics(project).map((metric) => (
                <div key={metric.label}>
                  <p className="font-mono text-[10px] uppercase tracking-[0.04em] text-muted">
                    {metric.label}
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 font-mono text-[13px] text-foreground",
                      metric.strong && "font-medium",
                    )}
                  >
                    {metric.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: table. */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-border text-left font-mono text-[11px] uppercase tracking-[0.04em] text-muted">
              <th className="py-2 pr-3 font-medium">{t(locale, "project")}</th>
              <th className="py-2 pr-3 font-medium">{t(locale, "open")}</th>
              <th className="py-2 pr-3 font-medium">{t(locale, "inbox")}</th>
              <th className="py-2 pr-3 font-medium">{t(locale, "overdue")}</th>
              <th className="py-2 pr-3 font-medium">{t(locale, "score")}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((project) => (
              <tr key={project.id} className="border-b border-border last:border-0">
                <td className="py-2 pr-3">
                  <Link
                    href={`/projects/${project.id}`}
                    className="text-foreground hover:underline"
                  >
                    {project.name}
                  </Link>
                </td>
                <td className="py-2 pr-3 font-mono text-foreground">{project.openTasks}</td>
                <td className="py-2 pr-3 font-mono text-foreground">{project.requestCounts.inbox}</td>
                <td className="py-2 pr-3 font-mono text-foreground">{project.taskCounts.overdue}</td>
                <td className="py-2 pr-3 font-mono font-medium text-foreground">{project.pressureScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
