"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/components/LocaleProvider";
import { buildReplayView, type HistoryData } from "@/lib/replay-view";
import Felt from "./Felt";

export default function ReplayBar({
  code,
  data: initialData,
}: {
  code?: string;
  data?: HistoryData | null;
}) {
  const { t } = useI18n();
  const [data, setData] = useState<HistoryData | null>(initialData ?? null);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (initialData) {
      setData(initialData);
      setStep(0);
      setPlaying(false);
      return;
    }
    if (!code) return;
    fetch(`/api/rooms/${code}/history`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, [code, initialData]);

  const steps = data?.history ?? [];

  useEffect(() => {
    if (!playing) return;
    if (step >= steps.length - 1) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(
      () => setStep((s) => Math.min(s + 1, steps.length - 1)),
      700,
    );
    return () => clearTimeout(timer);
  }, [playing, step, steps.length]);

  const view = useMemo(() => {
    if (!data) return null;
    return buildReplayView(data, step, t("replay.handLabel"));
  }, [data, step, t]);

  if (!data) return <div className="text-evo-gray5">{t("replay.loading")}</div>;
  if (steps.length === 0)
    return <div className="text-evo-gray5">{t("replay.empty")}</div>;

  const cur = steps[step];

  return (
    <div className="space-y-3 sm:space-y-4">
      <Felt
        players={view?.players ?? []}
        board={view?.board ?? []}
        pot={view?.pot ?? 0}
        winners={view?.winners}
        centerLabel={view?.centerLabel}
      />

      <div className="evo-panel p-3 sm:p-4">
        <div className="flex items-center gap-1.5 sm:gap-3 mb-3 flex-wrap">
          <button
            onClick={() => setStep(0)}
            className="evo-btn-ghost px-2.5 sm:px-3 py-2 text-sm"
            aria-label="First"
          >
            ⏮
          </button>
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="evo-btn-ghost px-2.5 sm:px-3 py-2 text-xs sm:text-sm"
          >
            {t("replay.prev")}
          </button>
          <button
            onClick={() => setPlaying((p) => !p)}
            className="evo-btn-primary px-3 sm:px-4 py-2 text-xs sm:text-sm flex-1 sm:flex-none min-w-[4.5rem]"
          >
            {playing ? t("replay.pause") : t("replay.play")}
          </button>
          <button
            onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
            className="evo-btn-ghost px-2.5 sm:px-3 py-2 text-xs sm:text-sm"
          >
            {t("replay.next")}
          </button>
          <button
            onClick={() => setStep(steps.length - 1)}
            className="evo-btn-ghost px-2.5 sm:px-3 py-2 text-sm"
            aria-label="Last"
          >
            ⏭
          </button>
          <span className="w-full sm:w-auto sm:ml-auto text-center sm:text-right text-xs sm:text-sm text-evo-gray5 pt-1 sm:pt-0">
            {t("replay.step", { current: step + 1, total: steps.length })}
          </span>
        </div>

        <input
          type="range"
          min={0}
          max={steps.length - 1}
          value={step}
          onChange={(e) => setStep(Number(e.target.value))}
          className="w-full accent-evo-blue6 h-8 sm:h-auto touch-manipulation"
        />

        <div className="mt-2 sm:mt-3 text-xs sm:text-sm text-evo-gray1 break-words">
          <span className="text-evo-blue6 font-semibold">
            {t("replay.handLabel")}
            {cur.handNo}
          </span>{" "}
          <span className="text-evo-gray5">[{cur.street}]</span>{" "}
          <span>{cur.note}</span>
          {cur.thought && (
            <p className="mt-2 text-evo-gray5 border-l-2 border-evo-blue6/50 pl-3">
              <span className="text-evo-blue6 font-medium not-italic">
                {t("replay.thought")}:
              </span>{" "}
              <span className="italic">{cur.thought}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
