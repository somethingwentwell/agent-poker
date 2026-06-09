import type { Locale } from "./i18n";

export type ThoughtLang = "en" | "zh";

export const THOUGHT_LANG_OPTIONS: ThoughtLang[] = ["en", "zh"];

export function thoughtLangFromLocale(locale: Locale): ThoughtLang {
  return locale === "en" ? "en" : "zh";
}
