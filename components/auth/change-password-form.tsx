"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CheckCircle, CircleNotch, LockKey } from "@phosphor-icons/react";

import { authClient } from "@/lib/auth-client";
import { useLocale } from "@/lib/use-locale";

type ChangePasswordFormProps = {
  closeHref?: string;
  onClose?: () => void;
};

const fieldClassName =
  "ui-input";

export function ChangePasswordForm({
  closeHref,
  onClose,
}: ChangePasswordFormProps) {
  const locale = useLocale();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [revokeOtherSessions, setRevokeOtherSessions] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (newPassword !== confirmPassword) {
      setErrorMessage(locale === "vi" ? "Mật khẩu mới và xác nhận không khớp." : "New password and confirmation do not match.");
      return;
    }

    startTransition(async () => {
      const result = await authClient.changePassword(
        {
          currentPassword,
          newPassword,
          revokeOtherSessions,
        },
        {
          onSuccess: () => {
            setSuccessMessage(locale === "vi" ? "Đã cập nhật mật khẩu." : "Password updated.");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");

            window.setTimeout(() => {
              if (onClose) {
                onClose();
              } else if (closeHref) {
                router.push(closeHref, { scroll: false });
              }
              router.refresh();
            }, 700);
          },
        },
      );

      if (result.error) {
        setErrorMessage(result.error.message ?? (locale === "vi" ? "Không thể đổi mật khẩu." : "Unable to change password."));
      }
    });
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        handleSubmit();
      }}
      className="grid gap-4"
    >
      <label className="grid gap-2">
        <span className="text-sm font-medium text-foreground">
          {locale === "vi" ? "Mật khẩu hiện tại" : "Current password"}
        </span>
        <input
          type="password"
          required
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          className={fieldClassName}
          placeholder={locale === "vi" ? "Nhập mật khẩu hiện tại" : "Enter your current password"}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-foreground">
            {locale === "vi" ? "Mật khẩu mới" : "New password"}
          </span>
          <input
            type="password"
            required
            minLength={8}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className={fieldClassName}
            placeholder={locale === "vi" ? "Ít nhất 8 ký tự" : "At least 8 characters"}
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-foreground">
            {locale === "vi" ? "Xác nhận mật khẩu" : "Confirm password"}
          </span>
          <input
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className={fieldClassName}
            placeholder={locale === "vi" ? "Nhập lại mật khẩu mới" : "Repeat the new password"}
          />
        </label>
      </div>

      <label className="flex items-start gap-3 rounded-md border border-border bg-surface px-4 py-3">
        <input
          type="checkbox"
          checked={revokeOtherSessions}
          onChange={(event) => setRevokeOtherSessions(event.target.checked)}
          className="mt-1 h-4 w-4 rounded border-border text-accent focus:ring-accent"
        />
        <div>
          <p className="text-sm font-medium text-foreground">
            {locale === "vi" ? "Thu hồi phiên khác" : "Revoke other sessions"}
          </p>
          <p className="mt-1 text-sm leading-6 text-muted">
            {locale === "vi"
              ? "Khuyến nghị sau khi đặt lại. Phiên hiện tại của bạn vẫn hoạt động."
              : "Recommended after a reset. Your current session will stay active."}
          </p>
        </div>
      </label>

      {errorMessage ? (
        <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-3 text-sm text-foreground">
          <CheckCircle className="size-5 text-accent" />
          {successMessage}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="ui-button-primary mt-2 w-full disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? <CircleNotch className="size-4 animate-spin" /> : <LockKey className="size-4" />}
        {locale === "vi" ? "Cập nhật mật khẩu" : "Update password"}
      </button>
    </form>
  );
}
