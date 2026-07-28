"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { CaretDown, MagnifyingGlass, X } from "@phosphor-icons/react";

import { t } from "@/lib/i18n";
import { useLocale } from "@/lib/use-locale";
import { cn } from "@/lib/utils";

export type SearchSelectOption = {
  value: string;
  label: string;
  sublabel?: string;
};

type Props = {
  options: SearchSelectOption[];
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  clearLabel?: string;
  disabled?: boolean;
  className?: string;
};

export function SearchSelect({
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  clearLabel,
  disabled,
  className,
}: Props) {
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listboxId = useId();

  const selected = useMemo(
    () => options.find((o) => o.value === value),
    [options, value],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => {
      const hay = `${o.label} ${o.sublabel ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [options, query]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const target = e.target as Node;
      if (
        !rootRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const updateMenuPosition = useCallback(() => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMenuStyle({
      left: rect.left,
      top: rect.bottom + 4,
      width: rect.width,
      maxHeight: Math.max(160, window.innerHeight - rect.bottom - 16),
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

  // Focus search when opened; reset active to selected item (or first match).
  useEffect(() => {
    if (open) {
      setQuery("");
      const initialIndex = Math.max(
        0,
        options.findIndex((o) => o.value === value),
      );
      setActiveIndex(initialIndex);
      // Defer to let panel mount.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open, options, value]);

  // Keep activeIndex in range as the filter changes.
  useEffect(() => {
    if (activeIndex >= filtered.length) {
      setActiveIndex(filtered.length === 0 ? -1 : 0);
    }
  }, [filtered.length, activeIndex]);

  const commit = useCallback(
    (next: string | undefined) => {
      onChange(next);
      setOpen(false);
    },
    [onChange],
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) =>
        filtered.length === 0 ? -1 : (i + 1) % filtered.length,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) =>
        filtered.length === 0
          ? -1
          : (i - 1 + filtered.length) % filtered.length,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < filtered.length) {
        commit(filtered[activeIndex].value);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className={cn("relative", open && "z-[90]", className)}>
      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 text-left text-[13px] transition focus:outline-none focus:ring-2 focus:ring-ring",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <span
          className={cn(
            "min-w-0 flex-1 truncate",
            selected ? "text-foreground" : "text-muted",
          )}
        >
          {selected?.label ??
            placeholder ??
            (locale === "vi" ? "Chọn..." : "Select...")}
        </span>
        {value ? (
          <span
            role="button"
            aria-label={locale === "vi" ? "Xóa lựa chọn" : "Clear selection"}
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              commit(undefined);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                commit(undefined);
              }
            }}
            className="inline-flex size-5 cursor-pointer items-center justify-center rounded-sm text-muted hover:bg-surface hover:text-foreground"
          >
            <X className="size-3.5" />
          </span>
        ) : null}
        <CaretDown className="size-3.5 shrink-0 text-muted" />
      </button>

      {open && menuStyle && typeof document !== "undefined" ? createPortal(
        <div
          ref={menuRef}
          className="ui-menu-surface fixed z-[1000] overflow-hidden rounded-md"
          role="listbox"
          id={listboxId}
          style={menuStyle}
        >
          <div className="flex items-center gap-2 border-b border-border bg-menu-surface-strong px-3 py-2">
            <MagnifyingGlass className="size-4 text-muted" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={searchPlaceholder ?? `${t(locale, "search")}...`}
              className="min-w-0 flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted"
            />
          </div>

          <ul className="overflow-y-auto py-1" style={{ maxHeight: "inherit" }}>
            {clearLabel ? (
              <li>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => commit(undefined)}
                  className={cn(
                    "flex w-full items-center justify-between px-3 py-1.5 text-left text-[13px] transition",
                    !value
                      ? "bg-accent-soft text-foreground"
                      : "text-muted hover:bg-menu-hover hover:text-foreground",
                  )}
                >
                  <span>{clearLabel}</span>
                </button>
              </li>
            ) : null}

            {filtered.length === 0 ? (
              <li className="px-3 py-3 text-center text-[12px] leading-5 text-muted">
                {locale === "vi" ? "Không có kết quả." : "No matches."}
              </li>
            ) : (
              filtered.map((option, index) => {
                const isActive = index === activeIndex;
                const isSelected = option.value === value;
                return (
                  <li key={option.value}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => commit(option.value)}
                      onMouseEnter={() => setActiveIndex(index)}
                      aria-selected={isSelected}
                      className={cn(
                        "flex w-full flex-col items-start gap-0.5 px-3 py-1.5 text-left text-[13px] transition",
                        isSelected
                          ? "bg-accent-soft text-foreground"
                          : isActive
                            ? "bg-menu-hover text-foreground"
                            : "text-foreground hover:bg-menu-hover",
                      )}
                    >
                      <span className="truncate font-medium">{option.label}</span>
                      {option.sublabel ? (
                        <span className="truncate font-mono text-[11px] text-muted">
                          {option.sublabel}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>,
        document.body,
      ) : null}
    </div>
  );
}
