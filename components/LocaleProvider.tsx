"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  createT,
  DEFAULT_LOCALE,
  getMessages,
  htmlLang,
  LOCALE_COOKIE,
  parseLocale,
  type Locale,
  type Messages,
} from "@/lib/i18n";

interface LocaleContextValue {
  locale: Locale;
  messages: Messages;
  setLocale: (locale: Locale) => void;
  t: ReturnType<typeof createT>;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function readStoredLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  const fromCookie = document.cookie
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${LOCALE_COOKIE}=`))
    ?.split("=")[1];
  if (fromCookie && parseLocale(decodeURIComponent(fromCookie)) !== DEFAULT_LOCALE) {
    return parseLocale(decodeURIComponent(fromCookie));
  }
  const fromStorage = localStorage.getItem(LOCALE_COOKIE);
  return parseLocale(fromStorage);
}

function persistLocale(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(locale)};path=/;max-age=31536000;SameSite=Lax`;
  localStorage.setItem(LOCALE_COOKIE, locale);
  document.documentElement.lang = htmlLang(locale);
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readStoredLocale();
    setLocaleState(stored);
    document.documentElement.lang = htmlLang(stored);
    setReady(true);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    persistLocale(next);
  }, []);

  const value = useMemo(() => {
    const messages = getMessages(locale);
    return {
      locale,
      messages,
      setLocale,
      t: createT(messages),
    };
  }, [locale, setLocale]);

  if (!ready) {
    return (
      <LocaleContext.Provider
        value={{
          locale: DEFAULT_LOCALE,
          messages: getMessages(DEFAULT_LOCALE),
          setLocale,
          t: createT(getMessages(DEFAULT_LOCALE)),
        }}
      >
        {children}
      </LocaleContext.Provider>
    );
  }

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useI18n must be used within LocaleProvider");
  return ctx;
}
