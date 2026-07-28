"use client";

import { useState, useTransition } from "react";
import { CircleNotch, Pencil, Trash } from "@phosphor-icons/react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  deleteTaskCategoryAction,
  updateTaskCategoryAction,
} from "@/lib/actions";
import { PROJECT_SWATCHES } from "@/lib/swatches";
import { toast } from "@/lib/toast";
import { t } from "@/lib/i18n";
import { useLocale } from "@/lib/use-locale";
import { cn } from "@/lib/utils";

export type ManagedCategory = {
  id: string;
  name: string;
  color: string;
  taskCount: number;
};

export function CategoryManager({
  categories,
}: {
  categories: ManagedCategory[];
}) {
  const locale = useLocale();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (categories.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border bg-surface px-5 py-8 text-center text-[13px] leading-7 text-muted">
        {locale === "vi"
          ? "Chưa có danh mục. Tạo danh mục từ bộ chọn danh mục khi thêm công việc."
          : "No categories yet. Create one from the Category picker when adding a task."}
      </div>
    );
  }

  const target = categories.find((c) => c.id === confirmDeleteId);

  return (
    <>
      <ul className="grid gap-2">
        {categories.map((category) =>
          editingId === category.id ? (
            <li key={category.id}>
              <CategoryEditForm
                category={category}
                onDone={() => setEditingId(null)}
                onCancel={() => setEditingId(null)}
              />
            </li>
          ) : (
            <li
              key={category.id}
              className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden
                  className="inline-block size-3 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <span className="truncate text-[13px] font-medium text-foreground">
                  {category.name}
                </span>
                <span className="ui-badge">
                  {locale === "vi"
                    ? `${category.taskCount} công việc`
                    : `${category.taskCount} task${category.taskCount === 1 ? "" : "s"}`}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setEditingId(category.id)}
                  className="inline-flex size-7 items-center justify-center rounded-sm text-muted transition hover:bg-background hover:text-foreground"
                  title={locale === "vi" ? "Sửa danh mục" : "Edit category"}
                >
                  <Pencil className="size-3.5" />
                  <span className="sr-only">
                    {locale === "vi" ? "Sửa danh mục" : "Edit category"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(category.id)}
                  className="inline-flex size-7 items-center justify-center rounded-sm text-muted transition hover:bg-danger/10 hover:text-danger"
                  title={locale === "vi" ? "Xóa danh mục" : "Delete category"}
                >
                  <Trash className="size-3.5" />
                  <span className="sr-only">
                    {locale === "vi" ? "Xóa danh mục" : "Delete category"}
                  </span>
                </button>
              </div>
            </li>
          ),
        )}
      </ul>

      {target ? (
        <DeleteCategoryDialog
          category={target}
          onClose={() => setConfirmDeleteId(null)}
        />
      ) : null}
    </>
  );
}

function CategoryEditForm({
  category,
  onDone,
  onCancel,
}: {
  category: ManagedCategory;
  onDone: () => void;
  onCancel: () => void;
}) {
  const locale = useLocale();
  const [name, setName] = useState(category.name);
  const [color, setColor] = useState(category.color);
  const [isPending, startTransition] = useTransition();

  const saveCategory = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const formData = new FormData();
    formData.set("categoryId", category.id);
    formData.set("name", trimmed);
    formData.set("color", color);
    startTransition(async () => {
      try {
        await updateTaskCategoryAction(formData);
        toast(locale === "vi" ? "Đã cập nhật danh mục" : "Category updated", "success");
        onDone();
      } catch (error: unknown) {
        toast(
          error instanceof Error
            ? error.message
            : locale === "vi" ? "Không thể cập nhật danh mục" : "Could not update category",
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
        saveCategory();
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

function DeleteCategoryDialog({
  category,
  onClose,
}: {
  category: ManagedCategory;
  onClose: () => void;
}) {
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();
  const isLinked = category.taskCount > 0;

  if (isLinked) {
    return (
      <ConfirmDialog
        open
        title={locale === "vi" ? "Danh mục vẫn đang được dùng" : "Category still in use"}
        description={
          <>
            <span className="font-medium text-foreground">{category.name}</span>{" "}
            {locale === "vi" ? " đang được gắn với " : " is attached to "}
            <span className="font-medium text-foreground">
              {category.taskCount}
            </span>{" "}
            {locale === "vi"
              ? " công việc. Hãy gán lại hoặc gỡ các công việc đó trước, rồi xóa danh mục."
              : ` task${category.taskCount === 1 ? "" : "s"}. Reassign or remove those first, then delete the category.`}
          </>
        }
        confirmLabel={locale === "vi" ? "Đã hiểu" : "Got it"}
        cancelLabel={t(locale, "close")}
        variant="primary"
        onCancel={onClose}
        onConfirm={onClose}
      />
    );
  }

  return (
    <ConfirmDialog
      open
      title={locale === "vi" ? "Xóa danh mục?" : "Delete category?"}
      description={
        <>
          {locale === "vi" ? "Xóa vĩnh viễn " : "Permanently remove "}
          <span className="font-medium text-foreground">{category.name}</span>{" "}
          {locale === "vi"
            ? " khỏi dự án này. Thao tác này không thể hoàn tác."
            : " from this project. This cannot be undone."}
        </>
      }
      confirmLabel={locale === "vi" ? "Xóa" : "Delete"}
      variant="danger"
      isPending={isPending}
      onCancel={onClose}
      onConfirm={() => {
        const formData = new FormData();
        formData.set("categoryId", category.id);
        startTransition(async () => {
          try {
            await deleteTaskCategoryAction(formData);
            toast(locale === "vi" ? "Đã xóa danh mục" : "Category deleted", "success");
            onClose();
          } catch (error: unknown) {
            toast(
              error instanceof Error
                ? error.message
                : locale === "vi" ? "Không thể xóa danh mục" : "Could not delete category",
              "danger",
            );
          }
        });
      }}
    />
  );
}
