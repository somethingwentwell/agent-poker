"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "react-qr-code";
import ConnectShare from "@/components/ConnectShare";
import { useI18n } from "@/components/LocaleProvider";
import {
  buildConnectPrompt,
  genAgentName,
  roomConnectUrl,
  sdkUrl,
  skillUrl,
} from "@/lib/connect-cmd";
import { useApiBase } from "@/hooks/useApiBase";
import {
  THOUGHT_LANG_OPTIONS,
  thoughtLangFromLocale,
  type ThoughtLang,
} from "@/lib/thought-lang";

export default function ConnectPrompt({
  roomCode,
  compact = false,
  showQr = true,
}: {
  roomCode: string;
  compact?: boolean;
  showQr?: boolean;
}) {
  const { t, locale } = useI18n();
  const apiBase = useApiBase();
  const ready = Boolean(apiBase);
  const [agentName, setAgentName] = useState<string | null>(null);
  const [thoughtLang, setThoughtLang] = useState<ThoughtLang>("en");
  const [thoughtLangTouched, setThoughtLangTouched] = useState(false);

  useEffect(() => {
    setAgentName(genAgentName());
  }, []);

  useEffect(() => {
    if (!thoughtLangTouched) {
      setThoughtLang(thoughtLangFromLocale(locale));
    }
  }, [locale, thoughtLangTouched]);

  const refreshName = () => setAgentName(genAgentName());

  const thoughtLangLabel = (lang: ThoughtLang) =>
    lang === "en" ? t("connect.thoughtLangEn") : t("connect.thoughtLangZh");

  const thoughtLangPicker = (
    <div
      className={`flex flex-wrap items-center gap-2 ${compact ? "mb-2" : "mb-3"}`}
    >
      <span className="text-[11px] sm:text-xs text-evo-gray5">
        {t("connect.thoughtLangLabel")}
      </span>
      <div
        className="flex rounded-lg border border-evo-gray11/50 bg-black/50 overflow-hidden text-[10px] sm:text-xs"
        role="group"
        aria-label={t("connect.thoughtLangLabel")}
      >
        {THOUGHT_LANG_OPTIONS.map((lang) => (
          <button
            key={lang}
            type="button"
            onClick={() => {
              setThoughtLang(lang);
              setThoughtLangTouched(true);
            }}
            className={`px-2.5 sm:px-3 py-1.5 sm:py-2 transition ${
              thoughtLang === lang
                ? "bg-evo-blue6 text-black font-semibold"
                : "text-evo-gray5 hover:text-evo-gray1 hover:bg-evo-gray11/40"
            }`}
          >
            {thoughtLangLabel(lang)}
          </button>
        ))}
      </div>
    </div>
  );

  const prompt = useMemo(() => {
    if (!ready || !agentName) {
      return `${t("connect.step1", { skillUrl: "…" })}
${t("connect.step2", { sdkUrl: "…" })}
${t("connect.step3")}
${t("connect.stepThoughtLang", { thoughtLang: "…" })}
${t("connect.step4")}

ROOM=${roomCode}
API=…
NAME=…
THOUGHT_LANG=…`;
    }

    const steps = [
      t("connect.step1", { skillUrl: skillUrl(apiBase) }),
      t("connect.step2", { sdkUrl: sdkUrl(apiBase) }),
      t("connect.step3"),
      t("connect.stepThoughtLang", { thoughtLang }),
      t("connect.step4"),
    ];
    return buildConnectPrompt(roomCode, apiBase, agentName, steps, thoughtLang);
  }, [ready, agentName, roomCode, apiBase, t, thoughtLang]);

  const qrUrl = ready ? roomConnectUrl(apiBase, roomCode) : "";
  const qrReady = ready && Boolean(agentName);
  const qrSize = compact ? 96 : 200;

  const shell = compact
    ? "rounded-lg bg-evo-gray11/20 border border-evo-gray11/40 px-3 sm:px-4 py-2.5 sm:py-3"
    : "evo-panel p-4 sm:p-5 mb-5 sm:mb-6";

  const promptBlock = (
    <>
      <pre
        className={`bg-black/50 rounded-lg p-2.5 sm:p-3 text-[11px] sm:text-xs overflow-x-auto text-evo-gray1 break-all whitespace-pre-wrap sm:whitespace-pre leading-relaxed select-text cursor-text ${
          compact ? "" : "min-h-[220px] sm:min-h-[260px]"
        }`}
        suppressHydrationWarning
      >
        {prompt}
      </pre>
      <div className="flex flex-wrap items-center gap-2 mt-2">
        <span className="text-[11px] sm:text-xs text-evo-gray5">
          NAME=
          <span className="text-evo-blue6 font-mono">{agentName ?? "…"}</span>
        </span>
        <button
          type="button"
          onClick={refreshName}
          disabled={!agentName}
          className="evo-btn-ghost px-2.5 py-1 text-[11px] sm:text-xs disabled:opacity-50"
        >
          {t("connect.refreshName")}
        </button>
      </div>
    </>
  );

  const qrBlock =
    showQr && qrReady && qrUrl ? (
      <div className="shrink-0 flex flex-col items-center gap-2 self-stretch">
        <a
          href={qrUrl}
          className="bg-white p-3 sm:p-4 rounded-xl flex items-center justify-center flex-1 min-h-[220px] sm:min-h-[260px] min-w-[220px] sm:min-w-[260px]"
          title={qrUrl}
        >
          <QRCode
            value={qrUrl}
            size={qrSize}
            level="M"
            bgColor="#ffffff"
            fgColor="#000000"
          />
        </a>
        <p className="text-evo-gray7 text-[10px] sm:text-xs text-center max-w-[220px] leading-snug">
          {t("connect.qrHint")}
        </p>
      </div>
    ) : null;

  return (
    <div className={shell}>
      {!compact && (
        <h2 className="font-semibold mb-3 text-evo-gray1 text-base sm:text-lg">
          {t("connect.title")}
        </h2>
      )}
      {compact && (
        <p className="text-evo-gray5 text-xs mb-2">{t("connect.compactTitle")}</p>
      )}

      {thoughtLangPicker}

      {compact ? (
        <>
          {promptBlock}
          <ConnectShare
            prompt={prompt}
            qrUrl={qrUrl}
            ready={qrReady}
            compact
            showQr={showQr}
          />
        </>
      ) : (
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 items-stretch">
          <div className="flex-1 min-w-0 flex flex-col">
            {promptBlock}
            <ConnectShare
              prompt={prompt}
              qrUrl={qrUrl}
              ready={qrReady}
              showQr={false}
            />
          </div>
          {qrBlock}
        </div>
      )}
    </div>
  );
}
