"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { type Locale } from "@/lib/i18n";
import { useLocale } from "@/lib/use-locale";

const CHORD_TIMEOUT_MS = 1000;
const PROJECT_PATH_PATTERN = /^\/projects\/([^/]+)/;

function shouldIgnoreEvent(event: KeyboardEvent): boolean {
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return true;
  }

  const target = event.target as HTMLElement | null;
  if (!target) return false;

  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
    return true;
  }

  if (target.isContentEditable) {
    return true;
  }

  return false;
}

function getProjectIdFromPath(pathname: string | null): string | null {
  if (!pathname) return null;
  const match = pathname.match(PROJECT_PATH_PATTERN);
  return match ? match[1] : null;
}

export function KeyboardShortcuts() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showCheatsheet, setShowCheatsheet] = useState(false);
  const chordRef = useRef<{ key: string | null; timer: number | null }>({
    key: null,
    timer: null,
  });

  const clearChord = useCallback(() => {
    if (chordRef.current.timer !== null) {
      window.clearTimeout(chordRef.current.timer);
    }
    chordRef.current = { key: null, timer: null };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && showCheatsheet) {
        setShowCheatsheet(false);
        return;
      }

      if (shouldIgnoreEvent(event)) {
        return;
      }

      // Resolve an active chord (g + ?)
      if (chordRef.current.key === "g") {
        const next = event.key.toLowerCase();
        if (next === "d" || next === "t" || next === "p" || next === "k") {
          event.preventDefault();
          clearChord();
          if (next === "d") router.push("/dashboard");
          else if (next === "t") router.push("/today");
          else if (next === "p") router.push("/projects");
          else if (next === "k") {
            const projectId = getProjectIdFromPath(pathname);
            if (projectId) router.push(`/projects/${projectId}/board`);
          }
          return;
        }
        // Chord didn't match — clear and let key fall through
        clearChord();
      }

      // Start a new chord
      if (event.key === "g") {
        event.preventDefault();
        if (chordRef.current.timer !== null) {
          window.clearTimeout(chordRef.current.timer);
        }
        chordRef.current = {
          key: "g",
          timer: window.setTimeout(clearChord, CHORD_TIMEOUT_MS),
        };
        return;
      }

      // Single-key shortcuts
      if (event.key === "n") {
        const projectId = getProjectIdFromPath(pathname);
        if (projectId) {
          event.preventDefault();
          const next = new URLSearchParams(searchParams.toString());
          next.set("modal", "new-task");
          router.push(`${pathname}?${next.toString()}`);
        }
        return;
      }

      if (event.key === "?") {
        event.preventDefault();
        setShowCheatsheet(true);
        return;
      }
    }

    // The sidebar "Shortcuts" button opens this same cheatsheet via a custom event.
    function handleOpenRequest() {
      setShowCheatsheet(true);
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("seeder:open-shortcuts", handleOpenRequest);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("seeder:open-shortcuts", handleOpenRequest);
      clearChord();
    };
  }, [router, pathname, searchParams, showCheatsheet, clearChord]);

  if (!showCheatsheet) return null;

  return (
    <CheatsheetModal
      locale={locale}
      onClose={() => setShowCheatsheet(false)}
    />
  );
}

function CheatsheetModal({
  locale,
  onClose,
}: {
  locale: Locale;
  onClose: () => void;
}) {
  return (
    <div
      className="ui-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="ui-panel w-full max-w-md p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-baseline justify-between">
          <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.04em] text-muted">
            {locale === "vi" ? "Phím tắt bàn phím" : "Keyboard shortcuts"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-[11px] uppercase tracking-[0.04em] text-muted transition hover:text-foreground"
          >
            {locale === "vi" ? "Đóng" : "Close"}
          </button>
        </div>
        <dl className="mt-4 grid gap-3">
          <ShortcutRow
            keys={["n"]}
            description={
              locale === "vi"
                ? "Tạo công việc mới (trong dự án hiện tại)"
                : "New task (in current project)"
            }
          />
          <ShortcutRow
            keys={["g", "d"]}
            description={locale === "vi" ? "Đến Bảng điều khiển" : "Go to Dashboard"}
          />
          <ShortcutRow
            keys={["g", "t"]}
            description={locale === "vi" ? "Đến Hôm nay" : "Go to Today"}
          />
          <ShortcutRow
            keys={["g", "p"]}
            description={locale === "vi" ? "Đến Dự án" : "Go to Projects"}
          />
          <ShortcutRow
            keys={["g", "k"]}
            description={
              locale === "vi"
                ? "Đến bảng của dự án hiện tại"
                : "Go to current project's Board"
            }
          />
          <ShortcutRow
            keys={["?"]}
            description={locale === "vi" ? "Hiện bảng phím tắt" : "Show this cheatsheet"}
          />
          <ShortcutRow
            keys={["Esc"]}
            description={locale === "vi" ? "Đóng bảng phím tắt" : "Close this cheatsheet"}
          />
        </dl>
        <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.04em] text-muted">
          {locale === "vi"
            ? "Tắt khi đang nhập liệu · Tổ hợp phím hết hạn sau 1 giây"
            : "Disabled while typing in inputs · Chords time out after 1s"}
        </p>
      </div>
    </div>
  );
}

function ShortcutRow({
  keys,
  description,
}: {
  keys: string[];
  description: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-sm text-foreground">{description}</dt>
      <dd className="flex items-center gap-1">
        {keys.map((key, i) => (
          <kbd
            key={`${key}-${i}`}
            className="inline-flex min-w-[24px] items-center justify-center rounded-sm border border-border bg-surface-strong px-1.5 py-0.5 font-mono text-[11px] font-medium text-foreground"
          >
            {key}
          </kbd>
        ))}
      </dd>
    </div>
  );
}
