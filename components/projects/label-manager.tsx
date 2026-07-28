"use client";

import { useState, useTransition } from "react";
import { CircleNotch, Pencil, Plus, Trash } from "@phosphor-icons/react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  createTaskLabelAction,
  deleteTaskLabelAction,
  updateTaskLabelAction,
} from "@/lib/actions";
import { PROJECT_SWATCHES } from "@/lib/swatches";
import { toast } from "@/lib/toast";
import { t } from "@/lib/i18n";
import { useLocale } from "@/lib/use-locale";
import { cn } from "@/lib/utils";

export type ManagedLabel = {
  id: string;
  name: string;
  color: string;
  taskCount: number;
};

export function LabelManager({
  projectId,
  labels,
}: {
  projectId: string;
  labels: ManagedLabel[];
}) {
  const locale = useLocale();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const target = labels.find((l) => l.id === confirmDeleteId);

  return (
    <div className="space-y-3">
      <LabelCreateForm projectId={projectId} />

      {labels.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-surface px-5 py-6 text-center text-[13px] leading-7 text-muted">
          {locale === "vi"
            ? "Chưa có nhãn. Tạo nhãn ở trên, rồi gắn vào công việc từ modal công việc."
            : "No labels yet. Create one above, then tag tasks from the task modal."}
        </div>
      ) : (
        <ul className="grid gap-2">
          {labels.map((label) =>
            editingId === label.id ? (
              <li key={label.id}>
                <LabelEditForm
                  label={label}
                  onDone={() => setEditingId(null)}
                  onCancel={() => setEditingId(null)}
                />
              </li>
            ) : (
              <li
                key={label.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden
                    className="inline-block size-3 rounded-full"
                    style={{ backgroundColor: label.color }}
                  />
                  <span className="truncate text-[13px] font-medium text-foreground">
                    {label.name}
                  </span>
                  <span className="ui-badge">
                    {locale === "vi"
                      ? `${label.taskCount} công việc`
                      : `${label.taskCount} task${label.taskCount === 1 ? "" : "s"}`}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setEditingId(label.id)}
                    className="inline-flex size-7 items-center justify-center rounded-sm text-muted transition hover:bg-background hover:text-foreground"
                    title={locale === "vi" ? "Sửa nhãn" : "Edit label"}
                  >
                    <Pencil className="size-3.5" />
                    <span className="sr-only">
                      {locale === "vi" ? "Sửa nhãn" : "Edit label"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(label.id)}
                    className="inline-flex size-7 items-center justify-center rounded-sm text-muted transition hover:bg-danger/10 hover:text-danger"
                    title={locale === "vi" ? "Xóa nhãn" : "Delete label"}
                  >
                    <Trash className="size-3.5" />
                    <span className="sr-only">
                      {locale === "vi" ? "Xóa nhãn" : "Delete label"}
                    </span>
                  </button>
                </div>
              </li>
            ),
          )}
        </ul>
      )}

      {target ? (
        <DeleteLabelDialog label={target} onClose={() => setConfirmDeleteId(null)} />
      ) : null}
    </div>
  );
}

