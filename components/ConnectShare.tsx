"use client";

import { useCallback, useState } from "react";
import QRCode from "react-qr-code";
import { useI18n } from "@/components/LocaleProvider";
import { copyText } from "@/lib/copy-text";

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
  const [failed, setFailed] = useState(false);

  const copy = useCallback(async () => {
    if (!ready) return;
    setFailed(false);
    const ok = await copyText(prompt);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return;
    }
    setFailed(true);
    setTimeout(() => setFailed(false), 3000);
  }, [prompt, ready]);

  const size = compact ? 88 : 120;

  const label = copied
    ? t("connect.copied")
    : failed
      ? t("connect.copyFailed")
      : t("connect.copy");

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
        aria-live="polite"
        className={`evo-btn-secondary px-4 py-2 text-xs sm:text-sm disabled:opacity-50 ${
          showQr ? "w-full sm:w-auto" : "w-full sm:w-auto self-start"
        } ${failed ? "border-evo-red/60 text-evo-red" : ""}`}
      >
        {label}
      </button>
    </div>
  );
}
