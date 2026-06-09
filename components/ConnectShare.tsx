"use client";

import { useCallback, useState } from "react";
import QRCode from "react-qr-code";
import { useI18n } from "@/components/LocaleProvider";

export default function ConnectShare({
  prompt,
  qrUrl,
  ready,
  compact = false,
  showQr = true,
}: {
  prompt: string;
  qrUrl: string;
  ready: boolean;
  compact?: boolean;
  showQr?: boolean;
}) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    if (!ready) return;
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard may be unavailable */
    }
  }, [prompt, ready]);

  const size = compact ? 88 : 120;

  return (
    <div
      className={`flex flex-col sm:flex-row items-center gap-3 sm:gap-5 ${
        compact ? "mt-2.5" : "mt-3"
      } ${!showQr ? "sm:items-start" : ""}`}
    >
      {showQr && ready && qrUrl ? (
        <div className="flex flex-col items-center gap-1.5 shrink-0">
          <a
            href={qrUrl}
            className="bg-white p-2 rounded-lg block"
            title={qrUrl}
          >
            <QRCode
              value={qrUrl}
              size={size}
              level="M"
              bgColor="#ffffff"
              fgColor="#000000"
            />
          </a>
          <p className="text-evo-gray7 text-[10px] sm:text-xs text-center max-w-[140px] leading-snug">
            {t("connect.qrHint")}
          </p>
        </div>
      ) : null}
      <button
        type="button"
        onClick={copy}
        disabled={!ready}
        className={`evo-btn-secondary px-4 py-2 text-xs sm:text-sm disabled:opacity-50 ${
          showQr ? "w-full sm:w-auto" : "w-full sm:w-auto self-start"
        }`}
      >
        {copied ? t("connect.copied") : t("connect.copy")}
      </button>
    </div>
  );
}
