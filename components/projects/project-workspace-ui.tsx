"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useFormStatus } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowSquareOut,
  Check,
  CircleNotch,
  GitCommit,
  Kanban,
  Plus,
  Trash,
  X,
} from "@phosphor-icons/react";

import {
  convertRequestToTaskAction,
  deleteProjectAction,
  deleteTaskStatusUpdateAction,
  loadRequestModalDetailAction,
  loadTaskModalDetailAction,
  saveTaskStatusUpdateAction,
  updateProjectAction,
} from "@/lib/actions";
import { CategorySelect } from "@/components/projects/category-select";
import { LabelSelect } from "@/components/projects/label-select";
import { CommentThread } from "@/components/projects/comment-thread";
import { RichTextField } from "@/components/rich-text/rich-text-field";
import { RichTextRenderer } from "@/components/rich-text";
import { SearchSelect, type SearchSelectOption } from "@/components/ui/search-select";
import { t, type Locale } from "@/lib/i18n";
import { getProjectStatusOptions } from "@/lib/project-status";
import { toast } from "@/lib/toast";
import { useLocale } from "@/lib/use-locale";
import {
  createRequestCommentAction,
  createTaskCommentAction,
  deleteRequestCommentAction,
  deleteTaskCommentAction,
  updateRequestCommentAction,
  updateTaskCommentAction,
} from "@/lib/actions";
import { formatRequestCode, formatTaskCode } from "@/lib/codes";
import type {
  ProjectWorkspace,
  RequestModalDetail,
  TaskModalDetail,
} from "@/lib/data";
import type { UserRole } from "@/lib/db/schema";
import { CATEGORY_SWATCHES } from "@/lib/swatches";
import { cn, withSearchParams } from "@/lib/utils";

type WorkspaceModalKind =
  | "new-task"
  | "new-checklist-item"
  | "task"
  | "delete-task"
  | "new-request"
  | "request"
  | "delete-project"
  | "project"
  | "status-update";

type WorkspaceModalState =
  | {
      kind: WorkspaceModalKind;
      taskId?: string | null;
      // Whether the task is in a terminal/done status — gates the "publish client
      // update" action (only terminal tasks can be published).
      taskIsTerminal?: boolean | null;
      requestId?: string | null;
    }
  | null;

type ProjectWorkspaceUiContextValue = {
  openModal: (state: NonNullable<WorkspaceModalState>) => void;
  openTask: (taskId: string) => void;
  openRequest: (requestId: string) => void;
  openStatusUpdate: (taskId: string, isTerminal?: boolean | null) => void;
  closeModal: () => void;
};

type WorkspaceChecklistItem = Pick<
  TaskModalDetail["checklistItems"][number],
  "id" | "taskId" | "content" | "isCompleted" | "sortOrder"
>;

const ProjectWorkspaceUiContext =
  createContext<ProjectWorkspaceUiContextValue | null>(null);

const fieldClassName = "ui-input";
const selectClassName = "ui-select";
const textAreaClassName = "ui-textarea";

function formatDateForInput(value: Date | null) {
  if (!value) {
    return "";
  }

  return value.toISOString().slice(0, 10);
}

function normalizeColorValue(value: string | null) {
  return value ?? "#8a8f98";
}

const STATUS_UPDATE_MAX = 5000;
const STATUS_UPDATE_NEAR_LIMIT = 200;

function priorityLabel(value: "low" | "medium" | "high", locale: Locale) {
  const labels = {
    en: { low: "Low", medium: "Medium", high: "High" },
    vi: { low: "Thấp", medium: "Trung bình", high: "Cao" },
  } as const;
  return labels[locale][value];
}

function requestStatusLabel(
  value: "new" | "reviewed" | "converted" | "closed",
  locale: Locale,
) {
  const labels = {
    en: {
      new: "New",
      reviewed: "Reviewed",
      converted: "Converted",
      closed: "Closed",
    },
    vi: {
      new: "Mới",
      reviewed: "Đã xem",
      converted: "Đã chuyển đổi",
      closed: "Đã đóng",
    },
  } as const;
  return labels[locale][value];
}

function StatusUpdateForm({
  projectId,
  taskId,
  returnTo,
  defaultValue,
  isUpdate,
  locale,
}: {
  projectId: string;
  taskId: string;
  returnTo: string;
  defaultValue: string;
  isUpdate: boolean;
  locale: Locale;
}) {
  const [value, setValue] = useState(defaultValue);
  const length = value.length;
  const trimmedLength = value.trim().length;
  const remaining = STATUS_UPDATE_MAX - length;
  const atLimit = length >= STATUS_UPDATE_MAX;
  const overLimit = length > STATUS_UPDATE_MAX; // defensive: only via stale defaultValue
  const isNearLimit = remaining <= STATUS_UPDATE_NEAR_LIMIT && !atLimit;
  const submitDisabled = trimmedLength === 0 || overLimit;

  const counterTone = atLimit
    ? "text-danger"
    : isNearLimit
      ? "text-accent"
      : "text-muted";

  return (
    <form
      action={saveTaskStatusUpdateAction}
      className="grid gap-4"
      // The summary is a multi-line textarea, so Enter is a newline. Cmd/Ctrl+
      // Enter publishes, matching the comment composer.
      onKeyDown={(event) => {
        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          event.currentTarget.requestSubmit();
        }
      }}
    >
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="taskId" value={taskId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <div className="grid gap-1.5">
        <textarea
          name="summary"
          rows={5}
          required
          value={value}
          onChange={(event) => setValue(event.target.value)}
          maxLength={STATUS_UPDATE_MAX}
          className={textAreaClassName}
          placeholder={
            locale === "vi"
              ? "Mô tả thay đổi theo cách rõ ràng cho khách hàng."
              : "Describe what changed in a clean client-facing way."
          }
        />
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            {atLimit ? (
              <p className="font-mono text-[11px] uppercase tracking-[0.04em] text-danger">
                {locale === "vi" ? "Đã đạt giới hạn ký tự" : "Character limit reached"}
              </p>
            ) : isNearLimit ? (
              <p className="font-mono text-[11px] uppercase tracking-[0.04em] text-accent">
                {remaining} {locale === "vi" ? "ký tự còn lại" : "characters left"}
              </p>
            ) : null}
          </div>
          <span
            className={cn(
              "shrink-0 font-mono text-[11px] uppercase tracking-[0.04em]",
              counterTone,
            )}
          >
            {length} / {STATUS_UPDATE_MAX}
          </span>
        </div>
      </div>
      <SubmitButton
        pendingLabel={
          isUpdate
            ? locale === "vi" ? "Đang cập nhật bàn giao..." : "Updating commit..."
            : locale === "vi" ? "Đang đăng bàn giao..." : "Publishing commit..."
        }
        disabled={submitDisabled}
      >
        {isUpdate
          ? locale === "vi" ? "Cập nhật bàn giao" : "Update commit"
          : locale === "vi" ? "Đăng bàn giao" : "Publish commit"}
      </SubmitButton>
    </form>
  );
}