function LabelCreateForm({ projectId }: { projectId: string }) {
  const locale = useLocale();
  const [name, setName] = useState("");
  const [color, setColor] = useState(PROJECT_SWATCHES[0].value);
  const [isPending, startTransition] = useTransition();

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const formData = new FormData();
    formData.set("projectId", projectId);
    formData.set("name", trimmed);
    formData.set("color", color);
    startTransition(async () => {
      try {
        await createTaskLabelAction(formData);
        toast(
          locale === "vi" ? `Đã tạo nhãn "${trimmed}"` : `Created label "${trimmed}"`,
          "success",
        );
        setName("");
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

  return (
    <div className="grid gap-4 rounded-md border border-border bg-surface p-4">
      <div className="flex items-center gap-2">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submit();
            }
          }}
          className="ui-input"
          maxLength={40}
          placeholder={locale === "vi" ? "Tên nhãn mới..." : "New label name..."}
        />
        <button
          type="button"
          onClick={submit}
          disabled={isPending || !name.trim()}
          className="ui-button-primary shrink-0 px-3"
        >
          {isPending ? (
            <CircleNotch className="size-4 animate-spin" />
          ) : (
            <Plus className="size-4" />
          )}
          {locale === "vi" ? "Thêm" : "Add"}
        </button>
      </div>
      <div className="grid gap-2 border-t border-border pt-4">
        <span className="text-[12px] font-medium text-foreground">
          {locale === "vi" ? "Màu" : "Color"}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {PROJECT_SWATCHES.map((swatch) => {
            const isSelected =
              swatch.value.toLowerCase() === color.toLowerCase();
            return (
              <button
                key={swatch.value}
                type="button"
                onClick={() => setColor(swatch.value)}
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
      </div>
    </div>
  );
}

function LabelEditForm({
  label,
  onDone,
  onCancel,
}: {
  label: ManagedLabel;
  onDone: () => void;
  onCancel: () => void;
}) {
  const locale = useLocale();
  const [name, setName] = useState(label.name);
  const [color, setColor] = useState(label.color);
  const [isPending, startTransition] = useTransition();

  const saveLabel = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const formData = new FormData();
    formData.set("labelId", label.id);
    formData.set("name", trimmed);
    formData.set("color", color);
    startTransition(async () => {
      try {
        await updateTaskLabelAction(formData);
        toast(locale === "vi" ? "Đã cập nhật nhãn" : "Label updated", "success");
        onDone();
      } catch (error: unknown) {
        toast(
          error instanceof Error
            ? error.message
            : locale === "vi" ? "Không thể cập nhật nhãn" : "Could not update label",
          "danger",
        );
      }
    });
  };

  return (
    <form
      className="grid gap-3 rounded-md border border-border bg-surface p-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (isPending) return;
        saveLabel();
      }}
    >
      <label className="grid gap-1.5">
        <span className="text-[12px] font-medium text-foreground">
          {locale === "vi" ? "Tên" : "Name"}
        </span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="ui-input"
          maxLength={40}
        />
      </label>
      <div className="grid gap-1.5">
        <span className="text-[12px] font-medium text-foreground">
          {locale === "vi" ? "Màu" : "Color"}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {PROJECT_SWATCHES.map((swatch) => {
            const isSelected = swatch.value.toLowerCase() === color.toLowerCase();
            return (
              <button
                key={swatch.value}
                type="button"
                onClick={() => setColor(swatch.value)}
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
      </div>
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="ui-button-ghost px-3"
          disabled={isPending}
        >
          {t(locale, "cancel")}
        </button>
        <button
          type="submit"
          className="ui-button-primary px-4"
          disabled={isPending}
        >
          {isPending ? <CircleNotch className="size-4 animate-spin" /> : null}
          {locale === "vi" ? "Lưu" : "Save"}
        </button>
      </div>
    </form>
  );
}

function DeleteLabelDialog({
  label,
  onClose,
}: {
  label: ManagedLabel;
  onClose: () => void;
}) {
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();
  const inUse = label.taskCount > 0;

  return (
    <ConfirmDialog
      open
      title={locale === "vi" ? "Xóa nhãn?" : "Delete label?"}
      description={
        <>
          {locale === "vi" ? "Xóa vĩnh viễn " : "Permanently remove "}
          <span className="font-medium text-foreground">{label.name}</span>
          {inUse ? (
            <>
              {" "}
              {locale === "vi" ? " và gỡ khỏi " : " and untag it from "}
              <span className="font-medium text-foreground">
                {label.taskCount}
              </span>{" "}
              {locale === "vi"
                ? " công việc"
                : ` task${label.taskCount === 1 ? "" : "s"}`}
            </>
          ) : null}
          {locale === "vi" ? ". Thao tác này không thể hoàn tác." : ". This cannot be undone."}
        </>
      }
      confirmLabel={locale === "vi" ? "Xóa" : "Delete"}
      variant="danger"
      isPending={isPending}
      onCancel={onClose}
      onConfirm={() => {
        const formData = new FormData();
        formData.set("labelId", label.id);
        startTransition(async () => {
          try {
            await deleteTaskLabelAction(formData);
            toast(locale === "vi" ? "Đã xóa nhãn" : "Label deleted", "success");
            onClose();
          } catch (error: unknown) {
            toast(
              error instanceof Error
                ? error.message
                : locale === "vi" ? "Không thể xóa nhãn" : "Could not delete label",
              "danger",
            );
          }
        });
      }}
    />
  );
}
