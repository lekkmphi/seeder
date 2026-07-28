"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  ArrowCounterClockwise,
  CircleNotch,
  Crown,
  MagnifyingGlass,
  PencilSimple,
  Plus,
  Prohibit,
  ShieldCheck,
  Trash,
  UploadSimple,
  User as UserIcon,
  X,
} from "@phosphor-icons/react";

import { Avatar } from "@/components/ui/avatar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/lib/toast";
import { uploadImage } from "@/lib/upload";
import { useLocale } from "@/lib/use-locale";
import { cn } from "@/lib/utils";
import type { WorkspaceUser } from "@/lib/data-admin";
import { userRoleValues, type UserRole } from "@/lib/db/schema";

const roleStyles: Record<UserRole, string> = {
  owner: "border-accent/30 bg-accent-soft text-accent",
  admin: "border-emerald/30 bg-emerald/10 text-emerald",
  member: "border-border bg-surface text-muted",
};
const roleIcon: Record<UserRole, typeof Crown> = {
  owner: Crown,
  admin: ShieldCheck,
  member: UserIcon,
};

function formatRelative(date: Date | null, locale: "vi" | "en") {
  if (!date) return locale === "vi" ? "Chưa từng" : "Never";
  const diff = Date.now() - date.getTime();
  const day = 86_400_000;
  if (diff < day) return locale === "vi" ? "Hôm nay" : "Today";
  if (diff < 2 * day) return locale === "vi" ? "Hôm qua" : "Yesterday";
  if (diff < 30 * day) {
    const days = Math.floor(diff / day);
    return locale === "vi" ? `${days} ngày trước` : `${days}d ago`;
  }
  return date.toLocaleDateString();
}

function roleLabel(role: UserRole, locale: "vi" | "en") {
  const labels = {
    owner: locale === "vi" ? "chủ sở hữu" : "owner",
    admin: locale === "vi" ? "quản trị" : "admin",
    member: locale === "vi" ? "thành viên" : "member",
  };
  return labels[role];
}

type EditState = "new" | WorkspaceUser | null;