function NewTaskForm({
  workspace,
  isPending,
  errorNotice,
  onSubmit,
  locale,
}: {
  workspace: ProjectWorkspace;
  isPending: boolean;
  errorNotice: React.ReactNode;
  locale: Locale;
  onSubmit: (payload: {
    title: string;
    description: string;
    requestId: string;
    categoryId: string;
    labelIds: string;
    phase: string;
    priority: string;
    dueDate: string;
    assigneeId: string;
  }) => Promise<boolean>;
}) {
  const [title, setTitle] = useState("");
  const [requestId, setRequestId] = useState<string | undefined>(undefined);
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [descriptionDefault, setDescriptionDefault] = useState<string>("");
  const [descriptionKey, setDescriptionKey] = useState(0);

  // Show every non-closed request — user may want to spin off a related
  // follow-up task from a request that was already converted.
  const importableRequests = useMemo(
    () =>
      workspace.requests.filter((request) => request.status !== "closed"),
    [workspace.requests],
  );

  const importOptions: SearchSelectOption[] = importableRequests.map(
    (request) => {
      const code = formatRequestCode(workspace.project.slug, request.codeNumber);
      return {
        value: request.id,
        label: code ? `${code} · ${request.title}` : request.title,
        sublabel: request.status,
      };
    },
  );

  function applyRequestImport(nextId: string | undefined) {
    setRequestId(nextId);
    if (!nextId) return;
    const request = importableRequests.find((r) => r.id === nextId);
    if (!request) return;
    setTitle(request.title);
    setDescriptionDefault(request.description ?? "");
    setDescriptionKey((key) => key + 1);
    setPriority(request.priority);
  }

  return (
    <form
      className="grid gap-5"
      onSubmit={async (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        await onSubmit({
          title: getFormValue(formData, "title"),
          description: getFormValue(formData, "description"),
          requestId: getFormValue(formData, "requestId"),
          categoryId: getFormValue(formData, "categoryId"),
          labelIds: getFormValue(formData, "labelIds"),
          phase: getFormValue(formData, "phase"),
          priority: getFormValue(formData, "priority"),
          dueDate: getFormValue(formData, "dueDate"),
          assigneeId: getFormValue(formData, "assigneeId"),
        });
      }}
    >
      <input type="hidden" name="requestId" value={requestId ?? ""} />

      <label className="grid gap-2">
        <span className="text-sm font-medium text-foreground">
          {locale === "vi" ? "Tiêu đề công việc" : "Task title"}
        </span>
        <input
          name="title"
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className={fieldClassName}
          placeholder={
            locale === "vi"
              ? "Bàn giao phần giá đã chỉnh"
              : "Ship revised pricing section"
          }
        />
      </label>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="grid content-start gap-2">
          <span className="text-sm font-medium text-foreground">
            {locale === "vi" ? "Mô tả" : "Description"}
          </span>
          <RichTextField
            key={descriptionKey}
            name="description"
            defaultValue={descriptionDefault}
            placeholder={
              locale === "vi"
                ? "Thêm bối cảnh, vướng mắc hoặc tiêu chí hoàn tất."
                : "Add task context, blockers, or definition of done."
            }
            ariaLabel={locale === "vi" ? "Mô tả công việc" : "Task description"}
          />
        </div>

        <aside className="grid content-start gap-4 rounded-md border border-border bg-surface p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
            {locale === "vi" ? "Chi tiết" : "Details"}
          </p>

          {importableRequests.length > 0 ? (
            <div className="grid gap-1.5">
              <span className="text-[12px] font-medium text-foreground">
                {locale === "vi" ? "Nhập từ yêu cầu" : "Import from request"}{" "}
                <span className="text-muted">
                  {locale === "vi" ? "(tùy chọn)" : "(optional)"}
                </span>
              </span>
              <SearchSelect
                options={importOptions}
                value={requestId}
                onChange={applyRequestImport}
                placeholder={locale === "vi" ? "Bắt đầu trống" : "Start blank"}
                searchPlaceholder={
                  locale === "vi"
                    ? "Tìm mã hoặc tiêu đề yêu cầu..."
                    : "Search request id or title..."
                }
                clearLabel={locale === "vi" ? "Bắt đầu trống" : "Start blank"}
              />
            </div>
          ) : null}

          <div className="grid gap-1.5">
            <span className="text-[12px] font-medium text-foreground">
              {locale === "vi" ? "Danh mục" : "Category"}
            </span>
            <CategorySelect
              name="categoryId"
              projectId={workspace.project.id}
              categories={workspace.categories}
            />
          </div>

          <div className="grid gap-1.5">
            <span className="text-[12px] font-medium text-foreground">
              {locale === "vi" ? "Nhãn" : "Labels"}
            </span>
            <LabelSelect
              name="labelIds"
              projectId={workspace.project.id}
              labels={workspace.labels}
              defaultValues={[]}
            />
          </div>

          <label className="grid gap-1.5">
            <span className="text-[12px] font-medium text-foreground">
              {locale === "vi" ? "Giai đoạn" : "Phase"}{" "}
              <span className="text-muted">
                {locale === "vi" ? "(tùy chọn)" : "(optional)"}
              </span>
            </span>
            <input
              name="phase"
              className={fieldClassName}
              placeholder="Discovery / Beta"
            />
          </label>

          <label className="grid gap-1.5">
            <span className="text-[12px] font-medium text-foreground">
              {locale === "vi" ? "Ưu tiên" : "Priority"}
            </span>
            <select
              name="priority"
              value={priority}
              onChange={(event) =>
                setPriority(event.target.value as "low" | "medium" | "high")
              }
              className={selectClassName}
            >
              <option value="low">{priorityLabel("low", locale)}</option>
              <option value="medium">{priorityLabel("medium", locale)}</option>
              <option value="high">{priorityLabel("high", locale)}</option>
            </select>
          </label>

          <label className="grid gap-1.5">
            <span className="text-[12px] font-medium text-foreground">
              {locale === "vi" ? "Ngày hạn" : "Due date"}
            </span>
            <input type="date" name="dueDate" className={fieldClassName} />
          </label>

          <div className="grid gap-1.5">
            <span className="text-[12px] font-medium text-foreground">
              {locale === "vi" ? "Người phụ trách" : "Assignee"}
            </span>
            <AssigneeSelect
              name="assigneeId"
              members={workspace.members}
              locale={locale}
            />
          </div>
        </aside>
      </div>

      {errorNotice}

      <ActionButton
        type="submit"
        isPending={isPending}
        pendingLabel={locale === "vi" ? "Đang tạo công việc..." : "Creating task..."}
        className="justify-self-end px-6"
      >
        {locale === "vi" ? "Tạo công việc" : "Create task"}
      </ActionButton>
    </form>
  );
}

function ConvertRequestButton({
  projectId,
  requestId,
  returnTo,
  locale,
}: {
  projectId: string;
  requestId: string;
  returnTo: string;
  locale: Locale;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        const formData = new FormData();
        formData.set("projectId", projectId);
        formData.set("requestId", requestId);
        formData.set("returnTo", returnTo);
        startTransition(async () => {
          await convertRequestToTaskAction(formData);
        });
      }}
      className="ui-button-secondary w-full disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isPending ? (
        <CircleNotch className="size-4 animate-spin" />
      ) : (
        <Kanban className="size-4" />
      )}
      {isPending
        ? locale === "vi" ? "Đang chuyển đổi..." : "Converting..."
        : locale === "vi" ? "Chuyển thành công việc" : "Convert to task"}
    </button>
  );
}

function AssigneeSelect({
  name,
  defaultValue,
  members,
  locale,
}: {
  name: string;
  defaultValue?: string | null;
  members: Array<{ userId: string; name: string; email: string }>;
  locale: Locale;
}) {
  const [value, setValue] = useState<string | undefined>(
    defaultValue || undefined,
  );

  const options: SearchSelectOption[] = members.map((member) => ({
    value: member.userId,
    label: member.name,
    sublabel: member.email,
  }));

  return (
    <>
      <input type="hidden" name={name} value={value ?? ""} />
      <SearchSelect
        options={options}
        value={value}
        onChange={setValue}
        placeholder={locale === "vi" ? "Chưa gán" : "Unassigned"}
        searchPlaceholder={
          locale === "vi"
            ? "Tìm theo tên hoặc email..."
            : "Search by name or email..."
        }
        clearLabel={locale === "vi" ? "Chưa gán" : "Unassigned"}
      />
    </>
  );
}

function CategoryColorPicker({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue: string;
}) {
  const initial =
    CATEGORY_SWATCHES.find((swatch) => swatch.value.toLowerCase() === defaultValue.toLowerCase())?.value ??
    CATEGORY_SWATCHES[0].value;
  const [color, setColor] = useState(initial);

  return (
    <>
      <input type="hidden" name={name} value={color} />
      <div className="flex flex-wrap gap-1.5">
        {CATEGORY_SWATCHES.map((swatch) => {
          const isSelected = color.toLowerCase() === swatch.value.toLowerCase();
          return (
            <button
              key={swatch.value}
              type="button"
              onClick={() => setColor(swatch.value)}
              aria-label={swatch.label}
              aria-pressed={isSelected}
              className={cn(
                "size-7 rounded-md border transition",
                isSelected
                  ? "border-foreground"
                  : "border-border hover:border-border-strong",
              )}
              style={{ backgroundColor: swatch.value }}
            />
          );
        })}
      </div>
    </>
  );
}

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function buildModalHref(
  currentPath: string,
  modal: WorkspaceModalKind,
  extra?: Record<string, string | null | undefined>,
) {
  return withSearchParams(currentPath, {
    modal,
    ...extra,
  });
}

