"use client";

import { Translate } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";

import {
  LOCALE_COOKIE,
  type Locale,
  getLocaleFromValue,
} from "@/lib/i18n";

type LanguageToggleProps = {
  locale: Locale;
  className?: string;
};

export function LanguageToggle({ locale, className }: LanguageToggleProps) {
  const router = useRouter();
  const nextLocale = locale === "vi" ? "en" : "vi";
  const label =
    locale === "vi" ? "Switch to English" : "Chuyển sang tiếng Việt";

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={() => {
        const maxAge = 60 * 60 * 24 * 365;
        document.cookie = `${LOCALE_COOKIE}=${getLocaleFromValue(nextLocale)}; path=/; max-age=${maxAge}; samesite=lax`;
        router.refresh();
      }}
      className={className}
    >
      <Translate className="size-4" />
      <span className="sr-only">{label}</span>
    </button>
  );
}