export function UsersManager({
  users,
  viewerId,
  viewerRole,
}: {
  users: WorkspaceUser[];
  viewerId: string;
  viewerRole: UserRole;
}) {
  const locale = useLocale();
  const router = useRouter();
  const [editing, setEditing] = useState<EditState>(null);
  const [deactivating, setDeactivating] = useState<WorkspaceUser | null>(null);
  const [deleting, setDeleting] = useState<WorkspaceUser | null>(null);
  const [query, setQuery] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const canManageAdmins = viewerRole === "owner";

  async function setActive(target: WorkspaceUser, active: boolean) {
    setPendingId(target.id);
    try {
      const response = await fetch(`/api/admin/users/${target.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disabled: !active }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || (locale === "vi" ? "Cập nhật thất bại" : "Update failed"));
      toast(
        active
          ? locale === "vi" ? "Đã kích hoạt lại người dùng" : "User reactivated"
          : locale === "vi" ? "Đã vô hiệu hóa người dùng" : "User deactivated",
        "success",
      );
      startTransition(() => router.refresh());
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : locale === "vi" ? "Cập nhật thất bại" : "Update failed",
        "danger",
      );
    } finally {
      setPendingId(null);
      setDeactivating(null);
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [u.name, u.email, u.role]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [users, query]);

  async function deleteUser(target: WorkspaceUser) {
    setPendingId(target.id);
    try {
      const response = await fetch(`/api/admin/users/${target.id}`, {
        method: "DELETE",
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || (locale === "vi" ? "Xóa thất bại" : "Delete failed"));
      toast(locale === "vi" ? "Đã xóa người dùng" : "User deleted", "success");
      startTransition(() => router.refresh());
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : locale === "vi" ? "Xóa thất bại" : "Delete failed",
        "danger",
      );
    } finally {
      setPendingId(null);
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="ui-panel ui-header p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.04em] text-muted">
              {locale === "vi" ? "Quản trị · Thành viên" : "Admin · Members"}
            </p>
            <h1 className="mt-2 text-[24px] font-medium tracking-[-0.022em] text-foreground">
              {locale === "vi" ? "Người dùng" : "Users"}
            </h1>
            <p className="mt-1 max-w-prose text-[13px] leading-6 text-muted">
              {locale === "vi"
                ? "Tất cả tài khoản trong hệ thống. Tạo thành viên, sửa hồ sơ và vai trò, tải ảnh đại diện và vô hiệu hóa quyền truy cập."
                : "Everyone with an account. Create members, edit profiles and roles, upload avatars, and deactivate access."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="ui-button-primary shrink-0"
          >
            <Plus className="size-4" />
            {locale === "vi" ? "Người dùng mới" : "New user"}
          </button>
        </div>
      </section>

      {users.length > 0 ? (
        <div className="space-y-3">
          <div className="relative">
            <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={locale === "vi" ? "Tìm theo tên, email hoặc vai trò..." : "Search by name, email, or role..."}
              aria-label={locale === "vi" ? "Tìm người dùng" : "Search users"}
              className="w-full rounded-md border border-border bg-background py-2.5 pl-9 pr-3 text-[13px] text-foreground outline-none transition placeholder:text-muted focus:border-accent"
            />
          </div>
          <span className="block px-1 font-mono text-[11px] uppercase tracking-[0.04em] text-muted">
            {query.trim()
              ? locale === "vi"
                ? `${filtered.length} / ${users.length} người dùng`
                : `${filtered.length} of ${users.length} users`
              : locale === "vi"
                ? `${users.length} người dùng`
                : `${users.length} users`}
          </span>
        </div>
      ) : null}

      <div className="ui-panel-soft divide-y divide-border">
        {users.length === 0 ? (
          <div className="px-5 py-10 text-center text-[13px] leading-7 text-muted">
            {locale === "vi" ? "Chưa có thành viên." : "No members yet."}
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-10 text-center text-[13px] leading-7 text-muted">
            {locale === "vi"
              ? `Không có người dùng khớp “${query.trim()}”.`
              : `No users match “${query.trim()}”.`}
          </div>
        ) : (
          filtered.map((user) => {
            const Icon = roleIcon[user.role];
            const disabled = Boolean(user.disabledAt);
            const isSelf = user.id === viewerId;
            const busy = pendingId === user.id;
            return (
              <div
                key={user.id}
                className={cn(
                  "flex flex-wrap items-center gap-3 px-4 py-3",
                  disabled && "opacity-60",
                )}
              >
                <Avatar
                  name={user.name}
                  email={user.email}
                  image={user.image}
                  px={36}
                  className="size-9 text-[12px]"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-[13px] font-medium text-foreground">
                      {user.name}
                    </p>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.04em]",
                        roleStyles[user.role],
                      )}
                    >
                      <Icon className="size-3" />
                      {roleLabel(user.role, locale)}
                    </span>
                    {disabled ? (
                      <span className="inline-flex items-center rounded-sm border border-danger/30 bg-danger/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.04em] text-danger">
                        {locale === "vi" ? "Đã tắt" : "Disabled"}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 truncate font-mono text-[11px] text-muted">
                    {user.email}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4 text-left font-mono sm:gap-6 sm:text-right">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.04em] text-muted">
                      {locale === "vi" ? "Sở hữu" : "Owned"}
                    </p>
                    <p className="text-[13px] font-medium text-foreground">{user.projectsOwned}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.04em] text-muted">
                      {locale === "vi" ? "Tham gia" : "Member"}
                    </p>
                    <p className="text-[13px] font-medium text-foreground">{user.projectsMember}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.04em] text-muted">
                      {locale === "vi" ? "Hoạt động" : "Active"}
                    </p>
                    <p className="text-[13px] font-medium text-foreground">
                      {formatRelative(user.lastActiveAt, locale)}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEditing(user)}
                    aria-label={`Edit ${user.name}`}
                    title={locale === "vi" ? "Sửa" : "Edit"}
                    className="inline-flex size-8 items-center justify-center rounded-md border border-border bg-surface text-muted transition hover:border-border-strong hover:bg-surface-strong hover:text-foreground"
                  >
                    <PencilSimple className="size-4" />
                  </button>
                  {disabled ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setActive(user, true)}
                        disabled={busy}
                        aria-label={`Reactivate ${user.name}`}
                        title={locale === "vi" ? "Kích hoạt lại" : "Reactivate"}
                        className="inline-flex size-8 items-center justify-center rounded-md border border-border bg-surface text-muted transition hover:border-border-strong hover:bg-surface-strong hover:text-foreground disabled:opacity-60"
                      >
                        {busy ? (
                          <CircleNotch className="size-4 animate-spin" />
                        ) : (
                          <ArrowCounterClockwise className="size-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(user)}
                        disabled={busy || isSelf}
                        aria-label={`Delete ${user.name}`}
                        title={
                          isSelf
                            ? locale === "vi" ? "Bạn không thể tự xóa mình" : "You can't delete yourself"
                            : locale === "vi" ? "Xóa vĩnh viễn" : "Delete permanently"
                        }
                        className="inline-flex size-8 items-center justify-center rounded-md border border-border bg-surface text-muted transition hover:border-danger/40 hover:bg-danger/10 hover:text-danger disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Trash className="size-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDeactivating(user)}
                      disabled={busy || isSelf}
                      aria-label={`Deactivate ${user.name}`}
                      title={
                        isSelf
                          ? locale === "vi" ? "Bạn không thể tự vô hiệu hóa mình" : "You can't deactivate yourself"
                          : locale === "vi" ? "Vô hiệu hóa" : "Deactivate"
                      }
                      className="inline-flex size-8 items-center justify-center rounded-md border border-border bg-surface text-muted transition hover:border-danger/40 hover:bg-danger/10 hover:text-danger disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Prohibit className="size-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {editing !== null ? (
        <UserFormModal
          user={editing === "new" ? null : editing}
          canManageAdmins={canManageAdmins}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            startTransition(() => router.refresh());
          }}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deactivating)}
        title={
          locale === "vi"
            ? `Vô hiệu hóa ${deactivating?.name ?? "người dùng"}?`
            : `Deactivate ${deactivating?.name ?? "user"}?`
        }
        description={
          locale === "vi"
            ? "Họ sẽ bị đăng xuất và không thể đăng nhập. Dự án và lịch sử vẫn được giữ lại, bạn có thể kích hoạt lại bất cứ lúc nào."
            : "They'll be signed out and blocked from signing in. Their projects and history are kept — you can reactivate them anytime."
        }
        confirmLabel={locale === "vi" ? "Vô hiệu hóa" : "Deactivate"}
        cancelLabel={locale === "vi" ? "Giữ hoạt động" : "Keep active"}
        variant="danger"
        isPending={Boolean(pendingId)}
        onCancel={() => setDeactivating(null)}
        onConfirm={() => deactivating && setActive(deactivating, false)}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title={
          locale === "vi"
            ? `Xóa ${deleting?.name ?? "người dùng"}?`
            : `Delete ${deleting?.name ?? "user"}?`
        }
        description={
          deleting && deleting.projectsOwned > 0
            ? locale === "vi"
              ? `Thao tác này xóa vĩnh viễn tài khoản và ${deleting.projectsOwned} dự án họ sở hữu, gồm mọi công việc, bình luận và lịch sử. Không thể hoàn tác.`
              : `This permanently deletes the account and all ${deleting.projectsOwned} project${deleting.projectsOwned === 1 ? "" : "s"} they own — every task, comment, and bit of history in them. This can't be undone.`
            : locale === "vi"
              ? "Thao tác này xóa vĩnh viễn tài khoản và mọi dữ liệu liên quan. Không thể hoàn tác."
              : "This permanently deletes the account and everything tied to it. This can't be undone."
        }
        confirmLabel={locale === "vi" ? "Xóa vĩnh viễn" : "Delete permanently"}
        cancelLabel={locale === "vi" ? "Giữ người dùng" : "Keep user"}
        variant="danger"
        isPending={Boolean(pendingId)}
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && deleteUser(deleting)}
      />
    </div>
  );
}

