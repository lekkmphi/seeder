"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import {
  CaretDown,
  Check,
  CircleNotch,
  MagnifyingGlass,
  Plus,
  X,
} from "@phosphor-icons/react";

import { createTaskLabelAction } from "@/lib/actions";
import { PROJECT_SWATCHES } from "@/lib/swatches";
import { toast } from "@/lib/toast";
import { useLocale } from "@/lib/use-locale";
import { cn } from "@/lib/utils";

export type LabelOption = {
  id: string;
  name: string;
  color: string;
};

// Multi-select label picker for the task create/edit forms. It writes the chosen
// set into a hidden `name` field as a comma-separated id list; the workspace
// route reads that alongside the task payload and persists it via setTaskLabels.
// A task can carry many labels, and new labels can be created inline.
export function LabelSelect({
  name,
  projectId,
  labels,
  defaultValues,
}: {
  name: string;
  projectId: string;
  labels: LabelOption[];
  defaultValues: string[];
}) {
  const locale = useLocale();
  const [localLabels, setLocalLabels] = useState(labels);
  const [selected, setSelected] = useState<string[]>(defaultValues);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [newColor, setNewColor] = useState(PROJECT_SWATCHES[0].value);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);
  const [isPending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return localLabels;
    return localLabels.filter((label) => label.name.toLowerCase().includes(q));
  }, [localLabels, query]);

  const selectedLabels = localLabels.filter((label) =>
    selected.includes(label.id),
  );

  const trimmedQuery = query.trim();
  const exactMatch = localLabels.some(
    (label) => label.name.toLowerCase() === trimmedQuery.toLowerCase(),
  );
  const canCreate = trimmedQuery.length > 0 && !exactMatch;

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  }

  function submitCreate() {
    if (!trimmedQuery) return;
    const formData = new FormData();
    formData.set("projectId", projectId);
    formData.set("name", trimmedQuery);
    formData.set("color", newColor);
    startTransition(async () => {
      try {
        const result = await createTaskLabelAction(formData);
        const created: LabelOption = {
          id: result.id,
          name: result.name,
          color: result.color,
        };
        setLocalLabels((current) =>
          [...current, created].sort((a, b) => a.name.localeCompare(b.name)),
        );
        setSelected((current) => [...current, created.id]);
        toast(
          locale === "vi"
            ? `Đã tạo nhãn "${created.name}"`
            : `Created label "${created.name}"`,
          "success",
        );
        setQuery("");
        setIsCreating(false);
      } catch (error: unknown) {
        toast(
          error instanceof Error
            ? error.message
            : locale === "vi" ? "Không thể tạo nhãn" : "Could not create label",
          "danger",
        );
      }
    });
  }

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setIsCreating(false);
  }, []);

  const updateMenuPosition = useCallback(() => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMenuStyle({
      left: rect.left,
      top: rect.bottom + 4,
      width: rect.width,
      maxHeight: Math.max(180, window.innerHeight - rect.bottom - 16),
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open, updateMenuPosition]);

  useEffect(() => {
    if (!open) return;
    function onDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        !rootRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        close();
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [close, open]);

  return (
    <div ref={rootRef} className={cn("relative", open && "z-[90]")}>
      <input type="hidden" name={name} value={selected.join(",")} />

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="ui-input flex w-full items-center justify-between gap-2"
      >
        {selectedLabels.length > 0 ? (
          <span className="flex flex-wrap items-center gap-1">
            {selectedLabels.map((label) => (
              <span
                key={label.id}
                className="inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[11px] font-medium text-foreground"
                style={{ backgroundColor: `${label.color}26` }}
              >
                <span
                  aria-hidden
                  className="inline-block size-2 rounded-full"
                  style={{ backgroundColor: label.color }}
                />
                {label.name}
              </span>
            ))}
          </span>
        ) : (
          <span className="text-muted">
            {locale === "vi" ? "Chưa có nhãn" : "No labels"}
          </span>
        )}
        <CaretDown className="size-4 text-muted" />
      </button>

      {open && menuStyle && typeof document !== "undefined" ? createPortal(
        <div
          ref={menuRef}
          className="ui-menu-surface fixed z-[1000] grid gap-2 overflow-y-auto rounded-md p-2"
          style={menuStyle}
        >
          {!isCreating ? (
            <>
              <div className="relative">
                <MagnifyingGlass className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
                <input
                  autoFocus
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  // This box lives inside the task form, so Enter would
                  // otherwise implicitly submit the task instead of acting on
                  // the dropdown. Always swallow it: toggle the top match (the
                  // picker is multi-select, so it stays open for the next one),
                  // or fall through to creating what was typed.
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return;
                    event.preventDefault();
                    const top = filtered[0];
                    if (top) {
                      toggle(top.id);
                      setQuery("");
                    } else if (canCreate) {
                      setIsCreating(true);
                    }
                  }}
                  placeholder={
                    locale === "vi"
                      ? "Tìm hoặc nhập để tạo..."
                      : "Search or type to create..."
                  }
                  className="ui-input"
                  style={{ paddingLeft: 32 }}
                />
              </div>

              <ul className="max-h-56 overflow-y-auto">
                {filtered.map((label) => {
                  const isOn = selected.includes(label.id);
                  return (
                    <li key={label.id}>
                      <button
                        type="button"
                        onClick={() => toggle(label.id)}
                        className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-[13px] text-foreground hover:bg-menu-hover"
                      >
                        <span className="inline-flex items-center gap-2">
                          <span
                            aria-hidden
                            className="inline-block size-2.5 rounded-full"
                            style={{ backgroundColor: label.color }}
                          />
                          {label.name}
                        </span>
                        {isOn ? <Check className="size-4 text-accent" /> : null}
                      </button>
                    </li>
                  );
                })}
                {filtered.length === 0 && !canCreate ? (
                  <li className="px-2 py-2 text-[12px] text-muted">
                    {locale === "vi"
                      ? "Chưa có nhãn. Nhập tên để tạo mới."
                      : "No labels. Type a name to create one."}
                  </li>
                ) : null}
              </ul>

              {canCreate ? (
                <button
                  type="button"
                  onClick={() => setIsCreating(true)}
                  className="ui-button-secondary justify-start text-left"
                >
                  <Plus className="size-4" />
                  {locale === "vi" ? "Tạo" : "Create"} &quot;{trimmedQuery}&quot;
                </button>
              ) : null}
            </>
          ) : (
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase tracking-[0.04em] text-muted">
                  {locale === "vi" ? "Nhãn mới" : "New label"}
                </span>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="inline-flex size-6 items-center justify-center rounded-sm text-muted hover:bg-surface hover:text-foreground"
                  aria-label={locale === "vi" ? "Quay lại" : "Back"}
                >
                  <X className="size-3.5" />
                </button>
              </div>
              <div className="rounded-sm border border-border bg-background px-2.5 py-1.5 text-[13px] text-foreground">
                {trimmedQuery}
              </div>
              <div className="flex flex-wrap gap-1">
                {PROJECT_SWATCHES.map((swatch) => {
                  const isSelected =
                    swatch.value.toLowerCase() === newColor.toLowerCase();
                  return (
                    <button
                      key={swatch.value}
                      type="button"
                      onClick={() => setNewColor(swatch.value)}
                      aria-label={swatch.label}
                      aria-pressed={isSelected}
                      className={cn(
                        "size-6 rounded-md border transition",
                        isSelected
                          ? "border-foreground"
                          : "border-border hover:border-border-strong",
                      )}
                      style={{ backgroundColor: swatch.value }}
                    />
                  );
                })}
              </div>
              {/* Focused on entry so Enter confirms the create. It can't be a
                  nested <form>/submit — this dropdown renders inside the task
                  form, and Enter there would save the task instead. */}
              <button
                autoFocus
                type="button"
                onClick={submitCreate}
                disabled={isPending}
                className="ui-button-primary"
              >
                {isPending ? (
                  <CircleNotch className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                {isPending
                  ? locale === "vi" ? "Đang tạo..." : "Creating..."
                  : locale === "vi" ? "Tạo nhãn" : "Create label"}
              </button>
            </div>
          )}
        </div>,
        document.body,
      ) : null}
    </div>
  );
}
