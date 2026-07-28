import Link from "next/link";

import { getRequestLocale } from "@/lib/i18n-server";

export default async function NotFound() {
  const locale = await getRequestLocale();
  const vi = locale === "vi";
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-8">
      <div className="ui-panel max-w-xl p-8 text-center">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.04em] text-muted">
          {vi ? "Không tìm thấy" : "Not Found"}
        </p>
        <h1 className="mt-2 text-[28px] font-medium tracking-tighter text-foreground">
          {vi
            ? "Không gian dự án đó không tồn tại."
            : "That project workspace does not exist."}
        </h1>
        <p className="mt-2 text-[13px] leading-7 text-muted">
          {vi
            ? "Liên kết có thể đã cũ, hoặc dự án không còn thuộc tài khoản chủ sở hữu hiện tại."
            : "The link may be stale, or the project may no longer belong to the current owner account."}
        </p>
        <Link href="/projects" className="ui-button-primary mt-5 inline-flex">
          {vi ? "Quay lại danh sách dự án" : "Return to projects"}
        </Link>
      </div>
    </main>
  );
}
