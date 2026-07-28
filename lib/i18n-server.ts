import { cookies } from "next/headers";

import { LOCALE_COOKIE, getLocaleFromValue, type Locale } from "@/lib/i18n";

export async function getRequestLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return getLocaleFromValue(value);
}
