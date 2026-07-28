"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  ArrowCounterClockwise,
  DownloadSimple,
  Funnel,
} from "@phosphor-icons/react";

import { SearchSelect } from "@/components/ui/search-select";
import { useLocale } from "@/lib/use-locale";

type Props = {
  projects: { id: string; name: string }[];
  users: { id: string; name: string; email: string }[];
  initial: {
    from: string;
    to: string;
    projectId: string;
    actorId: string;
  };
};

function buildSearch(state: Props["initial"]) {
  const params = new URLSearchParams();
  if (state.from) params.set("from", state.from);
  if (state.to) params.set("to", state.to);
  if (state.projectId) params.set("project", state.projectId);
  if (state.actorId) params.set("actor", state.actorId);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function ActivityFilters({ projects, users, initial }: Props) {
  const router = useRouter();
  const locale = useLocale();
  const [state, setState] = useState(initial);
  const [isPending, startTransition] = useTransition();

  const apply = () => {
    startTransition(() => {
      router.push(`/admin/activity${buildSearch(state)}`);
    });
  };

  const clear = () => {
    setState({ from: "", to: "", projectId: "", actorId: "" });
    startTransition(() => {
      router.push("/admin/activity");
    });
  };

  const exportCsv = () => {
    window.location.href = `/api/admin/activity/export${buildSearch(state)}`;
  };

  const update = <K extends keyof Props["initial"]>(
    key: K,
    value: Props["initial"][K],
  ) => {
    setState((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="ui-panel-soft p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[11px] uppercase tracking-[0.04em] text-muted">
            {locale === "vi" ? "Từ" : "From"}
          </span>
          <input
            type="date"
            value={state.from}
            onChange={(e) => update("from", e.target.value)}
            className="ui-input"
            max={state.to || undefined}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[11px] uppercase tracking-[0.04em] text-muted">
            {locale === "vi" ? "Đến" : "To"}
          </span>
          <input
            type="date"
            value={state.to}
            onChange={(e) => update("to", e.target.value)}
            className="ui-input"
            min={state.from || undefined}
          />
        </label>
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[11px] uppercase tracking-[0.04em] text-muted">
            {locale === "vi" ? "Dự án" : "Project"}
          </span>
          <SearchSelect
            options={projects.map((p) => ({ value: p.id, label: p.name }))}
            value={state.projectId || undefined}
            onChange={(v) => update("projectId", v ?? "")}
            placeholder={locale === "vi" ? "Tất cả dự án" : "All projects"}
            searchPlaceholder={locale === "vi" ? "Tìm dự án..." : "Search projects..."}
            clearLabel={locale === "vi" ? "Tất cả dự án" : "All projects"}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[11px] uppercase tracking-[0.04em] text-muted">
            {locale === "vi" ? "Người dùng" : "User"}
          </span>
          <SearchSelect
            options={users.map((u) => ({
              value: u.id,
              label: u.name,
              sublabel: u.email,
            }))}
            value={state.actorId || undefined}
            onChange={(v) => update("actorId", v ?? "")}
            placeholder={locale === "vi" ? "Tất cả người dùng" : "All users"}
            searchPlaceholder={locale === "vi" ? "Tìm người dùng..." : "Search users..."}
            clearLabel={locale === "vi" ? "Tất cả người dùng" : "All users"}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={apply}
          disabled={isPending}
          className="ui-button-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Funnel className="size-4" />
          {locale === "vi" ? "Áp dụng" : "Apply"}
        </button>
        <button
          type="button"
          onClick={clear}
          disabled={isPending}
          className="ui-button-secondary disabled:cursor-not-allowed disabled:opacity-60"
        >
          <ArrowCounterClockwise className="size-4" />
          {locale === "vi" ? "Xóa lọc" : "Clear"}
        </button>
        <span className="flex-1" />
        <button
          type="button"
          onClick={exportCsv}
          className="ui-button-secondary"
          title={
            locale === "vi"
              ? "Tải CSV theo bộ lọc hiện tại"
              : "Download CSV of the current filter"
          }
        >
          <DownloadSimple className="size-4" />
          {locale === "vi" ? "Xuất CSV" : "Export CSV"}
        </button>
      </div>
    </div>
  );
}
