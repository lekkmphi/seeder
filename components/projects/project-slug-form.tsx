"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { CircleNotch } from "@phosphor-icons/react";

import { setProjectSlugAction } from "@/lib/actions";
import {
  isValidSlug,
  normalizeSlugInput,
  SLUG_MAX_LENGTH,
  SLUG_MIN_LENGTH,
} from "@/lib/codes";
import { useLocale } from "@/lib/use-locale";

function SubmitButton({ disabled, vi }: { disabled: boolean; vi: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="ui-button-primary px-4 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? <CircleNotch className="size-4 animate-spin" /> : null}
      {pending ? (vi ? "Đang lưu…" : "Saving…") : vi ? "Lưu mã" : "Save key"}
    </button>
  );
}

export function ProjectSlugForm({
  projectId,
  currentSlug,
  returnTo,
}: {
  projectId: string;
  currentSlug: string | null;
  returnTo: string;
}) {
  const locale = useLocale();
  const vi = locale === "vi";
  const [value, setValue] = useState(currentSlug ?? "");

  const normalized = normalizeSlugInput(value);
  const isValid = isValidSlug(normalized);
  const isDirty = normalized !== (currentSlug ?? "");
  const showWarning = isDirty && Boolean(currentSlug);

  return (
    <form action={setProjectSlugAction} className="grid gap-3">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="returnTo" value={returnTo} />

      <div className="flex flex-wrap items-end gap-3">
        <label className="grid min-w-0 flex-1 gap-1.5">
          <span className="text-[13px] font-medium text-foreground">
            {vi ? "Mã dự án" : "Project key"}
          </span>
          <input
            name="slug"
            value={value}
            onChange={(event) => setValue(event.target.value.toUpperCase())}
            placeholder="LFMS"
            maxLength={SLUG_MAX_LENGTH}
            className="ui-input font-mono uppercase tracking-[0.06em]"
            autoComplete="off"
            spellCheck={false}
          />
          <span className="font-mono text-[11px] uppercase tracking-[0.04em] text-muted">
            {vi
              ? `${SLUG_MIN_LENGTH}-${SLUG_MAX_LENGTH} ký tự · chỉ chữ in hoa & số`
              : `${SLUG_MIN_LENGTH}-${SLUG_MAX_LENGTH} chars · uppercase letters & numbers only`}
          </span>
        </label>
        <SubmitButton disabled={!isValid || !isDirty} vi={vi} />
      </div>

      {showWarning ? (
        <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-[13px] leading-6 text-muted">
          {vi ? (
            <>
              Đổi mã sẽ thay đổi mã của mọi việc và yêu cầu trong toàn ứng dụng
              (ví dụ,{" "}
              <span className="font-mono font-semibold text-foreground">
                {currentSlug}-1
              </span>{" "}
              trở thành{" "}
              <span className="font-mono font-semibold text-foreground">
                {normalized || "…"}-1
              </span>
              ). Mọi liên kết hay ghi chú bên ngoài tham chiếu mã cũ sẽ không còn
              khớp.
            </>
          ) : (
            <>
              Renaming the key changes every task and request code across the app
              (e.g.,{" "}
              <span className="font-mono font-semibold text-foreground">
                {currentSlug}-1
              </span>{" "}
              becomes{" "}
              <span className="font-mono font-semibold text-foreground">
                {normalized || "…"}-1
              </span>
              ). Any external links or notes referencing the old key will no
              longer match.
            </>
          )}
        </div>
      ) : null}
    </form>
  );
}
