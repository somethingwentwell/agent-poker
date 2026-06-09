"use client";

import { LOCALES } from "@/lib/i18n";
import { useI18n } from "@/components/LocaleProvider";

export default function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

  return (
    <div
      className="flex rounded-lg border border-evo-gray11/50 bg-black/50 backdrop-blur-sm overflow-hidden text-[10px] sm:text-xs"
      role="group"
      aria-label="Language"
    >
      {LOCALES.map((l) => (
        <button
          key={l.id}
          type="button"
          onClick={() => setLocale(l.id)}
          className={`px-2 sm:px-2.5 py-2 sm:py-1.5 min-h-9 sm:min-h-0 transition ${
            locale === l.id
              ? "bg-evo-blue6 text-black font-semibold"
              : "text-evo-gray5 hover:text-evo-gray1 hover:bg-evo-gray11/40"
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
