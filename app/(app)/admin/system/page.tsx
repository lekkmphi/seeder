import { SystemSettingsForm } from "@/components/admin/system/system-settings-form";
import { PageHeader } from "@/components/app/page-header";
import { requireRole } from "@/lib/auth-server";
import { getRequestLocale } from "@/lib/i18n-server";
import {
  brandingUrl,
  getSystemSettings,
  PREVIEW_DEFAULTS,
} from "@/lib/system-settings";

export const dynamic = "force-dynamic";

export default async function AdminSystemPage() {
  await requireRole(["owner", "admin"]);
  const [settings, locale] = await Promise.all([
    getSystemSettings(),
    getRequestLocale(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={locale === "vi" ? "Quản trị · Hệ thống" : "Admin · System"}
        title={locale === "vi" ? "Cấu hình hệ thống" : "System configuration"}
        description={
          locale === "vi"
            ? "Thương hiệu và giao diện cho toàn bộ không gian làm việc, áp dụng cho mọi trang, màn hình đăng nhập và bảng khách hàng chia sẻ."
            : "Branding and appearance for the whole workspace — applied to every page, the sign-in screen, and shared client boards."
        }
      />

      <SystemSettingsForm
        webTitle={settings.webTitle}
        systemName={settings.systemName}
        accentColor={settings.accentColor}
        logoDarkKey={settings.logoDarkKey}
        logoLightKey={settings.logoLightKey}
        faviconKey={settings.faviconKey}
        sidebarMarkKey={settings.sidebarMarkKey}
        logoDarkUrl={brandingUrl(settings.logoDarkKey, settings.updatedAt)}
        logoLightUrl={brandingUrl(settings.logoLightKey, settings.updatedAt)}
        faviconUrl={brandingUrl(settings.faviconKey, settings.updatedAt)}
        sidebarMarkUrl={brandingUrl(settings.sidebarMarkKey, settings.updatedAt)}
        previewTitle={settings.previewTitle ?? ""}
        previewDescription={settings.previewDescription ?? ""}
        previewImageKey={settings.previewImageKey}
        previewImageUrl={
          brandingUrl(settings.previewImageKey, settings.updatedAt) ??
          PREVIEW_DEFAULTS.image
        }
        previewDefaults={PREVIEW_DEFAULTS}
      />
    </div>
  );
}
