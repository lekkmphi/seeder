"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleNotch, FloppyDisk, UploadSimple } from "@phosphor-icons/react";

import { PROJECT_SWATCHES } from "@/lib/swatches";
import { toast } from "@/lib/toast";
import { useLocale } from "@/lib/use-locale";
import { cn } from "@/lib/utils";

type SystemSettingsFormProps = {
  webTitle: string;
  systemName: string;
  accentColor: string;
  logoDarkKey: string | null;
  logoLightKey: string | null;
  faviconKey: string | null;
  sidebarMarkKey: string | null;
  logoDarkUrl: string | null;
  logoLightUrl: string | null;
  faviconUrl: string | null;
  sidebarMarkUrl: string | null;
  previewTitle: string;
  previewDescription: string;
  previewImageKey: string | null;
  previewImageUrl: string | null;
  previewDefaults: { title: string; description: string; image: string };
};

type BrandingKind =
  | "logo-dark"
  | "logo-light"
  | "favicon"
  | "sidebar-mark"
  | "preview-image";

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const ACCEPT = "image/png,image/jpeg,image/webp";
const DEFAULT_ACCENT = "#10b981";

async function uploadBranding(kind: BrandingKind, file: File) {
  const formData = new FormData();
  formData.set("file", file);
  formData.set("kind", kind);
  const res = await fetch("/api/admin/system/branding", {
    method: "POST",
    body: formData,
  });
  const data = (await res.json().catch(() => ({}))) as {
    key?: string;
    url?: string;
    error?: string;
  };
  if (!res.ok || !data.key || !data.url) {
    throw new Error(data.error || "Upload failed");
  }
  return { key: data.key, url: data.url };
}

