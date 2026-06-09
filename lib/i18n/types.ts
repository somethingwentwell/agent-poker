export type Locale = "en" | "zh-CN" | "zh-TW";

export const LOCALES: { id: Locale; label: string }[] = [
  { id: "en", label: "EN" },
  { id: "zh-CN", label: "简体" },
  { id: "zh-TW", label: "繁體" },
];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "agentpoker_locale";

export type MessageValue = string | MessageTree;
export interface MessageTree {
  [key: string]: MessageValue;
}
