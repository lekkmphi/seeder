"use client";

import { useSyncExternalStore } from "react";

import { LOCALE_COOKIE, getLocaleFromValue, type Locale } from "@/lib/i18n";

function readCookieLocale(): Locale {
  if (typeof document === "undefined") return "vi";
  const value = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${LOCALE_COOKIE}=`))
    ?.split("=")[1];
  return getLocaleFromValue(value ? decodeURIComponent(value) : undefined);
}

function subscribe(callback: () => void) {
  window.addEventListener("focus", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("focus", callback);
    window.removeEventListener("storage", callback);
  };
}

export function useLocale() {
  return useSyncExternalStore<Locale>(subscribe, readCookieLocale, () => "vi");
}