function UserFormModal({
  user,
  canManageAdmins,
  onClose,
  onSaved,
}: {
  user: WorkspaceUser | null;
  canManageAdmins: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const locale = useLocale();
  const isEdit = Boolean(user);
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [role, setRole] = useState<UserRole>(user?.role ?? "member");
  const [password, setPassword] = useState("");
  const [image, setImage] = useState<string | null>(user?.image ?? null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // An admin (non-owner) can only assign/keep the member role.
  const roleLocked = !canManageAdmins && (role !== "member" || (user?.role ?? "member") !== "member");
  const roleOptions: UserRole[] = canManageAdmins
    ? [...userRoleValues]
    : ["member"];

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const url = await uploadImage(file);
      setImage(url);
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : locale === "vi" ? "Tải lên thất bại" : "Upload failed",
        "danger",
      );
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (saving || uploading) return;
    setSaving(true);
    try {
      const url = isEdit ? `/api/admin/users/${user!.id}` : "/api/admin/users";
      const body: Record<string, unknown> = { name, email, role, image: image ?? "" };
      if (!isEdit) body.password = password;
      else if (password.trim()) body.password = password;

      const response = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || (locale === "vi" ? "Lưu thất bại" : "Save failed"));
      toast(
        isEdit
          ? locale === "vi" ? "Đã cập nhật người dùng" : "User updated"
          : locale === "vi" ? "Đã tạo người dùng" : "User created",
        "success",
      );
      onSaved();
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : locale === "vi" ? "Lưu thất bại" : "Save failed",
        "danger",
      );
    } finally {
      setSaving(false);
    }
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[55] p-4 sm:p-6">
      <button
        type="button"
        aria-label={locale === "vi" ? "Đóng" : "Close"}
        onClick={onClose}
        className="ui-modal-backdrop absolute inset-0 bg-[rgba(10,10,10,0.44)] backdrop-blur-xs"
      />
      <div className="relative flex min-h-full items-end justify-center sm:items-center">
        <div className="ui-modal-panel relative max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-md border border-border bg-surface-strong p-5 shadow-xl sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] font-medium uppercase tracking-[0.04em] text-muted">
                {locale === "vi" ? "Quản trị · Thành viên" : "Admin · Members"}
              </p>
              <h3 className="mt-2 text-[1.2rem] font-medium tracking-[-0.022em] text-foreground">
                {isEdit
                  ? locale === "vi" ? "Sửa người dùng" : "Edit user"
                  : locale === "vi" ? "Người dùng mới" : "New user"}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex size-9 items-center justify-center rounded-md border border-border bg-surface text-muted transition hover:border-border-strong hover:bg-surface-strong hover:text-foreground"
            >
              <X className="size-4" />
              <span className="sr-only">{locale === "vi" ? "Đóng" : "Close"}</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4">
            {/* Avatar */}
            <div className="flex items-center gap-3">
              <Avatar name={name} email={email} image={image} px={56} className="size-14 text-[15px]" />
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleFile(file);
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="ui-button-secondary px-3 disabled:opacity-60"
                >
                  {uploading ? (
                    <CircleNotch className="size-4 animate-spin" />
                  ) : (
                    <UploadSimple className="size-4" />
                  )}
                  {uploading
                    ? locale === "vi" ? "Đang tải lên..." : "Uploading…"
                    : locale === "vi" ? "Tải ảnh lên" : "Upload photo"}
                </button>
                {image ? (
                  <button
                    type="button"
                    onClick={() => setImage(null)}
                    className="ui-button-ghost px-2 text-[12px]"
                  >
                    {locale === "vi" ? "Gỡ" : "Remove"}
                  </button>
                ) : null}
              </div>
            </div>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-foreground">
                {locale === "vi" ? "Tên" : "Name"}
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={80}
                className="ui-input"
                placeholder="Ada Lovelace"
                autoFocus
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-foreground">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="ui-input"
                placeholder="ada@example.com"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-foreground">
                {locale === "vi" ? "Vai trò" : "Role"}
              </span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                disabled={roleLocked}
                className="ui-select disabled:cursor-not-allowed disabled:opacity-60"
              >
                {(roleLocked ? [role] : roleOptions).map((r) => (
                  <option key={r} value={r}>
                    {roleLabel(r, locale)}
                  </option>
                ))}
              </select>
              {roleLocked ? (
                <span className="text-[12px] text-muted">
                  {locale === "vi"
                    ? "Chỉ chủ sở hữu mới có thể đổi vai trò quản trị hoặc chủ sở hữu."
                    : "Only an owner can change admin or owner roles."}
                </span>
              ) : null}
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-foreground">
                {isEdit
                  ? locale === "vi" ? "Đặt lại mật khẩu" : "Reset password"
                  : locale === "vi" ? "Mật khẩu ban đầu" : "Initial password"}
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={!isEdit}
                minLength={8}
                className="ui-input"
                placeholder={
                  isEdit
                    ? locale === "vi" ? "Để trống để giữ nguyên" : "Leave blank to keep current"
                    : locale === "vi" ? "Ít nhất 8 ký tự" : "At least 8 characters"
                }
                autoComplete="new-password"
              />
            </label>

            <button
              type="submit"
              disabled={saving || uploading}
              className="ui-button-primary mt-2 w-full px-4 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <CircleNotch className="size-4 animate-spin" /> : null}
              {saving
                ? locale === "vi" ? "Đang lưu..." : "Saving…"
                : isEdit
                  ? locale === "vi" ? "Lưu thay đổi" : "Save changes"
                  : locale === "vi" ? "Tạo người dùng" : "Create user"}
            </button>
          </form>
        </div>
      </div>
    </div>,
    document.body,
  );
}
