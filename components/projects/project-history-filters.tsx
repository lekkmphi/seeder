"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MagnifyingGlass, X } from "@phosphor-icons/react";

import { SearchSelect, type SearchSelectOption } from "@/components/ui/search-select";
import { activityActionValues } from "@/lib/db/schema";
import type { ProjectActivityActor } from "@/lib/data";
import { useLocale } from "@/lib/use-locale";

type Initial = {
  q: string;
  from: string;
  to: string;
  actorId: string;
  action: string;
  field: string;
};

export function ProjectHistoryFilters({
  basePath,
  actors,
  initial,
}: {
  basePath: string;
  actors: ProjectActivityActor[];
  initial: Initial;
}) {
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(initial.q);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [actorId, setActorId] = useState<string | undefined>(
    initial.actorId || undefined,
  );
  const [action, setAction] = useState<string | undefined>(
    initial.action || undefined,
  );
  const [field, setField] = useState<string | undefined>(
    initial.field || undefined,
  );

  const actorOptions = useMemo<SearchSelectOption[]>(
    () =>
      actors.map((actor) => ({
        value: actor.id,
        label: actor.name,
        sublabel: actor.email,
      })),
    [actors],
  );
  const actionOptions = useMemo<SearchSelectOption[]>(
    () =>
      activityActionValues.map((action) => ({
        value: action,
        label: action.charAt(0).toUpperCase() + action.slice(1),
      })),
    [],
  );
  const fieldOptions = useMemo<SearchSelectOption[]>(
    () => [
      { value: "title", label: locale === "vi" ? "Tiêu đề" : "Title" },
      { value: "description", label: locale === "vi" ? "Mô tả" : "Description" },
      { value: "status", label: locale === "vi" ? "Trạng thái" : "Status" },
      { value: "priority", label: locale === "vi" ? "Ưu tiên" : "Priority" },
      { value: "dueDate", label: locale === "vi" ? "Hạn chót" : "Due date" },
      { value: "category", label: locale === "vi" ? "Danh mục" : "Category" },
      { value: "phase", label: locale === "vi" ? "Giai đoạn" : "Phase" },
      { value: "name", label: locale === "vi" ? "Tên" : "Name" },
      { value: "clientName", label: locale === "vi" ? "Khách hàng" : "Client" },
      { value: "summary", label: locale === "vi" ? "Tóm tắt" : "Summary" },
      { value: "deadline", label: locale === "vi" ? "Hạn chót" : "Deadline" },
      { value: "content", label: locale === "vi" ? "Ghi chú" : "Notes" },
      { value: "state", label: locale === "vi" ? "Trạng thái việc con" : "Subtask state" },
      { value: "comment", label: locale === "vi" ? "Bình luận" : "Comment" },
    ],
    [locale],
  );

  const hasActive =
    Boolean(q) ||
    Boolean(from) ||
    Boolean(to) ||
    Boolean(actorId) ||
    Boolean(action) ||
    Boolean(field);

  // Debounce search-text changes — push them to the URL after a brief pause
  // so each keystroke doesn't bang against the server.
  useEffect(() => {
    if (q === initial.q) return;
    const handle = window.setTimeout(() => {
      pushParams({ q });
    }, 320);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function pushParams(patch: Partial<Initial>) {
    const next = new URLSearchParams(searchParams.toString());
    const apply = (key: string, value: string | undefined) => {
      if (value && value.length) next.set(key, value);
      else next.delete(key);
    };
    apply("q", patch.q ?? q);
    apply("from", patch.from ?? from);
    apply("to", patch.to ?? to);
    apply("actor", patch.actorId ?? actorId);
    apply("action", patch.action ?? action);
    apply("field", patch.field ?? field);
    router.push(`${basePath}?${next.toString()}`, { scroll: false });
  }

  function clearAll() {
    setQ("");
    setFrom("");
    setTo("");
    setActorId(undefined);
    setAction(undefined);
    setField(undefined);
    router.push(basePath, { scroll: false });
  }

  return (
    <div className="ui-panel-soft grid gap-3 p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_1fr]">
        <label className="grid gap-1.5">
          <span className="font-mono text-[11px] uppercase tracking-[0.04em] text-muted">
            {locale === "vi" ? "Tìm kiếm" : "Search"}
          </span>
          <div className="relative">
            <MagnifyingGlass className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={locale === "vi" ? "Nhãn hoặc chi tiết..." : "Label or detail..."}
              className="ui-input"
              style={{ paddingLeft: 32 }}
            />
          </div>
        </label>

        <div className="grid gap-1.5">
          <span className="font-mono text-[11px] uppercase tracking-[0.04em] text-muted">
            {locale === "vi" ? "Hành động" : "Action"}
          </span>
          <SearchSelect
            options={actionOptions}
            value={action}
            onChange={(next) => {
              setAction(next);
              pushParams({ action: next ?? "" });
            }}
            placeholder={locale === "vi" ? "Tất cả hành động" : "All actions"}
            searchPlaceholder={locale === "vi" ? "Lọc hành động..." : "Filter actions..."}
            clearLabel={locale === "vi" ? "Tất cả hành động" : "All actions"}
          />
        </div>

        <div className="grid gap-1.5">
          <span className="font-mono text-[11px] uppercase tracking-[0.04em] text-muted">
            {locale === "vi" ? "Trường đã đổi" : "Field changed"}
          </span>
          <SearchSelect
            options={fieldOptions}
            value={field}
            onChange={(next) => {
              setField(next);
              pushParams({ field: next ?? "" });
            }}
            placeholder={locale === "vi" ? "Trường bất kỳ" : "Any field"}
            searchPlaceholder={locale === "vi" ? "Lọc trường..." : "Filter fields..."}
            clearLabel={locale === "vi" ? "Trường bất kỳ" : "Any field"}
          />
        </div>

        <div className="grid gap-1.5">
          <span className="font-mono text-[11px] uppercase tracking-[0.04em] text-muted">
            {locale === "vi" ? "Người thao tác" : "Actor"}
          </span>
          <SearchSelect
            options={actorOptions}
            value={actorId}
            onChange={(next) => {
              setActorId(next);
              pushParams({ actorId: next ?? "" });
            }}
            placeholder={locale === "vi" ? "Mọi người" : "Everyone"}
            searchPlaceholder={locale === "vi" ? "Tìm theo tên hoặc email..." : "Search by name or email..."}
            clearLabel={locale === "vi" ? "Mọi người" : "Everyone"}
          />
        </div>

        <label className="grid gap-1.5">
          <span className="font-mono text-[11px] uppercase tracking-[0.04em] text-muted">
            {locale === "vi" ? "Từ" : "From"}
          </span>
          <input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              pushParams({ from: e.target.value });
            }}
            className="ui-input"
          />
        </label>

        <label className="grid gap-1.5">
          <span className="font-mono text-[11px] uppercase tracking-[0.04em] text-muted">
            {locale === "vi" ? "Đến" : "To"}
          </span>
          <input
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              pushParams({ to: e.target.value });
            }}
            className="ui-input"
          />
        </label>
      </div>

      {hasActive ? (
        <button
          type="button"
          onClick={clearAll}
          className="ui-button-ghost self-start px-3"
        >
          <X className="size-4" />
          {locale === "vi" ? "Xóa bộ lọc" : "Clear filters"}
        </button>
      ) : null}
    </div>
  );
}
