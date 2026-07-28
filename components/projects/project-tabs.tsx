"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ChatCircleText,
  ClockCounterClockwise,
  Kanban,
  NotePencil,
  SlidersHorizontal,
  SquaresFour,
  UsersThree,
} from "@phosphor-icons/react";

import { t, type Locale } from "@/lib/i18n";
import { useLocale } from "@/lib/use-locale";
import { cn, withSearchParams } from "@/lib/utils";

type ProjectTabsProps = {
  projectId: string;
};

const tabs = [
  { key: "overview", icon: SquaresFour, suffix: "" },
  { key: "requests", icon: ChatCircleText, suffix: "/requests" },
  { key: "board", icon: Kanban, suffix: "/board" },
  { key: "notes", icon: NotePencil, suffix: "/notes" },
  { key: "history", icon: ClockCounterClockwise, suffix: "/history" },
  { key: "members", icon: UsersThree, suffix: "/settings/members" },
  { key: "settings", icon: SlidersHorizontal, suffix: "/settings" },
] as const;

function tabLabel(key: (typeof tabs)[number]["key"], locale: Locale) {
  switch (key) {
    case "overview":
      return locale === "vi" ? "Tổng quan" : "Overview";
    case "requests":
      return locale === "vi" ? "Yêu cầu" : "Requests";
    case "board":
      return locale === "vi" ? "Bảng việc" : "Board";
    case "notes":
      return locale === "vi" ? "Ghi chú" : "Notes";
    case "history":
      return locale === "vi" ? "Lịch sử" : "History";
    case "members":
      return locale === "vi" ? "Thành viên" : "Members";
    case "settings":
      return t(locale, "settings");
  }
}

export function ProjectTabs({ projectId }: ProjectTabsProps) {
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Preserve the selected branch when moving between tabs so the workspace
  // stays on one branch. Active state matches the path only (ignores the query).
  const branch = searchParams.get("branch");

  return (
    <nav className="-mx-1 flex min-w-0 gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden">
      {tabs.map((tab) => {
        const href = `/projects/${projectId}${tab.suffix}`;
        const isActive = pathname === href;
        const linkHref = branch ? withSearchParams(href, { branch }) : href;
        const Icon = tab.icon;

        return (
          <Link
            key={tab.key}
            href={linkHref}
            className={cn(
              "inline-flex min-h-9 shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-[13px] font-medium transition",
              isActive
                ? "border-border-strong bg-surface-strong text-foreground"
                : "border-border bg-surface text-muted hover:border-border-strong hover:bg-surface-strong hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {tabLabel(tab.key, locale)}
          </Link>
        );
      })}
    </nav>
  );
}