export function SystemSettingsForm({
  webTitle: initialWebTitle,
  systemName: initialSystemName,
  accentColor: initialAccent,
  logoDarkKey: initialLogoDarkKey,
  logoLightKey: initialLogoLightKey,
  faviconKey: initialFaviconKey,
  sidebarMarkKey: initialSidebarMarkKey,
  logoDarkUrl,
  logoLightUrl,
  faviconUrl,
  sidebarMarkUrl,
  previewTitle: initialPreviewTitle,
  previewDescription: initialPreviewDescription,
  previewImageKey: initialPreviewImageKey,
  previewImageUrl,
  previewDefaults,
}: SystemSettingsFormProps) {
  const locale = useLocale();
  const router = useRouter();

  const [webTitle, setWebTitle] = useState(initialWebTitle);
  const [systemName, setSystemName] = useState(initialSystemName);
  const [accent, setAccent] = useState(initialAccent);

  const [logoDarkKey, setLogoDarkKey] = useState(initialLogoDarkKey);
  const [logoLightKey, setLogoLightKey] = useState(initialLogoLightKey);
  const [faviconKey, setFaviconKey] = useState(initialFaviconKey);
  const [sidebarMarkKey, setSidebarMarkKey] = useState(initialSidebarMarkKey);

  const [logoDarkPreview, setLogoDarkPreview] = useState(logoDarkUrl);
  const [logoLightPreview, setLogoLightPreview] = useState(logoLightUrl);
  const [faviconPreview, setFaviconPreview] = useState(faviconUrl);
  const [sidebarMarkPreview, setSidebarMarkPreview] = useState(sidebarMarkUrl);

  const [previewTitle, setPreviewTitle] = useState(initialPreviewTitle);
  const [previewDescription, setPreviewDescription] = useState(
    initialPreviewDescription,
  );
  const [previewImageKey, setPreviewImageKey] = useState(initialPreviewImageKey);
  const [previewImagePreview, setPreviewImagePreview] =
    useState(previewImageUrl);

  const [uploading, setUploading] = useState<BrandingKind | null>(null);
  const [saving, setSaving] = useState(false);
  const previewImageRef = useRef<HTMLInputElement>(null);

  const accentValid = HEX_RE.test(accent);
  const accentSafe = accentValid ? accent : DEFAULT_ACCENT;
  const busy = saving || uploading !== null;

  const SETTERS: Record<
    BrandingKind,
    [(v: string | null) => void, (v: string | null) => void]
  > = {
    "logo-dark": [setLogoDarkKey, setLogoDarkPreview],
    "logo-light": [setLogoLightKey, setLogoLightPreview],
    favicon: [setFaviconKey, setFaviconPreview],
    "sidebar-mark": [setSidebarMarkKey, setSidebarMarkPreview],
    "preview-image": [setPreviewImageKey, setPreviewImagePreview],
  };

  async function handleFile(kind: BrandingKind, file: File) {
    setUploading(kind);
    try {
      const { key, url } = await uploadBranding(kind, file);
      const [setKey, setPreview] = SETTERS[kind];
      setKey(key);
      setPreview(url);
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : locale === "vi" ? "Tải lên thất bại" : "Upload failed",
        "danger",
      );
    } finally {
      setUploading(null);
    }
  }

  function clearAsset(kind: BrandingKind) {
    const [setKey, setPreview] = SETTERS[kind];
    setKey(null);
    setPreview(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (!accentValid) {
      toast(
        locale === "vi"
          ? "Màu nhấn phải là mã hex #rrggbb."
          : "Accent must be a #rrggbb hex color.",
        "danger",
      );
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/system", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webTitle,
          systemName,
          accentColor: accent,
          logoDarkKey: logoDarkKey ?? "",
          logoLightKey: logoLightKey ?? "",
          faviconKey: faviconKey ?? "",
          sidebarMarkKey: sidebarMarkKey ?? "",
          previewTitle: previewTitle.trim(),
          previewDescription: previewDescription.trim(),
          previewImageKey: previewImageKey ?? "",
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || (locale === "vi" ? "Lưu thất bại" : "Save failed"));
      toast(locale === "vi" ? "Đã lưu cài đặt hệ thống" : "System settings saved", "success");
      router.refresh();
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

  const previewStyle = {
    ["--accent" as string]: accentSafe,
    ["--accent-strong" as string]: accentSafe,
    ["--accent-soft" as string]: `color-mix(in srgb, ${accentSafe} 16%, transparent)`,
    ["--ring" as string]: `color-mix(in srgb, ${accentSafe} 45%, transparent)`,
    ["--brand" as string]: accentSafe,
  } as React.CSSProperties;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Identity */}
      <section className="ui-panel p-5 sm:p-6">
        <header className="mb-4">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.04em] text-muted">
            {locale === "vi" ? "Định danh" : "Identity"}
          </p>
          <h2 className="mt-2 text-[17px] font-medium tracking-[-0.022em] text-foreground">
            {locale === "vi" ? "Tên gọi" : "Names"}
          </h2>
        </header>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5">
            <span className="text-[13px] font-medium text-foreground">
              {locale === "vi" ? "Tiêu đề web" : "Web title"}
            </span>
            <input
              className="ui-input"
              value={webTitle}
              maxLength={80}
              onChange={(e) => setWebTitle(e.target.value)}
              placeholder="Seeder"
            />
            <span className="text-[12px] leading-5 text-muted">
              {locale === "vi"
                ? "Hiển thị trên tab trình duyệt và dấu trang."
                : "Shown in the browser tab and bookmarks."}
            </span>
          </label>
          <label className="grid gap-1.5">
            <span className="text-[13px] font-medium text-foreground">
              {locale === "vi" ? "Tên hệ thống" : "System name"}
            </span>
            <input
              className="ui-input"
              value={systemName}
              maxLength={60}
              onChange={(e) => setSystemName(e.target.value)}
              placeholder="Seeder"
            />
            <span className="text-[12px] leading-5 text-muted">
              {locale === "vi"
                ? "Tên thương hiệu dùng trong sidebar, màn hình đăng nhập và các bản xuất."
                : "The brand name used across the sidebar, sign-in screen, and exports."}
            </span>
          </label>
        </div>
      </section>

      {/* Appearance */}
      <section className="ui-panel p-5 sm:p-6">
        <header className="mb-4">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.04em] text-muted">
            {locale === "vi" ? "Giao diện" : "Appearance"}
          </p>
          <h2 className="mt-2 text-[17px] font-medium tracking-[-0.022em] text-foreground">
            {locale === "vi" ? "Màu nhấn" : "Accent color"}
          </h2>
          <p className="mt-1 text-[13px] leading-6 text-muted">
            {locale === "vi"
              ? "Một màu sẽ phủ sắc lại toàn bộ UI: sidebar, nút, liên kết và viền focus ở cả chế độ tối và sáng."
              : "One color re-tints the whole UI — sidebar, buttons, links, and focus rings — in both dark and light mode."}
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,18rem)]">
          <div className="grid gap-3">
            <div className="flex items-center gap-3">
              <input
                type="color"
                aria-label={locale === "vi" ? "Màu nhấn" : "Accent color"}
                value={accentValid ? accent : DEFAULT_ACCENT}
                onChange={(e) => setAccent(e.target.value)}
                className="size-10 cursor-pointer rounded-md border border-border bg-background p-1"
              />
              <input
                className={cn("ui-input max-w-40 font-mono", !accentValid && "border-danger")}
                value={accent}
                onChange={(e) => setAccent(e.target.value.trim())}
                placeholder="#10b981"
                aria-invalid={!accentValid}
              />
              {!accentValid ? (
                <span className="text-[12px] text-danger">
                  {locale === "vi" ? "Dùng #rrggbb" : "Use #rrggbb"}
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {PROJECT_SWATCHES.map((swatch) => (
                <button
                  key={swatch.value}
                  type="button"
                  aria-label={swatch.label}
                  onClick={() => setAccent(swatch.value)}
                  className={cn(
                    "size-6 rounded-md border transition",
                    accent.toLowerCase() === swatch.value.toLowerCase()
                      ? "border-foreground"
                      : "border-border hover:border-border-strong",
                  )}
                  style={{ backgroundColor: swatch.value }}
                />
              ))}
            </div>
          </div>

          {/* Live preview */}
          <div
            style={previewStyle}
            className="grid gap-3 rounded-md border border-border bg-surface p-4"
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.04em] text-muted">
              {locale === "vi" ? "Xem trước" : "Preview"}
            </p>
            <div className="flex items-center gap-2">
              <span
                className="inline-block size-5 rounded-full"
                style={{ backgroundColor: accentSafe }}
              />
              <span className="text-[13px] font-medium text-foreground">
                {systemName || "Seeder"}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className="ui-button-primary px-3" disabled>
                {locale === "vi" ? "Chính" : "Primary"}
              </button>
              <span
                className="inline-flex items-center rounded-md border px-2 py-1 text-[12px]"
                style={{
                  borderColor: `color-mix(in srgb, ${accentSafe} 40%, transparent)`,
                  backgroundColor: `color-mix(in srgb, ${accentSafe} 14%, transparent)`,
                  color: accentSafe,
                }}
              >
                {locale === "vi" ? "Nhãn màu nhấn" : "Accent badge"}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Logos */}
      <section className="ui-panel p-5 sm:p-6">
        <header className="mb-4">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.04em] text-muted">
            {locale === "vi" ? "Thương hiệu" : "Branding"}
          </p>
          <h2 className="mt-2 text-[17px] font-medium tracking-[-0.022em] text-foreground">
            {locale === "vi" ? "Logo sidebar" : "Sidebar logo"}
          </h2>
          <p className="mt-1 text-[13px] leading-6 text-muted">
            {locale === "vi"
              ? "Ảnh riêng cho chế độ tối và sáng. Để trống để dùng logo mặc định. PNG, JPEG hoặc WebP tối đa 5 MB."
              : "Separate images for dark and light mode. Leave empty to use the bundled logo. PNG, JPEG, or WebP up to 5 MB."}
          </p>
        </header>

        <div className="grid gap-5 sm:grid-cols-2">
          <LogoField
            label={locale === "vi" ? "Logo chế độ tối" : "Dark mode logo"}
            kind="logo-dark"
            previewUrl={logoDarkPreview}
            fallbackSrc="/dark-logo.png"
            backdrop="dark"
            uploading={uploading === "logo-dark"}
            disabled={busy}
            onFile={handleFile}
            onClear={() => clearAsset("logo-dark")}
            cleared={!logoDarkKey}
          />
          <LogoField
            label={locale === "vi" ? "Logo chế độ sáng" : "Light mode logo"}
            kind="logo-light"
            previewUrl={logoLightPreview}
            fallbackSrc="/light-logo.png"
            backdrop="light"
            uploading={uploading === "logo-light"}
            disabled={busy}
            onFile={handleFile}
            onClear={() => clearAsset("logo-light")}
            cleared={!logoLightKey}
          />
        </div>

        <div className="mt-5 border-t border-border pt-5">
          <span className="text-[13px] font-medium text-foreground">
            {locale === "vi" ? "Biểu tượng thu gọn" : "Collapsed icon"}
          </span>
          <p className="mb-3 mt-1 text-[12px] leading-5 text-muted">
            {locale === "vi"
              ? "Dấu vuông tỉ lệ 1:1 hiển thị khi sidebar được thu gọn. Để trống để dùng biểu tượng mặc định."
              : "A square 1:1 mark shown when the sidebar is collapsed to a rail. Leave empty to use the bundled mark."}
          </p>
          <SquareField
            kind="sidebar-mark"
            previewUrl={sidebarMarkPreview}
            fallbackSrc="/seeder-mark.svg"
            alt={locale === "vi" ? "Xem trước biểu tượng sidebar thu gọn" : "Collapsed sidebar icon preview"}
            uploading={uploading === "sidebar-mark"}
            disabled={busy}
            onFile={handleFile}
            onClear={() => clearAsset("sidebar-mark")}
            cleared={!sidebarMarkKey}
          />
        </div>
      </section>

      {/* Favicon */}
      <section className="ui-panel p-5 sm:p-6">
        <header className="mb-4">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.04em] text-muted">
            {locale === "vi" ? "Thương hiệu" : "Branding"}
          </p>
          <h2 className="mt-2 text-[17px] font-medium tracking-[-0.022em] text-foreground">
            {locale === "vi" ? "Favicon" : "Favicon"}
          </h2>
          <p className="mt-1 text-[13px] leading-6 text-muted">
            {locale === "vi"
              ? "Biểu tượng vuông cho tab trình duyệt. PNG hoặc WebP, 32x32 hoặc lớn hơn."
              : "A square icon for the browser tab. PNG or WebP, 32×32 or larger."}
          </p>
        </header>

        <SquareField
          kind="favicon"
          previewUrl={faviconPreview}
          fallbackSrc="/favicon.ico"
          alt={locale === "vi" ? "Xem trước favicon" : "Favicon preview"}
          uploading={uploading === "favicon"}
          disabled={busy}
          onFile={handleFile}
          onClear={() => clearAsset("favicon")}
          cleared={!faviconKey}
        />
      </section>

      {/* Web preview (Open Graph / link card) */}
      <section className="ui-panel p-5 sm:p-6">
        <header className="mb-4">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.04em] text-muted">
            {locale === "vi" ? "Chia sẻ" : "Sharing"}
          </p>
          <h2 className="mt-2 text-[17px] font-medium tracking-[-0.022em] text-foreground">
            {locale === "vi" ? "Xem trước web" : "Web preview"}
          </h2>
          <p className="mt-1 text-[13px] leading-6 text-muted">
            {locale === "vi"
              ? "Thẻ hiển thị khi liên kết ứng dụng được chia sẻ trên Slack, X, Discord hoặc iMessage. Để trống để dùng mặc định của Seeder."
              : "The card shown when a link to your app is shared on Slack, X, Discord, or iMessage. Leave a field empty to use the bundled Seeder default."}
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
          <div className="grid content-start gap-4">
            <label className="grid gap-1.5">
              <span className="text-[13px] font-medium text-foreground">
                {locale === "vi" ? "Tiêu đề xem trước" : "Preview title"}
              </span>
              <input
                className="ui-input"
                value={previewTitle}
                maxLength={120}
                onChange={(e) => setPreviewTitle(e.target.value)}
                placeholder={previewDefaults.title}
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-[13px] font-medium text-foreground">
                {locale === "vi" ? "Mô tả xem trước" : "Preview description"}
              </span>
              <textarea
                className="ui-input min-h-20 resize-y py-2"
                value={previewDescription}
                maxLength={300}
                onChange={(e) => setPreviewDescription(e.target.value)}
                placeholder={previewDefaults.description}
              />
            </label>
            <div className="grid gap-2">
              <span className="text-[13px] font-medium text-foreground">
                {locale === "vi" ? "Ảnh xem trước" : "Preview image"}
              </span>
              <p className="text-[12px] leading-5 text-muted">
                {locale === "vi"
                  ? "Ảnh thẻ 1200x630. PNG, JPEG hoặc WebP tối đa 5 MB. Để trống để dùng mặc định."
                  : "A 1200×630 card image. PNG, JPEG, or WebP up to 5 MB. Leave empty for the bundled default."}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => previewImageRef.current?.click()}
                  className="ui-button-secondary px-3 disabled:opacity-60"
                >
                  {uploading === "preview-image" ? (
                    <CircleNotch className="size-4 animate-spin" />
                  ) : (
                    <UploadSimple className="size-4" />
                  )}
                  {uploading === "preview-image"
                    ? locale === "vi" ? "Đang tải lên..." : "Uploading..."
                    : locale === "vi" ? "Tải ảnh lên" : "Upload image"}
                </button>
                {previewImageKey ? (
                  <button
                    type="button"
                    onClick={() => clearAsset("preview-image")}
                    className="ui-button-ghost px-2 text-[12px]"
                  >
                    {locale === "vi" ? "Dùng mặc định" : "Use default"}
                  </button>
                ) : null}
                <input
                  ref={previewImageRef}
                  type="file"
                  accept={ACCEPT}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile("preview-image", file);
                    if (previewImageRef.current)
                      previewImageRef.current.value = "";
                  }}
                />
              </div>
            </div>
          </div>

          {/* Live link-preview card */}
          <div className="grid gap-2">
            <p className="font-mono text-[11px] uppercase tracking-[0.04em] text-muted">
              {locale === "vi" ? "Xem trước" : "Preview"}
            </p>
            <div className="overflow-hidden rounded-md border border-border bg-surface">
              <div className="border-l-2 border-l-emerald p-4">
                <p className="text-[12px] text-muted">{systemName || "Seeder"}</p>
                <p className="mt-1 text-[15px] font-semibold leading-snug text-accent">
                  {previewTitle.trim() || previewDefaults.title}
                </p>
                <p className="mt-1.5 line-clamp-3 text-[13px] leading-6 text-foreground">
                  {previewDescription.trim() || previewDefaults.description}
                </p>
                <div className="mt-3 overflow-hidden rounded-md border border-border bg-background">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewImagePreview ?? previewDefaults.image}
                    alt={locale === "vi" ? "Xem trước liên kết" : "Link preview"}
                    className="aspect-[1200/630] w-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Save */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="submit"
          disabled={busy || !accentValid}
          className="ui-button-primary px-4 disabled:opacity-60"
        >
          {saving ? (
            <CircleNotch className="size-4 animate-spin" />
          ) : (
            <FloppyDisk className="size-4" />
          )}
          {saving
            ? locale === "vi" ? "Đang lưu..." : "Saving..."
            : locale === "vi" ? "Lưu thay đổi" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

function LogoField({
  label,
  kind,
  previewUrl,
  fallbackSrc,
  backdrop,
  uploading,
  disabled,
  cleared,
  onFile,
  onClear,
}: {
  label: string;
  kind: BrandingKind;
  previewUrl: string | null;
  fallbackSrc: string;
  backdrop: "dark" | "light";
  uploading: boolean;
  disabled: boolean;
  cleared: boolean;
  onFile: (kind: BrandingKind, file: File) => void;
  onClear: () => void;
}) {
  const locale = useLocale();
  const fileRef = useRef<HTMLInputElement>(null);
  const src = previewUrl ?? fallbackSrc;

  return (
    <div className="grid gap-2">
      <span className="text-[13px] font-medium text-foreground">{label}</span>
      <div
        className={cn(
          "flex min-h-20 items-center justify-center rounded-md border border-border p-4",
          backdrop === "dark" ? "bg-[#03150f]" : "bg-white",
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={
            locale === "vi" ? `Xem trước ${label}` : `${label} preview`
          }
          className="h-9 w-auto"
        />
      </div>
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(kind, file);
          if (fileRef.current) fileRef.current.value = "";
        }}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => fileRef.current?.click()}
          className="ui-button-secondary px-3 disabled:opacity-60"
        >
          {uploading ? (
            <CircleNotch className="size-4 animate-spin" />
          ) : (
            <UploadSimple className="size-4" />
          )}
          {uploading
            ? locale === "vi" ? "Đang tải lên..." : "Uploading..."
            : locale === "vi" ? "Tải lên" : "Upload"}
        </button>
        {!cleared ? (
          <button
            type="button"
            onClick={onClear}
            className="ui-button-ghost px-2 text-[12px]"
          >
            {locale === "vi" ? "Dùng mặc định" : "Use default"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function SquareField({
  kind,
  previewUrl,
  fallbackSrc,
  alt,
  uploading,
  disabled,
  cleared,
  onFile,
  onClear,
}: {
  kind: BrandingKind;
  previewUrl: string | null;
  fallbackSrc: string;
  alt: string;
  uploading: boolean;
  disabled: boolean;
  cleared: boolean;
  onFile: (kind: BrandingKind, file: File) => void;
  onClear: () => void;
}) {
  const locale = useLocale();
  const fileRef = useRef<HTMLInputElement>(null);
  const src = previewUrl ?? fallbackSrc;

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex size-12 items-center justify-center rounded-md border border-border bg-surface p-1.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="size-full object-contain" />
      </div>
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(kind, file);
          if (fileRef.current) fileRef.current.value = "";
        }}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => fileRef.current?.click()}
          className="ui-button-secondary px-3 disabled:opacity-60"
        >
          {uploading ? (
            <CircleNotch className="size-4 animate-spin" />
          ) : (
            <UploadSimple className="size-4" />
          )}
          {uploading
            ? locale === "vi" ? "Đang tải lên..." : "Uploading..."
            : locale === "vi" ? "Tải lên" : "Upload"}
        </button>
        {!cleared ? (
          <button
            type="button"
            onClick={onClear}
            className="ui-button-ghost px-2 text-[12px]"
          >
            {locale === "vi" ? "Dùng mặc định" : "Use default"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
