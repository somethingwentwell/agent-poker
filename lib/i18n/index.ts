import en, { type Messages } from "./messages/en";
import zhCN from "./messages/zh-CN";
import zhTW from "./messages/zh-TW";
import {
  DEFAULT_LOCALE,
  type Locale,
  LOCALE_COOKIE,
  LOCALES,
} from "./types";

export { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALES, type Locale, type Messages };

const catalogs: Record<Locale, Messages> = {
  en,
  "zh-CN": zhCN,
  "zh-TW": zhTW,
};

export function isLocale(value: string): value is Locale {
  return value === "en" || value === "zh-CN" || value === "zh-TW";
}

export function getMessages(locale: Locale): Messages {
  return catalogs[locale] ?? catalogs[DEFAULT_LOCALE];
}

export function parseLocale(value: string | null | undefined): Locale {
  if (value && isLocale(value)) return value;
  return DEFAULT_LOCALE;
}

export function localeFromCookie(
  cookieHeader: string | null | undefined,
): Locale {
  if (!cookieHeader) return DEFAULT_LOCALE;
  const match = cookieHeader
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${LOCALE_COOKIE}=`));
  if (!match) return DEFAULT_LOCALE;
  return parseLocale(decodeURIComponent(match.split("=")[1] ?? ""));
}

type Vars = Record<string, string | number>;

function getPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

export function createT(messages: Messages) {
  return function t(path: string, vars?: Vars): string {
    const value = getPath(messages, path);
    if (typeof value !== "string") return path;
    if (!vars) return value;
    return value.replace(/\{(\w+)\}/g, (_, key: string) =>
      vars[key] !== undefined ? String(vars[key]) : `{${key}}`,
    );
  };
}

export function htmlLang(locale: Locale): string {
  if (locale === "zh-CN") return "zh-Hans";
  if (locale === "zh-TW") return "zh-Hant";
  return "en";
}
