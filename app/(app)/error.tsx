"use client";

import Link from "next/link";

import { useLocale } from "@/lib/use-locale";

export default function AppError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  const locale = useLocale();
  const vi = locale === "vi";
  return (
    <div className="flex min-h-[60dvh] items-center justify-center">
      <div className="ui-panel max-w-xl p-8 text-center">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.04em] text-muted">
          {vi ? "Đã xảy ra lỗi" : "Something broke"}
        </p>
        <h1 className="mt-2 text-[28px] font-medium tracking-tighter text-foreground">
          {vi
            ? "Không gian làm việc không thể hoàn tất khung nhìn này."
            : "The workspace could not finish this view."}
        </h1>
        <p className="mt-2 text-[13px] leading-7 text-muted">
          {error.message ||
            (vi
              ? "Đã xảy ra lỗi ứng dụng ngoài dự kiến."
              : "An unexpected application error occurred.")}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="ui-button-primary"
          >
            {vi ? "Thử lại" : "Try again"}
          </button>
          <Link href="/projects" className="ui-button-secondary">
            {vi ? "Quay lại danh sách dự án" : "Back to projects"}
          </Link>
        </div>
      </div>
    </div>
  );
}
