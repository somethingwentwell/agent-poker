"use client";

import {
  useEffect,
  useMemo,
  useRef,
  type KeyboardEvent,
} from "react";
import { useI18n } from "@/components/LocaleProvider";
import {
  activeThoughtEntry,
  buildChatLines,
  formatChatTs,
  type ChatLine,
} from "@/lib/chat-lines";
import type { HistoryData } from "@/lib/replay-view";

export default function GameChat({
  historyData,
  scrubStep,
  onScrubStep,
  scrubPlaying,
  onScrubPlaying,
  liveStep,
  canGoLive,
}: {
  historyData: HistoryData | null;
  scrubStep: number | null;
  onScrubStep: (step: number | null) => void;
  scrubPlaying: boolean;
  onScrubPlaying: (playing: boolean) => void;
  liveStep: number;
  canGoLive: boolean;
}) {
  const { t, messages } = useI18n();
  const scrollRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const prevCount = useRef(0);
  const isLive = scrubStep === null;

  const handName = (name?: string) => {
    if (!name) return "";
    const map = messages.contract.handNames as Record<string, string>;
    const translated = map[name];
    return translated ? ` (${translated})` : ` (${name})`;
  };

  const lines = useMemo(() => {
    if (!historyData) return [];
    return buildChatLines(historyData, t, handName);
  }, [historyData, t, messages]);

  const activeThought = useMemo(() => {
    if (!historyData) return null;
    return activeThoughtEntry(historyData, scrubStep);
  }, [historyData, scrubStep]);

  useEffect(() => {
    if (!isLive) return;
    if (lines.length <= prevCount.current) return;
    prevCount.current = lines.length;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length, isLive]);

  useEffect(() => {
    if (scrubStep === null) return;
    const el = lineRefs.current.get(scrubStep);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [scrubStep]);

  const selectStep = (step: number) => {
    onScrubPlaying(false);
    onScrubStep(step);
  };

  const goLive = () => {
    onScrubPlaying(false);
    onScrubStep(null);
  };

  const stepBack = () => {
    if (scrubStep === null) return;
    onScrubPlaying(false);
    onScrubStep(Math.max(0, scrubStep - 1));
  };

  const stepForward = () => {
    onScrubPlaying(false);
    if (scrubStep === null) {
      onScrubStep(Math.max(0, liveStep));
      return;
    }
    onScrubStep(Math.min(liveStep, scrubStep + 1));
  };

  const setLineRef = (step: number, el: HTMLDivElement | null) => {
    if (el) lineRefs.current.set(step, el);
    else lineRefs.current.delete(step);
  };

  const renderThought = (thought: string, compact = false) => (
    <p
      className={`text-evo-gray5 border-l-2 border-evo-blue6/50 pl-2.5 break-words ${
        compact
          ? "mt-1 text-[11px] sm:text-xs"
          : "text-xs sm:text-sm leading-relaxed"
      }`}
    >
      <span className="text-evo-blue6 font-medium not-italic">
        {t("chat.thought")}:
      </span>{" "}
      <span className="italic">{thought}</span>
    </p>
  );

  const renderLine = (line: ChatLine) => {
    const selected = scrubStep === line.step;
    const ts = formatChatTs(line.ts);
    const clickProps = {
      role: "button" as const,
      tabIndex: 0,
      onClick: () => selectStep(line.step),
      onKeyDown: (e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          selectStep(line.step);
        }
      },
    };
    const base =
      "rounded-lg px-2 py-1.5 cursor-pointer transition border border-transparent hover:border-evo-blue6/30 hover:bg-evo-gray11/25";
    const selectedCls = selected
      ? "border-evo-blue6/50 bg-evo-blue6/10"
      : "";

    if (line.kind === "system") {
      return (
        <div
          key={line.step}
          ref={(el) => setLineRef(line.step, el)}
          className={`${base} ${selectedCls} text-center`}
          {...clickProps}
        >
          {ts && (
            <span className="text-[10px] text-evo-gray9 block mb-0.5">
              {ts}
            </span>
          )}
          <p className="text-[10px] sm:text-xs text-evo-gray5">
            <span className="text-evo-gray9">
              {t("chat.handLabel")}
              {line.handNo}
            </span>{" "}
            · {line.text}
          </p>
        </div>
      );
    }

    if (line.kind === "win") {
      return (
        <div
          key={line.step}
          ref={(el) => setLineRef(line.step, el)}
          className={`${base} ${selectedCls} bg-evo-yellow/10 border-evo-yellow/20 hover:border-evo-yellow/40`}
          {...clickProps}
        >
          {ts && (
            <span className="text-[10px] text-evo-yellow/70 block mb-0.5">
              {ts}
            </span>
          )}
          <p className="text-xs sm:text-sm text-evo-yellow">
            <span className="mr-1" aria-hidden>
              🏆
            </span>
            <span className="font-semibold">{line.text}</span>
          </p>
        </div>
      );
    }

    return (
      <div
        key={line.step}
        ref={(el) => setLineRef(line.step, el)}
        className={`${base} ${selectedCls}`}
        {...clickProps}
      >
        <p className="text-xs sm:text-sm text-evo-gray1 break-words">
          {ts && (
            <span className="text-[10px] text-evo-gray9 mr-1.5">{ts}</span>
          )}
          <span className="text-evo-gray5 text-[10px] sm:text-xs mr-1">
            #{line.handNo}
          </span>
          <span className="text-evo-blue6 font-semibold">{line.playerName}</span>{" "}
          <span>{line.text}</span>
        </p>
        {line.thought && renderThought(line.thought, true)}
      </div>
    );
  };

  return (
    <div className="evo-panel flex flex-col w-full h-full min-h-[200px] lg:min-h-0">
      <div className="px-3 sm:px-4 py-2 border-b border-evo-gray11/40 shrink-0 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs sm:text-sm font-semibold text-evo-gray1">
            {t("chat.title")}
          </h2>
          {isLive ? (
            <span className="text-[10px] uppercase tracking-wide text-evo-green font-semibold">
              {t("chat.live")}
            </span>
          ) : (
            <span className="text-[10px] uppercase tracking-wide text-evo-blue6 font-semibold">
              {t("chat.reviewing")}
            </span>
          )}
        </div>

        {!isLive && (
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={stepBack}
              disabled={scrubStep === 0}
              className="evo-btn-ghost px-2 py-1 text-[11px] sm:text-xs disabled:opacity-40"
            >
              {t("replay.prev")}
            </button>
            <button
              type="button"
              onClick={() => onScrubPlaying(!scrubPlaying)}
              className="evo-btn-primary px-2.5 py-1 text-[11px] sm:text-xs"
            >
              {scrubPlaying ? t("replay.pause") : t("replay.play")}
            </button>
            <button
              type="button"
              onClick={stepForward}
              disabled={scrubStep !== null && scrubStep >= liveStep}
              className="evo-btn-ghost px-2 py-1 text-[11px] sm:text-xs disabled:opacity-40"
            >
              {t("replay.next")}
            </button>
            {canGoLive && (
              <button
                type="button"
                onClick={goLive}
                className="evo-btn-ghost px-2 py-1 text-[11px] sm:text-xs text-evo-green ml-auto"
              >
                {t("chat.goLive")}
              </button>
            )}
            <span className="w-full text-[10px] text-evo-gray5">
              {t("replay.step", {
                current: (scrubStep ?? 0) + 1,
                total: liveStep + 1,
              })}
            </span>
          </div>
        )}
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 sm:px-4 py-2 space-y-1.5 sm:space-y-2"
      >
        {!historyData ? (
          <p className="text-xs text-evo-gray5">{t("chat.loading")}</p>
        ) : lines.length === 0 ? (
          <p className="text-xs text-evo-gray5">{t("chat.empty")}</p>
        ) : (
          lines.map(renderLine)
        )}
      </div>

      <div className="shrink-0 border-t border-evo-gray11/40 px-3 sm:px-4 py-2.5 bg-evo-gray11/10">
        {activeThought ? (
          <div>
            <p className="text-[10px] sm:text-xs text-evo-gray5 mb-1">
              <span className="text-evo-blue6 font-semibold">
                {activeThought.playerName}
              </span>{" "}
              · {activeThought.action}
            </p>
            {renderThought(activeThought.thought)}
          </div>
        ) : (
          <p className="text-[11px] sm:text-xs text-evo-gray5 italic">
            {t("chat.noThought")}
          </p>
        )}
      </div>
    </div>
  );
}