function parseUrlModalState(
  searchParams: ReturnType<typeof useSearchParams>,
): WorkspaceModalState {
  const modal = searchParams.get("modal");

  if (
    modal !== "new-task" &&
    modal !== "new-checklist-item" &&
    modal !== "task" &&
    modal !== "delete-task" &&
    modal !== "new-request" &&
    modal !== "request" &&
    modal !== "delete-project" &&
    modal !== "project" &&
    modal !== "status-update"
  ) {
    return null;
  }

  return {
    kind: modal,
    taskId: searchParams.get("task"),
    requestId: searchParams.get("request"),
  };
}

function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
  className,
  icon,
  disabled,
}: {
  children: React.ReactNode;
  pendingLabel: string;
  variant?: "primary" | "secondary" | "danger";
  className?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();

  const variantClassName =
    variant === "danger"
      ? "ui-button-danger"
      : variant === "secondary"
        ? "ui-button-secondary"
        : "ui-button-primary";

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={cn(
        variantClassName,
        "w-full disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    >
      {pending ? <CircleNotch className="size-4 animate-spin" /> : icon}
      {pending ? pendingLabel : children}
    </button>
  );
}

function ActionButton({
  children,
  type = "button",
  pendingLabel,
  isPending = false,
  variant = "primary",
  className,
  icon,
  onClick,
  autoFocus = false,
}: {
  children: React.ReactNode;
  type?: "button" | "submit";
  pendingLabel: string;
  isPending?: boolean;
  variant?: "primary" | "secondary" | "danger";
  className?: string;
  icon?: React.ReactNode;
  onClick?: () => void | Promise<void>;
  // For confirm-style modals with no text field: focusing the action makes
  // Enter confirm it. Never set this on a form's Save button — the form
  // already handles Enter, and stealing focus from the first field is worse.
  autoFocus?: boolean;
}) {
  const variantClassName =
    variant === "danger"
      ? "ui-button-danger"
      : variant === "secondary"
        ? "ui-button-secondary"
        : "ui-button-primary";

  return (
    <button
      autoFocus={autoFocus}
      type={type}
      disabled={isPending}
      onClick={onClick}
      className={cn(
        variantClassName,
        "w-full disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    >
      {isPending ? <CircleNotch className="size-4 animate-spin" /> : icon}
      {isPending ? pendingLabel : children}
    </button>
  );
}

function CommentsLoading({ locale }: { locale: Locale }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted">
      <CircleNotch className="size-4 animate-spin" />
      {locale === "vi" ? "Đang tải bình luận..." : "Loading comments..."}
    </div>
  );
}

function ModalShell({
  title,
  description,
  children,
  onClose,
  maxWidthClassName = "max-w-2xl",
  locale,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  onClose: () => void;
  maxWidthClassName?: string;
  locale: Locale;
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 p-4 sm:p-6">
      <button
        type="button"
        aria-label={locale === "vi" ? "Đóng modal" : "Close modal"}
        onClick={onClose}
        className="ui-modal-backdrop absolute inset-0 backdrop-blur-xs"
      />
      <div className="relative flex min-h-full items-end justify-center sm:items-center">
        <div
          className={cn(
            "ui-modal-panel relative flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-md border border-border bg-surface-strong p-5 shadow-xl sm:max-h-[calc(100dvh-3rem)] sm:p-6",
            maxWidthClassName,
          )}
        >
          <button
            type="button"
            aria-label={locale === "vi" ? "Đóng modal" : "Close modal"}
            onClick={onClose}
            className="absolute right-4 top-4 z-10 inline-flex size-9 items-center justify-center rounded-md border border-border bg-surface text-muted transition hover:border-border-strong hover:bg-surface-strong hover:text-foreground sm:right-5 sm:top-5"
          >
            <X className="size-4" />
            <span className="sr-only">
              {locale === "vi" ? "Đóng modal" : "Close modal"}
            </span>
          </button>
          <div className="mb-5 flex shrink-0 items-start justify-between gap-4 pr-12">
            <div className="space-y-2">
              <p className="font-mono text-[11px] font-medium uppercase tracking-[0.04em] text-muted">
                {locale === "vi" ? "Modal không gian" : "Workspace modal"}
              </p>
              <div>
                <h3 className="text-[20px] font-medium tracking-[-0.022em] text-foreground">
                  {title}
                </h3>
                <p className="mt-1 max-w-2xl text-[13px] leading-6 text-muted">
                  {description}
                </p>
              </div>
            </div>
          </div>
          <div className="min-h-0 overflow-y-auto pr-1">{children}</div>
        </div>
      </div>
    </div>
  );
}

function ProjectWorkspaceModalHost({
  workspace,
  currentPath,
  viewer,
  modalState,
  onClose,
  openModal,
  openTask,
}: {
  workspace: ProjectWorkspace;
  currentPath: string;
  viewer: { id: string; role: UserRole };
  modalState: WorkspaceModalState;
  onClose: () => void;
  openModal: (state: NonNullable<WorkspaceModalState>) => void;
  openTask: (taskId: string) => void;
}) {
  const locale = useLocale();
  const viewerCanModerate =
    viewer.role === "owner" ||
    viewer.role === "admin" ||
    workspace.project.ownerId === viewer.id;
  const router = useRouter();
  const [, startRefreshTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const projectId = workspace.project.id;
  const selectedTask = modalState?.taskId
    ? workspace.tasks.find((task) => task.id === modalState.taskId) ?? null
    : null;
  const selectedRequest = modalState?.requestId
    ? workspace.requests.find((request) => request.id === modalState.requestId) ??
      null
    : null;
  const linkedTask = selectedRequest
    ? workspace.tasks.find((task) => task.requestId === selectedRequest.id) ?? null
    : null;

  // Modal detail (full checklist, comment thread, latest status update) is loaded
  // on demand when a modal opens — it's deliberately not in the workspace payload
  // so the board/requests pages don't serialize every entity's comments and
  // checklist into the client. `detailVersion` is bumped after a mutation to
  // re-fetch the open modal's detail.
  const [taskDetail, setTaskDetail] = useState<TaskModalDetail | null>(null);
  const [requestDetail, setRequestDetail] = useState<RequestModalDetail | null>(
    null,
  );
  const [detailVersion, setDetailVersion] = useState(0);
  const bumpDetail = () => setDetailVersion((version) => version + 1);

  const selectedTaskId = selectedTask?.id ?? null;
  const selectedRequestId = selectedRequest?.id ?? null;

  // `workspace` is in the deps so a server revalidation (e.g. a status-update
  // save/delete that redirects back here) re-fetches the open modal's detail.
  // Its identity is stable across client-only re-renders, so this doesn't
  // re-fetch on unrelated local state changes.
  useEffect(() => {
    if (!selectedTaskId) {
      setTaskDetail(null);
      return;
    }
    let active = true;
    loadTaskModalDetailAction(projectId, selectedTaskId)
      .then((detail) => {
        if (active) setTaskDetail(detail);
      })
      .catch(() => {
        if (active) setTaskDetail(null);
      });
    return () => {
      active = false;
    };
  }, [projectId, selectedTaskId, detailVersion, workspace]);

  useEffect(() => {
    if (!selectedRequestId) {
      setRequestDetail(null);
      return;
    }
    let active = true;
    loadRequestModalDetailAction(projectId, selectedRequestId)
      .then((detail) => {
        if (active) setRequestDetail(detail);
      })
      .catch(() => {
        if (active) setRequestDetail(null);
      });
    return () => {
      active = false;
    };
  }, [projectId, selectedRequestId, detailVersion, workspace]);

  const checklistItemsSeed: WorkspaceChecklistItem[] = taskDetail
    ? taskDetail.checklistItems.map((item) => ({
        id: item.id,
        taskId: item.taskId,
        content: item.content,
        isCompleted: item.isCompleted,
        sortOrder: item.sortOrder,
      }))
    : [];
  const checklistItemsSeedKey = checklistItemsSeed
    .map(
      (item) =>
        `${item.id}:${item.content}:${item.isCompleted ? "1" : "0"}:${item.sortOrder}`,
    )
    .join("|");
  const [clientChecklistItems, setClientChecklistItems] = useState(
    checklistItemsSeed,
  );
  const [editingChecklistItemId, setEditingChecklistItemId] = useState<string | null>(null);
  const [editingChecklistContent, setEditingChecklistContent] = useState("");
  const publishedUpdate = taskDetail?.publishedUpdate ?? null;
  const statusUpdateModalPath = selectedTask
    ? buildModalHref(currentPath, "status-update", {
        task: selectedTask.id,
      })
    : currentPath;
  const canCommit =
    (modalState?.taskIsTerminal ?? selectedTask?.isTerminal) === true;
  const errorNotice = mutationError ? (
    <div className="rounded-md border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm leading-6 text-danger">
      {mutationError}
    </div>
  ) : null;

  useEffect(() => {
    setPendingAction(null);
    setMutationError(null);
  }, [modalState?.kind, modalState?.taskId, modalState?.requestId]);

  useEffect(() => {
    setClientChecklistItems(checklistItemsSeed);
    setEditingChecklistItemId(null);
    setEditingChecklistContent("");
  }, [selectedTask?.id, checklistItemsSeedKey]);

  function refreshWorkspace() {
    startRefreshTransition(() => {
      router.refresh();
    });
  }

  // Wrap a comment action so the open modal's lazily-loaded detail is re-fetched
  // after the mutation — revalidatePath only refreshes the server-rendered tree
  // (board counts), not the client-side detail state.
  function withDetailRefresh(
    action: (formData: FormData) => Promise<void>,
  ): (formData: FormData) => Promise<void> {
    return async (formData: FormData) => {
      await action(formData);
      bumpDetail();
    };
  }

  async function runWorkspaceMutation(
    actionKey: string,
    payload: Record<string, string | null | undefined>,
    options: { successMessage?: string } = {},
  ) {
    setMutationError(null);
    setPendingAction(actionKey);

    try {
      const response = await fetch("/api/workspace", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const result = (await response.json().catch(() => null)) as
        | Record<string, unknown>
        | null;

      if (!response.ok) {
        throw new Error(
          typeof result?.error === "string"
            ? result.error
            : locale === "vi"
              ? "Không thể lưu thay đổi không gian."
              : "Unable to save workspace changes.",
        );
      }

      if (options.successMessage) {
        toast(options.successMessage, "success");
      }
      return result;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : locale === "vi"
            ? "Không thể lưu thay đổi không gian."
            : "Unable to save workspace changes.";
      setMutationError(message);
      toast(message, "danger");
      return null;
    } finally {
      setPendingAction(null);
    }
  }

  if (!modalState) {
    return null;
  }

  if (modalState.kind === "new-task") {
    return (
      <ModalShell
        onClose={onClose}
        locale={locale}
        title={locale === "vi" ? "Tạo công việc" : "Create task"}
        description={
          locale === "vi"
            ? "Thêm công việc mà không rời không gian tập trung vào bảng."
            : "Add a task without leaving the board-focused workspace."
        }
        maxWidthClassName="max-w-6xl"
      >
        <NewTaskForm
          workspace={workspace}
          isPending={pendingAction === "create-task"}
          errorNotice={errorNotice}
          locale={locale}
          onSubmit={async (payload) => {
            const result = await runWorkspaceMutation(
              "create-task",
              {
                action: "create-task",
                projectId: workspace.project.id,
                // Create on the branch currently being viewed (not always Main).
                branchId: workspace.currentBranchId ?? undefined,
                ...payload,
              },
              { successMessage: locale === "vi" ? "Đã tạo công việc" : "Task created" },
            );
            if (!result) return false;
            onClose();
            refreshWorkspace();
            return true;
          }}
        />
      </ModalShell>
    );
  }

  if (modalState.kind === "new-checklist-item" && selectedTask) {
    return (
      <ModalShell
        onClose={() =>
          openModal({
            kind: "task",
            taskId: selectedTask.id,
            taskIsTerminal: modalState.taskIsTerminal ?? selectedTask.isTerminal,
          })
        }
        locale={locale}
        title={locale === "vi" ? "Thêm việc con" : "Add subtask"}
        description={
          locale === "vi"
            ? "Thêm một mục checklist nhỏ cho công việc này."
            : "Add one small checklist item for this task."
        }
      >
        <form
          className="grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault();

            const formData = new FormData(event.currentTarget);
            const result = await runWorkspaceMutation(
              "create-checklist-item",
              {
                action: "create-checklist-item",
                projectId: workspace.project.id,
                taskId: selectedTask.id,
                content: getFormValue(formData, "content"),
              },
              { successMessage: locale === "vi" ? "Đã thêm việc con" : "Subtask added" },
            );

            if (!result || !result.item || typeof result.item !== "object") {
              return;
            }

            const nextItem = result.item as {
              id: string;
              taskId: string;
              content: string;
              isCompleted: boolean;
              sortOrder: number;
            };

            setClientChecklistItems((currentItems) =>
              [...currentItems, nextItem].sort(
                (left, right) => left.sortOrder - right.sortOrder,
              ),
            );
            openModal({
              kind: "task",
              taskId: selectedTask.id,
              taskIsTerminal: modalState.taskIsTerminal ?? selectedTask.isTerminal,
            });
            refreshWorkspace();
          }}
        >
          <div className="rounded-md border border-border bg-surface px-4 py-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
              {locale === "vi" ? "Công việc" : "Task"}
            </p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {selectedTask.title}
            </p>
          </div>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-foreground">
              {locale === "vi" ? "Việc con" : "Subtask"}
            </span>
            <input
              name="content"
              required
              className={fieldClassName}
              placeholder={locale === "vi" ? "Viết nội dung ghi chú phát hành" : "Write release note copy"}
            />
          </label>

          {errorNotice}

          <ActionButton
            type="submit"
            isPending={pendingAction === "create-checklist-item"}
            pendingLabel={locale === "vi" ? "Đang thêm việc con..." : "Adding subtask..."}
          >
            {locale === "vi" ? "Thêm việc con" : "Add subtask"}
          </ActionButton>
        </form>
      </ModalShell>
    );
  }

  if (modalState.kind === "task" && selectedTask) {
    const taskCode = formatTaskCode(
      workspace.project.slug,
      selectedTask.codeNumber,
    );
    return (
      <ModalShell
        onClose={onClose}
        locale={locale}
        title={
          taskCode
            ? `${locale === "vi" ? "Sửa công việc" : "Edit task"} · ${taskCode}`
            : locale === "vi" ? "Sửa công việc" : "Edit task"
        }
        description={
          locale === "vi"
            ? "Điều chỉnh chi tiết công việc và giữ các bước thực hiện nhỏ ngay dưới mô tả."
            : "Adjust task details and keep the small execution steps directly under the description."
        }
        maxWidthClassName="max-w-6xl"
      >
        <form
          className="grid gap-5"
          onSubmit={async (event) => {
            event.preventDefault();

            const formData = new FormData(event.currentTarget);
            const result = await runWorkspaceMutation("update-task", {
              action: "update-task",
              taskId: selectedTask.id,
              projectId: workspace.project.id,
              title: getFormValue(formData, "title"),
              description: getFormValue(formData, "description"),
              categoryId: getFormValue(formData, "categoryId"),
              labelIds: getFormValue(formData, "labelIds"),
              phase: getFormValue(formData, "phase"),
              statusId: getFormValue(formData, "statusId"),
              priority: getFormValue(formData, "priority"),
              dueDate: getFormValue(formData, "dueDate"),
              assigneeId: getFormValue(formData, "assigneeId"),
            });

            if (!result) {
              return;
            }

            // Keep the modal open — confirm with a toast so the user knows
            // the save landed without losing their place.
            toast(locale === "vi" ? "Đã lưu công việc" : "Task saved", "success");
            refreshWorkspace();
          }}
        >
          <label className="grid gap-2">
            <span className="text-sm font-medium text-foreground">
              {locale === "vi" ? "Tiêu đề" : "Title"}
            </span>
            <input
              name="title"
              required
              defaultValue={selectedTask.title}
              className={fieldClassName}
            />
          </label>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="grid content-start gap-5">
              <div className="grid gap-2">
                <span className="text-sm font-medium text-foreground">
                  {locale === "vi" ? "Mô tả" : "Description"}
                </span>
                <RichTextField
                  name="description"
                  defaultValue={selectedTask.description}
                  ariaLabel={locale === "vi" ? "Mô tả công việc" : "Task description"}
                />
              </div>

              <div className="grid gap-3 rounded-md border border-border bg-surface px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
                {locale === "vi" ? "Việc con" : "Subtasks"}
              </p>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted">
                {clientChecklistItems.length
                  ? `${clientChecklistItems.filter((item) => item.isCompleted).length}/${clientChecklistItems.length} ${locale === "vi" ? "xong" : "done"}`
                  : locale === "vi" ? "Chưa có việc con" : "No subtasks yet"}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    openModal({
                      kind: "new-checklist-item",
                      taskId: selectedTask.id,
                      taskIsTerminal: modalState.taskIsTerminal ?? selectedTask.isTerminal,
                    })
                  }
                  className="ui-button-secondary"
                >
                  <Plus className="size-4" />
                  {locale === "vi" ? "Thêm" : "Add"}
                </button>
              </div>
            </div>

            {clientChecklistItems.length ? (
              <div className="space-y-2">
                {clientChecklistItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2.5"
                  >
                    <button
                      type="button"
                      disabled={pendingAction === `toggle-checklist-${item.id}`}
                      onClick={async () => {
                        const previousItems = clientChecklistItems;

                        setClientChecklistItems((currentItems) =>
                          currentItems.map((currentItem) =>
                            currentItem.id === item.id
                              ? {
                                  ...currentItem,
                                  isCompleted: !currentItem.isCompleted,
                                }
                              : currentItem,
                          ),
                        );

                        const result = await runWorkspaceMutation(
                          `toggle-checklist-${item.id}`,
                          {
                            action: "toggle-checklist-item",
                            projectId: workspace.project.id,
                            taskId: selectedTask.id,
                            checklistItemId: item.id,
                          },
                        );

                        if (!result) {
                          setClientChecklistItems(previousItems);
                          return;
                        }

                        refreshWorkspace();
                      }}
                      className={cn(
                        "inline-flex size-7 items-center justify-center rounded-sm border transition disabled:cursor-not-allowed disabled:opacity-60",
                        item.isCompleted
                          ? "border-emerald/40 bg-emerald/10 text-emerald"
                          : "border-border bg-background text-muted hover:border-border-strong hover:bg-surface-strong hover:text-foreground",
                      )}
                    >
                      {pendingAction === `toggle-checklist-${item.id}` ? (
                        <CircleNotch className="size-4 animate-spin" />
                      ) : item.isCompleted ? (
                        <Check className="size-4" />
                      ) : (
                        <span className="size-2 rounded-full bg-current" />
                      )}
                      <span className="sr-only">
                        {item.isCompleted
                          ? locale === "vi" ? "Đánh dấu chưa xong" : "Mark incomplete"
                          : locale === "vi" ? "Đánh dấu hoàn tất" : "Mark complete"}
                      </span>
                    </button>

                    {editingChecklistItemId === item.id ? (
                      <input
                        autoFocus
                        type="text"
                        value={editingChecklistContent}
                        maxLength={180}
                        disabled={pendingAction === `update-checklist-${item.id}`}
                        onChange={(event) => setEditingChecklistContent(event.target.value)}
                        onBlur={async () => {
                          const trimmed = editingChecklistContent.trim();
                          if (trimmed.length === 0 || trimmed === item.content) {
                            setEditingChecklistItemId(null);
                            setEditingChecklistContent("");
                            return;
                          }

                          const previousItems = clientChecklistItems;
                          setClientChecklistItems((currentItems) =>
                            currentItems.map((currentItem) =>
                              currentItem.id === item.id
                                ? { ...currentItem, content: trimmed }
                                : currentItem,
                            ),
                          );
                          setEditingChecklistItemId(null);
                          setEditingChecklistContent("");

                          const result = await runWorkspaceMutation(
                            `update-checklist-${item.id}`,
                            {
                              action: "update-checklist-item",
                              projectId: workspace.project.id,
                              taskId: selectedTask.id,
                              checklistItemId: item.id,
                              content: trimmed,
                            },
                          );

                          if (!result) {
                            setClientChecklistItems(previousItems);
                            return;
                          }

                          refreshWorkspace();
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            event.currentTarget.blur();
                          } else if (event.key === "Escape") {
                            event.preventDefault();
                            setEditingChecklistItemId(null);
                            setEditingChecklistContent("");
                          }
                        }}
                        className="min-w-0 flex-1 rounded-sm border border-border bg-background px-2 py-0.5 text-sm leading-6 text-foreground outline-none focus:border-foreground"
                      />
                    ) : (
                      <p
                        onClick={() => {
                          setEditingChecklistItemId(item.id);
                          setEditingChecklistContent(item.content);
                        }}
                        className={cn(
                          "min-w-0 flex-1 cursor-text text-sm leading-6 text-foreground",
                          item.isCompleted && "text-muted line-through",
                        )}
                      >
                        {item.content}
                      </p>
                    )}

                    <button
                      type="button"
                      disabled={pendingAction === `delete-checklist-${item.id}`}
                      onClick={async () => {
                        const previousItems = clientChecklistItems;

                        setClientChecklistItems((currentItems) =>
                          currentItems.filter(
                            (currentItem) => currentItem.id !== item.id,
                          ),
                        );

                        const result = await runWorkspaceMutation(
                          `delete-checklist-${item.id}`,
                          {
                            action: "delete-checklist-item",
                            projectId: workspace.project.id,
                            taskId: selectedTask.id,
                            checklistItemId: item.id,
                          },
                          { successMessage: locale === "vi" ? "Đã xóa việc con" : "Subtask removed" },
                        );

                        if (!result) {
                          setClientChecklistItems(previousItems);
                          return;
                        }

                        refreshWorkspace();
                      }}
                      className="inline-flex size-7 items-center justify-center rounded-sm border border-border bg-background text-muted transition hover:border-danger/30 hover:bg-danger/10 hover:text-danger disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {pendingAction === `delete-checklist-${item.id}` ? (
                        <CircleNotch className="size-4 animate-spin" />
                      ) : (
                        <Trash className="size-4" />
                      )}
                      <span className="sr-only">
                        {locale === "vi" ? "Xóa việc con" : "Delete subtask"}
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

              </div>
            </div>

            <aside className="grid content-start gap-4 rounded-md border border-border bg-surface p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
                {locale === "vi" ? "Chi tiết" : "Details"}
              </p>

              <label className="grid gap-1.5">
                <span className="text-[12px] font-medium text-foreground">
                  {locale === "vi" ? "Trạng thái" : "Status"}
                </span>
                <select
                  name="statusId"
                  defaultValue={selectedTask.statusId}
                  className={selectClassName}
                >
                  {workspace.statuses.map((status) => (
                    <option key={status.id} value={status.id}>
                      {status.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1.5">
                <span className="text-[12px] font-medium text-foreground">
                  {locale === "vi" ? "Ưu tiên" : "Priority"}
                </span>
                <select
                  name="priority"
                  defaultValue={selectedTask.priority}
                  className={selectClassName}
                >
                  <option value="low">{priorityLabel("low", locale)}</option>
                  <option value="medium">{priorityLabel("medium", locale)}</option>
                  <option value="high">{priorityLabel("high", locale)}</option>
                </select>
              </label>

              <div className="grid gap-1.5">
                <span className="text-[12px] font-medium text-foreground">
                  {locale === "vi" ? "Người phụ trách" : "Assignee"}
                </span>
                <AssigneeSelect
                  name="assigneeId"
                  defaultValue={selectedTask.assigneeId}
                  members={workspace.members}
                  locale={locale}
                />
              </div>

              <label className="grid gap-1.5">
                <span className="text-[12px] font-medium text-foreground">
                  {locale === "vi" ? "Ngày hạn" : "Due date"}
                </span>
                <input
                  type="date"
                  name="dueDate"
                  defaultValue={formatDateForInput(selectedTask.dueDate)}
                  className={fieldClassName}
                />
              </label>

              <div className="grid gap-1.5">
                <span className="text-[12px] font-medium text-foreground">
                  {locale === "vi" ? "Danh mục" : "Category"}
                </span>
                <CategorySelect
                  name="categoryId"
                  projectId={workspace.project.id}
                  categories={workspace.categories}
                  defaultValue={selectedTask.categoryId}
                />
              </div>

              <div className="grid gap-1.5">
                <span className="text-[12px] font-medium text-foreground">
                  {locale === "vi" ? "Nhãn" : "Labels"}
                </span>
                <LabelSelect
                  name="labelIds"
                  projectId={workspace.project.id}
                  labels={workspace.labels}
                  defaultValues={(selectedTask.labels ?? []).map((l) => l.id)}
                />
              </div>

              <label className="grid gap-1.5">
                <span className="text-[12px] font-medium text-foreground">
                  {locale === "vi" ? "Giai đoạn" : "Phase"}{" "}
                  <span className="text-muted">
                    {locale === "vi" ? "(tùy chọn)" : "(optional)"}
                  </span>
                </span>
                <input
                  name="phase"
                  defaultValue={selectedTask.phase ?? ""}
                  className={fieldClassName}
                  placeholder="Discovery / Beta"
                />
              </label>

              {selectedTask.requestId ? (() => {
                const sourceRequest = workspace.requests.find(
                  (r) => r.id === selectedTask.requestId,
                );
                if (!sourceRequest) return null;
                const sourceCode = formatRequestCode(
                  workspace.project.slug,
                  sourceRequest.codeNumber,
                );
                return (
                  <div className="border-t border-border pt-4">
                    <p className="font-mono text-[11px] uppercase tracking-[0.04em] text-muted">
                      {locale === "vi" ? "Yêu cầu nguồn" : "Source request"}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        openModal({
                          kind: "request",
                          requestId: sourceRequest.id,
                        })
                      }
                      className="ui-button-secondary mt-2 w-full"
                    >
                      <ArrowSquareOut className="size-4" />
                      {sourceCode ?? (locale === "vi" ? "Mở yêu cầu nguồn" : "Open source request")}
                    </button>
                  </div>
                );
              })() : null}
            </aside>
          </div>

          {errorNotice}

          <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_280px]">
            <ActionButton
              type="submit"
              isPending={pendingAction === "update-task"}
              pendingLabel={locale === "vi" ? "Đang lưu công việc..." : "Saving task..."}
              className="w-full"
            >
              {locale === "vi" ? "Lưu công việc" : "Save task"}
            </ActionButton>
            <button
              type="button"
              onClick={() =>
                openModal({
                  kind: "delete-task",
                  taskId: selectedTask.id,
                  taskIsTerminal: modalState.taskIsTerminal ?? selectedTask.isTerminal,
                })
              }
              className="ui-button-danger w-full"
            >
              <Trash className="size-4" />
              {locale === "vi" ? "Xóa công việc" : "Delete task"}
            </button>
          </div>
        </form>

        <div className="mt-6 border-t border-border pt-5">
          {taskDetail ? (
            <CommentThread
              comments={taskDetail.comments.map((c) => ({
                id: c.id,
                parentCommentId: c.parentCommentId,
                content: c.content,
                authorId: c.authorId,
                authorName: c.authorName,
                authorImage: c.authorImage,
                createdAt: c.createdAt,
                updatedAt: c.updatedAt,
              }))}
              projectId={workspace.project.id}
              parentId={selectedTask.id}
              viewerId={viewer.id}
              viewerCanModerate={viewerCanModerate}
              mentionUsers={workspace.members.map((member) => ({
                id: member.userId,
                name: member.name,
                email: member.email,
              }))}
              actions={{
                create: withDetailRefresh(createTaskCommentAction),
                update: withDetailRefresh(updateTaskCommentAction),
                remove: withDetailRefresh(deleteTaskCommentAction),
              }}
            />
          ) : (
            <CommentsLoading locale={locale} />
          )}
        </div>
      </ModalShell>
    );
  }

  if (modalState.kind === "delete-task" && selectedTask) {
    return (
      <ModalShell
        onClose={() =>
          openModal({
            kind: "task",
            taskId: selectedTask.id,
            taskIsTerminal: modalState.taskIsTerminal ?? selectedTask.isTerminal,
          })
        }
        locale={locale}
        title={locale === "vi" ? "Xóa công việc" : "Delete task"}
        description={
          locale === "vi"
            ? "Thao tác này xóa công việc và các việc con. Chỉ dùng khi công việc cần biến mất hoàn toàn."
            : "This removes the task and its subtasks. Use this only when the task should disappear completely."
        }
      >
        <div className="grid gap-4">
          <div className="ui-panel-danger px-4 py-4 text-sm leading-6 text-muted">
            {locale === "vi" ? "Bạn đang xóa " : "You are deleting "}
            <span className="font-semibold text-foreground">{selectedTask.title}</span>.
            {locale === "vi" ? " Không thể hoàn tác." : " This cannot be undone."}
          </div>

          {errorNotice}

          <ActionButton
            autoFocus
            isPending={pendingAction === "delete-task"}
            pendingLabel={locale === "vi" ? "Đang xóa công việc..." : "Deleting task..."}
            variant="danger"
            onClick={async () => {
              const result = await runWorkspaceMutation(
                "delete-task",
                {
                  action: "delete-task",
                  taskId: selectedTask.id,
                  projectId: workspace.project.id,
                },
                { successMessage: locale === "vi" ? "Đã xóa công việc" : "Task deleted" },
              );

              if (!result) {
                return;
              }

              onClose();
              refreshWorkspace();
            }}
          >
              {locale === "vi" ? "Xóa công việc" : "Delete task"}
          </ActionButton>
        </div>
      </ModalShell>
    );
  }

  if (modalState.kind === "status-update" && selectedTask) {
    return (
      <ModalShell
        onClose={onClose}
        locale={locale}
        title={locale === "vi" ? "Ghi cập nhật cho khách hàng" : "Commit client update"}
        description={
          locale === "vi"
            ? "Viết một cập nhật ngắn cho khách hàng về công việc đã hoàn tất."
            : "Write a short client-facing update for this completed task."
        }
      >
        {canCommit ? (
          !taskDetail ? (
            <CommentsLoading locale={locale} />
          ) : (
          <div className="grid gap-4">
            <div className="rounded-md border border-border bg-surface px-4 py-4">
              <div className="flex items-start gap-3">
                <span className="inline-flex size-9 items-center justify-center rounded-md border border-border bg-background text-accent">
                  <GitCommit className="size-5" />
                </span>
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
                    {locale === "vi" ? "Công việc đã xong" : "Done task"}
                  </p>
                  <h4 className="mt-2 text-base font-semibold text-foreground">
                    {selectedTask.title}
                  </h4>
                </div>
              </div>
            </div>

            <StatusUpdateForm
              key={publishedUpdate?.id ?? "new"}
              projectId={workspace.project.id}
              taskId={selectedTask.id}
              returnTo={statusUpdateModalPath}
              defaultValue={publishedUpdate?.summary ?? ""}
              isUpdate={Boolean(publishedUpdate)}
              locale={locale}
            />

            {publishedUpdate ? (
              <form action={deleteTaskStatusUpdateAction}>
                <input
                  type="hidden"
                  name="projectId"
                  value={workspace.project.id}
                />
                <input type="hidden" name="taskId" value={selectedTask.id} />
                <input type="hidden" name="returnTo" value={statusUpdateModalPath} />
                <SubmitButton
                  pendingLabel={locale === "vi" ? "Đang gỡ bàn giao..." : "Removing commit..."}
                  variant="danger"
                >
                  {locale === "vi" ? "Gỡ bàn giao" : "Remove commit"}
                </SubmitButton>
              </form>
            ) : null}
          </div>
          )
        ) : (
          <div className="rounded-md border border-dashed border-border bg-background px-4 py-5 text-sm leading-6 text-muted">
            {locale === "vi" ? "Chỉ công việc trong cột " : "Only tasks in the "}
            <span className="font-semibold text-foreground">Done</span>
            {locale === "vi"
              ? " mới có thể ghi vào nhật ký khách hàng."
              : " column can be committed to the client log."}
          </div>
        )}
      </ModalShell>
    );
  }

  if (modalState.kind === "new-request") {
    return (
      <ModalShell
        onClose={onClose}
        locale={locale}
        title={locale === "vi" ? "Ghi nhận yêu cầu" : "Capture request"}
        description={
          locale === "vi"
            ? "Giữ yêu cầu mới trong hộp vào trước, rồi chuyển thành công việc khi sẵn sàng triển khai."
            : "Keep incoming asks in the inbox first, then convert them into execution work when ready."
        }
        maxWidthClassName="max-w-6xl"
      >
        <form
          className="grid gap-5"
          onSubmit={async (event) => {
            event.preventDefault();

            const formData = new FormData(event.currentTarget);
            const result = await runWorkspaceMutation(
              "create-request",
              {
                action: "create-request",
                projectId: workspace.project.id,
                // Capture on the branch currently being viewed (not always Main).
                branchId: workspace.currentBranchId ?? undefined,
                title: getFormValue(formData, "title"),
                description: getFormValue(formData, "description"),
                priority: getFormValue(formData, "priority"),
              },
              { successMessage: locale === "vi" ? "Đã ghi nhận yêu cầu" : "Request captured" },
            );

            if (!result) {
              return;
            }

            onClose();
            refreshWorkspace();
          }}
        >
          <label className="grid gap-2">
            <span className="text-sm font-medium text-foreground">
              {locale === "vi" ? "Tiêu đề yêu cầu" : "Request title"}
            </span>
            <input
              name="title"
              required
              className={fieldClassName}
              placeholder={locale === "vi" ? "CTA trang chủ cần chỉnh lại" : "Homepage CTA needs revision"}
            />
          </label>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="grid content-start gap-2">
              <span className="text-sm font-medium text-foreground">
                {locale === "vi" ? "Bối cảnh" : "Context"}
              </span>
              <RichTextField
                name="description"
                placeholder={
                  locale === "vi"
                    ? "Ghi lại yêu cầu, ràng buộc và thay đổi mong muốn."
                    : "Capture the ask, constraints, and expected change."
                }
                ariaLabel={locale === "vi" ? "Bối cảnh yêu cầu" : "Request context"}
              />
            </div>

            <aside className="grid content-start gap-4 rounded-md border border-border bg-surface p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
                {locale === "vi" ? "Chi tiết" : "Details"}
              </p>

              <label className="grid gap-1.5">
                <span className="text-[12px] font-medium text-foreground">
                  {locale === "vi" ? "Ưu tiên" : "Priority"}
                </span>
                <select
                  name="priority"
                  defaultValue="medium"
                  className={selectClassName}
                >
                  <option value="low">{priorityLabel("low", locale)}</option>
                  <option value="medium">{priorityLabel("medium", locale)}</option>
                  <option value="high">{priorityLabel("high", locale)}</option>
                </select>
              </label>
            </aside>
          </div>

          {errorNotice}

          <ActionButton
            type="submit"
            isPending={pendingAction === "create-request"}
            pendingLabel={locale === "vi" ? "Đang lưu yêu cầu..." : "Saving request..."}
            className="justify-self-end px-6"
          >
            {locale === "vi" ? "Lưu yêu cầu" : "Save request"}
          </ActionButton>
        </form>
      </ModalShell>
    );
  }

  if (modalState.kind === "request" && selectedRequest) {
    const requestCode = formatRequestCode(
      workspace.project.slug,
      selectedRequest.codeNumber,
    );
    return (
      <ModalShell
        onClose={onClose}
        locale={locale}
        title={
          requestCode
            ? `${locale === "vi" ? "Duyệt yêu cầu" : "Review request"} · ${requestCode}`
            : locale === "vi" ? "Duyệt yêu cầu" : "Review request"
        }
        description={
          locale === "vi"
            ? "Sửa yêu cầu, rồi chuyển thành công việc khi phần việc đã sẵn sàng lên bảng."
            : "Edit the request, then convert it into a task when the work is ready to move onto the board."
        }
        maxWidthClassName="max-w-6xl"
      >
        <form
          className="grid gap-5"
          onSubmit={async (event) => {
            event.preventDefault();

            const formData = new FormData(event.currentTarget);
            const result = await runWorkspaceMutation(
              "update-request",
              {
                action: "update-request",
                requestId: selectedRequest.id,
                projectId: workspace.project.id,
                title: getFormValue(formData, "title"),
                description: getFormValue(formData, "description"),
                status: getFormValue(formData, "status"),
                priority: getFormValue(formData, "priority"),
              },
              { successMessage: locale === "vi" ? "Đã lưu yêu cầu" : "Request saved" },
            );

            if (!result) {
              return;
            }

            onClose();
            refreshWorkspace();
          }}
        >
          <label className="grid gap-2">
            <span className="text-sm font-medium text-foreground">
              {locale === "vi" ? "Tiêu đề" : "Title"}
            </span>
            <input
              name="title"
              required
              defaultValue={selectedRequest.title}
              className={fieldClassName}
            />
          </label>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="grid content-start gap-2">
              <span className="text-sm font-medium text-foreground">
                {locale === "vi" ? "Mô tả" : "Description"}
              </span>
              <RichTextField
                name="description"
                defaultValue={selectedRequest.description}
                ariaLabel={locale === "vi" ? "Mô tả yêu cầu" : "Request description"}
              />
            </div>

            <aside className="grid content-start gap-4 rounded-md border border-border bg-surface p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
                {locale === "vi" ? "Chi tiết" : "Details"}
              </p>

              <label className="grid gap-1.5">
                <span className="text-[12px] font-medium text-foreground">
                  {locale === "vi" ? "Trạng thái" : "Status"}
                </span>
                <select
                  name="status"
                  defaultValue={selectedRequest.status}
                  className={selectClassName}
                >
                  <option value="new">{requestStatusLabel("new", locale)}</option>
                  <option value="reviewed">{requestStatusLabel("reviewed", locale)}</option>
                  <option value="converted">{requestStatusLabel("converted", locale)}</option>
                  <option value="closed">{requestStatusLabel("closed", locale)}</option>
                </select>
              </label>

              <label className="grid gap-1.5">
                <span className="text-[12px] font-medium text-foreground">
                  {locale === "vi" ? "Ưu tiên" : "Priority"}
                </span>
                <select
                  name="priority"
                  defaultValue={selectedRequest.priority}
                  className={selectClassName}
                >
                  <option value="low">{priorityLabel("low", locale)}</option>
                  <option value="medium">{priorityLabel("medium", locale)}</option>
                  <option value="high">{priorityLabel("high", locale)}</option>
                </select>
              </label>

              <div className="border-t border-border pt-4">
                {linkedTask ? (() => {
                  const linkedTaskCode = formatTaskCode(
                    workspace.project.slug,
                    linkedTask.codeNumber,
                  );
                  return (
                    <>
                      <p className="font-mono text-[11px] uppercase tracking-[0.04em] text-muted">
                        {locale === "vi" ? "Công việc liên kết" : "Linked task"}
                      </p>
                      <button
                        type="button"
                        onClick={() => openTask(linkedTask.id)}
                        className="ui-button-secondary mt-2 w-full"
                      >
                        <ArrowSquareOut className="size-4" />
                        {linkedTaskCode ?? (locale === "vi" ? "Mở công việc liên kết" : "Open linked task")}
                      </button>
                    </>
                  );
                })() : selectedRequest.status === "converted" ? (
                  // Already converted, but its task isn't on this branch (moved
                  // to another branch). Never re-offer Convert — that would imply
                  // it's unconverted; point to where the task lives instead.
                  <>
                    <p className="font-mono text-[11px] uppercase tracking-[0.04em] text-muted">
                      {locale === "vi" ? "Công việc liên kết" : "Linked task"}
                    </p>
                    <p className="mt-2 text-[13px] leading-6 text-muted">
                      {locale === "vi"
                        ? "Đã chuyển đổi - công việc liên kết nằm ở nhánh khác. Hãy chuyển sang nhánh đó để mở."
                        : "Converted - the linked task lives on another branch. Switch to that branch to open it."}
                    </p>
                  </>
                ) : (
                  <ConvertRequestButton
                    projectId={workspace.project.id}
                    requestId={selectedRequest.id}
                    returnTo={currentPath}
                    locale={locale}
                  />
                )}
              </div>
            </aside>
          </div>

          {errorNotice}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <ActionButton
              isPending={pendingAction === "delete-request"}
              pendingLabel={locale === "vi" ? "Đang xóa yêu cầu..." : "Deleting request..."}
              variant="danger"
              className="px-4"
              onClick={async () => {
                const result = await runWorkspaceMutation(
                  "delete-request",
                  {
                    action: "delete-request",
                    requestId: selectedRequest.id,
                    projectId: workspace.project.id,
                  },
                  { successMessage: locale === "vi" ? "Đã xóa yêu cầu" : "Request deleted" },
                );

                if (!result) {
                  return;
                }

                onClose();
                refreshWorkspace();
              }}
            >
              {locale === "vi" ? "Xóa yêu cầu" : "Delete request"}
            </ActionButton>
            <ActionButton
              type="submit"
              isPending={pendingAction === "update-request"}
              pendingLabel={locale === "vi" ? "Đang lưu yêu cầu..." : "Saving request..."}
              className="px-6"
            >
              {locale === "vi" ? "Lưu yêu cầu" : "Save request"}
            </ActionButton>
          </div>
        </form>

        <div className="mt-6 border-t border-border pt-5">
          {requestDetail ? (
            <CommentThread
              comments={requestDetail.comments.map((c) => ({
                id: c.id,
                parentCommentId: c.parentCommentId,
                content: c.content,
                authorId: c.authorId,
                authorName: c.authorName,
                authorImage: c.authorImage,
                createdAt: c.createdAt,
                updatedAt: c.updatedAt,
              }))}
              projectId={workspace.project.id}
              parentId={selectedRequest.id}
              viewerId={viewer.id}
              viewerCanModerate={viewerCanModerate}
              mentionUsers={workspace.members.map((member) => ({
                id: member.userId,
                name: member.name,
                email: member.email,
              }))}
              actions={{
                create: withDetailRefresh(createRequestCommentAction),
                update: withDetailRefresh(updateRequestCommentAction),
                remove: withDetailRefresh(deleteRequestCommentAction),
              }}
            />
          ) : (
            <CommentsLoading locale={locale} />
          )}
        </div>
      </ModalShell>
    );
  }

  if (modalState.kind === "delete-project") {
    return (
      <ModalShell
        onClose={onClose}
        locale={locale}
        title={locale === "vi" ? "Xóa không gian" : "Delete workspace"}
        description={
          locale === "vi"
            ? "Thao tác này xóa dự án, yêu cầu, công việc, ghi chú và nhật ký hoạt động. Không thể hoàn tác."
            : "This removes the project, requests, tasks, notes, and activity log. This action cannot be undone."
        }
      >
        <div className="grid gap-4">
          <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-4 text-sm leading-7 text-muted">
            {locale === "vi" ? "Bạn đang xóa " : "You are deleting "}
            <span className="font-semibold text-foreground">
              {workspace.project.name}
            </span>
            {locale === "vi"
              ? ". Nếu vẫn cần giữ hồ sơ, hãy lưu trữ thay vì xóa."
              : ". If you still need the record, archive it instead."}
          </div>

          <form action={deleteProjectAction}>
            <input type="hidden" name="projectId" value={workspace.project.id} />
            <SubmitButton
              pendingLabel={locale === "vi" ? "Đang xóa không gian..." : "Deleting workspace..."}
              variant="danger"
            >
              {locale === "vi" ? "Xóa không gian" : "Delete workspace"}
            </SubmitButton>
          </form>
        </div>
      </ModalShell>
    );
  }

  if (modalState.kind === "project") {
    return (
      <ModalShell
        onClose={onClose}
        locale={locale}
        title={locale === "vi" ? "Sửa dự án" : "Edit project"}
        description={
          locale === "vi"
            ? "Cập nhật thông tin cốt lõi của dự án mà không biến không gian làm việc thành một form cài đặt dài."
            : "Update the core project metadata without turning the workspace itself into a long settings form."
        }
      >
        <form action={updateProjectAction} className="grid gap-4">
          <input type="hidden" name="projectId" value={workspace.project.id} />
          <input type="hidden" name="returnTo" value={currentPath} />

          <label className="grid gap-2">
            <span className="text-sm font-medium text-foreground">
              {locale === "vi" ? "Tên dự án" : "Project name"}
            </span>
            <input
              name="name"
              required
              defaultValue={workspace.project.name}
              className={fieldClassName}
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-foreground">
              {t(locale, "client")}
            </span>
            <input
              name="clientName"
              defaultValue={workspace.project.clientName ?? ""}
              className={fieldClassName}
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-foreground">
              {locale === "vi" ? "Tóm tắt" : "Summary"}
            </span>
            <textarea
              name="summary"
              defaultValue={workspace.project.summary ?? ""}
              rows={4}
              className={textAreaClassName}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-foreground">
                {locale === "vi" ? "Trạng thái" : "Status"}
              </span>
              <select
                name="status"
                defaultValue={workspace.project.status}
                className={selectClassName}
              >
                {getProjectStatusOptions(locale).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-foreground">
                {t(locale, "deadline")}
              </span>
              <input
                type="date"
                name="deadline"
                defaultValue={formatDateForInput(workspace.project.deadline)}
                className={fieldClassName}
              />
            </label>
          </div>

          <SubmitButton
            pendingLabel={locale === "vi" ? "Đang lưu dự án..." : "Saving project..."}
            className="mt-2"
          >
            {locale === "vi" ? "Lưu dự án" : "Save project"}
          </SubmitButton>
        </form>
      </ModalShell>
    );
  }

  return null;
}

export function ProjectWorkspaceClientShell({
  workspace,
  currentPath,
  viewer,
  children,
}: {
  workspace: ProjectWorkspace;
  currentPath: string;
  viewer: { id: string; role: UserRole };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [modalState, setModalState] = useState<WorkspaceModalState>(null);

  // Sync the modal from the URL ONLY when the URL's modal params actually change
  // (deep links, back/forward nav) — keyed on a stable signature. Depending on
  // the raw searchParams object would re-run this on every unrelated re-render,
  // including a server action's revalidatePath() (which changes useSearchParams'
  // identity without changing the params) and would force-close a client-opened
  // modal — e.g. creating a task category from inside the open task modal.
  const urlModalSignature = [
    searchParams.get("modal") ?? "",
    searchParams.get("task") ?? "",
    searchParams.get("request") ?? "",
  ].join("|");
  const lastUrlModalSignature = useRef<string | null>(null);

  useEffect(() => {
    if (lastUrlModalSignature.current === urlModalSignature) return;
    lastUrlModalSignature.current = urlModalSignature;
    setModalState(parseUrlModalState(searchParams));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlModalSignature]);

  const value = useMemo<ProjectWorkspaceUiContextValue>(() => {
    return {
      openModal: (state) => {
        setModalState(state);
      },
      openTask: (taskId) => {
        setModalState({
          kind: "task",
          taskId,
        });
      },
      openRequest: (requestId) => {
        setModalState({
          kind: "request",
          requestId,
        });
      },
      openStatusUpdate: (taskId, isTerminal) => {
        setModalState({
          kind: "status-update",
          taskId,
          taskIsTerminal: isTerminal ?? null,
        });
      },
      closeModal: () => {
        setModalState(null);

        const hasCommentHash =
          typeof window !== "undefined" &&
          window.location.hash.startsWith("#comment-");

        if (searchParams.get("modal") || hasCommentHash) {
          if (typeof window !== "undefined") {
            window.history.replaceState(window.history.state, "", currentPath);
          }
          router.replace(currentPath, { scroll: false });
        }
      },
    };
  }, [currentPath, router, searchParams]);

  return (
    <ProjectWorkspaceUiContext.Provider value={value}>
      {children}
      <ProjectWorkspaceModalHost
        workspace={workspace}
        currentPath={currentPath}
        viewer={viewer}
        modalState={modalState}
        onClose={value.closeModal}
        openModal={value.openModal}
        openTask={value.openTask}
      />
    </ProjectWorkspaceUiContext.Provider>
  );
}

export function useOptionalProjectWorkspaceUi() {
  return useContext(ProjectWorkspaceUiContext);
}

export function ProjectWorkspaceModalTrigger({
  modal,
  taskId,
  requestId,
  children,
  className,
  style,
}: {
  modal: WorkspaceModalKind;
  taskId?: string;
  requestId?: string;
  children: React.ReactNode;
  className: string;
  style?: React.CSSProperties;
}) {
  const context = useContext(ProjectWorkspaceUiContext);

  if (!context) {
    return null;
  }

  return (
    <button
      type="button"
      style={style}
      onClick={() =>
        context.openModal({
          kind: modal,
          taskId,
          requestId,
        })
      }
      className={className}
    >
      {children}
    </button>
  );
}
