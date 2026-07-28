// Display labels for project statuses. Storage stays kebab/snake; the UI
// prefixes "In" for active phases and renders plain for terminal states.

import type { ProjectStatus } from "@/lib/db/schema";
import type { Locale } from "@/lib/i18n";

export const PROJECT_STATUS_LABELS_BY_LOCALE: Record<Locale, Record<ProjectStatus, string>> = {
  en: {
    production: "In Production",
    development: "In Development",
    poc: "In POC",
    on_hold: "On Hold",
    completed: "Completed",
  },
  vi: {
    production: "Đang sản xuất",
    development: "Đang phát triển",
    poc: "Đang POC",
    on_hold: "Tạm dừng",
    completed: "Hoàn tất",
  },
};

export const PROJECT_STATUS_LABELS = PROJECT_STATUS_LABELS_BY_LOCALE.en;

const PROJECT_STATUS_OPTIONS_BY_LOCALE: Record<Locale, ReadonlyArray<{
  value: ProjectStatus;
  label: string;
}>> = {
  en: [
    { value: "production", label: "In Production" },
    { value: "development", label: "In Development" },
    { value: "poc", label: "In POC" },
    { value: "on_hold", label: "On Hold" },
    { value: "completed", label: "Completed" },
  ],
  vi: [
    { value: "production", label: "Đang sản xuất" },
    { value: "development", label: "Đang phát triển" },
    { value: "poc", label: "Đang POC" },
    { value: "on_hold", label: "Tạm dừng" },
    { value: "completed", label: "Hoàn tất" },
  ],
};

export const PROJECT_STATUS_OPTIONS = PROJECT_STATUS_OPTIONS_BY_LOCALE.en;

export function getProjectStatusOptions(locale: Locale = "en") {
  return PROJECT_STATUS_OPTIONS_BY_LOCALE[locale];
}

export function formatProjectStatus(status: ProjectStatus, locale: Locale = "en"): string {
  return PROJECT_STATUS_LABELS_BY_LOCALE[locale][status];
}
