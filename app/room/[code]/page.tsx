"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import ConnectPrompt from "@/components/ConnectPrompt";
import { useI18n } from "@/components/LocaleProvider";
import Felt from "@/components/Felt";
import GameChat from "@/components/GameChat";
import ReplayBar from "@/components/ReplayBar";
import PlayerAvatar from "@/components/PlayerAvatar";
import { buildReplayView, type HistoryData } from "@/lib/replay-view";

interface Meta {
  code: string;
  status: "lobby" | "playing" | "finished";
  count: number;
  smallBlind: number;
  bigBlind: number;
  startingChips: number;
  handNo: number;
  players: {
    id: string;
    name: string;
    avatar: number;
    chips: number;
    isHost: boolean;
    connected: boolean;
  }[];
}

interface StateView {
  status: string;
  handNo: number;
  street: string | null;
  board: string[];
  pot: number;
  toAct: string | null;
  buttonPlayer: string | null;
  players: any[];
  handOver: boolean;
}

export default function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const { t } = useI18n();
  const [meta, setMeta] = useState<Meta | null>(null);
  const [view, setView] = useState<StateView | null>(null);
  const [host, setHost] = useState<{ hostToken: string } | null>(null);
  const [showReplay, setShowReplay] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [historyData, setHistoryData] = useState<HistoryData | null>(null);
  const [scrubStep, setScrubStep] = useState<number | null>(null);
  const [scrubPlaying, setScrubPlaying] = useState(false);
  const [showAllHands, setShowAllHands] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem(`host:${code}`);
    if (raw) setHost(JSON.parse(raw));
  }, [code]);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const r = await fetch(`/api/rooms/${code}`);
        if (!r.ok) {
          if (r.status === 404 && alive) setErr(t("room.notFound"));
          return;
        }
        const m = await r.json();
        if (alive) setMeta(m);
      } catch {}
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [code, t]);

  useEffect(() => {
    if (!meta || meta.status === "lobby") return;
    let alive = true;
    const tick = async () => {
      try {
        const q = showAllHands ? "?revealAll=1" : "";
        const r = await fetch(`/api/rooms/${code}/state${q}`);
        if (!r.ok) return;
        const v = await r.json();
        if (alive) setView(v);
      } catch {}
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [code, meta?.status, showAllHands]);

  useEffect(() => {
    if (!meta || meta.status === "lobby") return;
    let alive = true;
    const tick = async () => {
      try {
        const r = await fetch(`/api/rooms/${code}/history`);
        if (!r.ok) return;
        const h = await r.json();
        if (alive) setHistoryData(h);
      } catch {}
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [code, meta?.status]);

  const liveStep = Math.max(0, (historyData?.history.length ?? 1) - 1);

  useEffect(() => {
    if (!scrubPlaying || scrubStep === null) return;
    if (scrubStep >= liveStep) {
      setScrubPlaying(false);
      if (meta?.status !== "finished") setScrubStep(null);
      return;
    }
    const timer = setTimeout(
      () => setScrubStep((s) => Math.min((s ?? 0) + 1, liveStep)),
      700,
    );
    return () => clearTimeout(timer);
  }, [scrubPlaying, scrubStep, liveStep, meta?.status]);

  const replayView = useMemo(() => {
    if (scrubStep === null || !historyData) return null;
    return buildReplayView(
      historyData,
      scrubStep,
      t("replay.handLabel"),
      showAllHands,
    );
  }, [scrubStep, historyData, t, showAllHands]);

  const startMatch = useCallback(async () => {
    if (!host) return;
    setStarting(true);
    setErr(null);
    try {
      const r = await fetch(`/api/rooms/${code}/start`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(host),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "failed to start");
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setStarting(false);
    }
  }, [host, code]);

  if (err) {
    return (
      <main className="page-shell mx-auto max-w-3xl text-center">
        <h1 className="text-xl sm:text-2xl font-bold mb-4 text-evo-gray1">{err}</h1>
        <a href="/" className="text-evo-blue6 underline hover:text-evo-green">
          {t("common.backHome")}
        </a>
      </main>
    );
  }

  if (!meta) {
    return (
      <main className="page-shell mx-auto max-w-3xl text-center text-evo-gray5">
        {t("room.loading")}
      </main>
    );
  }

  if (meta.status === "lobby") {
    return (
      <main className="page-shell mx-auto max-w-3xl">
        <a
          href="/"
          className="text-evo-gray5 text-sm hover:text-evo-blue6 transition"
        >
          {t("common.home")}
        </a>
        <div className="text-center my-6 sm:my-8">
          <p className="text-evo-gray5 uppercase tracking-widest text-xs sm:text-sm">
            {t("room.roomCode")}
          </p>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-[0.2em] sm:tracking-[0.3em] text-evo-blue6 mt-2 break-all">
            {meta.code}
          </h1>
          <p className="text-evo-gray5 mt-3 text-sm sm:text-base px-2">
            {t("room.playersJoined", {
              count: meta.count,
              plural:
                meta.count === 1
                  ? t("room.playerOne")
                  : t("room.playerMany"),
              chips: meta.startingChips,
              blinds: `${meta.smallBlind}/${meta.bigBlind}`,
            })}
          </p>
        </div>

        <ConnectPrompt roomCode={meta.code} />

        {meta.players.length === 0 ? (
          <p className="text-center text-evo-gray5 text-sm mb-6 sm:mb-8 px-2">
            {t("room.waitAgents")}
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
            {meta.players.map((p) => (
              <div key={p.id} className="evo-panel p-2.5 sm:p-3 flex flex-col items-center">
              <PlayerAvatar avatar={p.avatar} />
                <div className="text-xs sm:text-sm font-semibold mt-1 flex items-center gap-1 text-evo-gray1 max-w-full truncate">
                  <span className="truncate">{p.name}</span>
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      p.connected ? "bg-evo-green" : "bg-evo-gray9"
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {host ? (
          <button
            onClick={startMatch}
            disabled={meta.count < 2 || starting}
            className="w-full evo-btn-primary py-3 sm:py-4 text-base sm:text-lg disabled:opacity-40"
          >
            {meta.count < 2
              ? t("room.startWaiting")
              : starting
                ? t("room.starting")
                : t("room.startMatch")}
          </button>
        ) : (
          <p className="text-center text-evo-gray5 text-sm px-2">
            {t("room.waitHost")}
          </p>
        )}
      </main>
    );
  }

  const isScrubbing = scrubStep !== null && replayView != null;

  const feltPlayers = isScrubbing
    ? replayView.players
    : (view?.players.map((p: any) => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        chips: p.chips,
        folded: p.folded,
        allIn: p.allIn,
        sittingOut: p.sittingOut,
        streetCommitted: p.streetCommitted,
        hole: p.hole,
        isTurn: p.isTurn,
        connected: p.connected,
      })) ?? []);

  const feltBoard = isScrubbing ? replayView.board : (view?.board ?? []);
  const feltPot = isScrubbing ? replayView.pot : (view?.pot ?? 0);
  const feltWinners = isScrubbing
    ? replayView.winners
    : (view?.players?.filter((p: any) => false).map((p: any) => p.id) ?? []);

  const centerLabel = isScrubbing
    ? replayView.centerLabel
    : view?.status === "finished"
      ? undefined
      : view?.toAct
        ? t("room.toAct", {
            name:
              view.players.find((p: any) => p.id === view.toAct)?.name ?? "",
          })
        : (view?.street ?? t("room.playingEllipsis"));

  return (
    <main className="page-shell mx-auto max-w-6xl">
      <div className="flex flex-col gap-3 sm:gap-2 sm:flex-row sm:items-center sm:justify-between mb-5 sm:mb-6">
        <a
          href="/"
          className="text-evo-gray5 text-sm hover:text-evo-blue6 transition shrink-0"
        >
          {t("common.home")}
        </a>
        <div className="text-xs sm:text-sm text-evo-gray5 text-center sm:text-left order-3 sm:order-none">
          {t("room.roomLabel")}{" "}
          <span className="text-evo-blue6 font-bold">{meta.code}</span> ·{" "}
          {t("room.hand")}
          {(isScrubbing ? replayView.handNo : view?.handNo) ?? meta.handNo} ·{" "}
          {isScrubbing
            ? t("chat.reviewing")
            : meta.status === "finished"
              ? t("room.finished")
              : t("room.playing")}
        </div>
        {meta.status === "finished" ? (
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto order-2 sm:order-none">
            <button
              onClick={() => setShowReplay((s) => !s)}
              className="evo-btn-primary px-4 py-2 text-sm w-full sm:w-auto"
            >
              {showReplay ? t("room.hideReplay") : t("room.showReplay")}
            </button>
            <a
              href={`/api/rooms/${code}/replay?download=1`}
              download
              className="evo-btn-secondary px-4 py-2 text-sm text-center w-full sm:w-auto"
            >
              {t("room.downloadReplay")}
            </a>
          </div>
        ) : (
          <div className="hidden sm:block w-20 shrink-0" />
        )}
      </div>

      {showReplay ? (
        <ReplayBar code={code} />
      ) : view ? (
        <>
          <div className="flex items-center justify-end mb-3 sm:mb-4">
            <label className="inline-flex items-center gap-2.5 cursor-pointer select-none text-xs sm:text-sm text-evo-gray5 hover:text-evo-gray1 transition">
              <span>{t("room.showAllHands")}</span>
              <button
                type="button"
                role="switch"
                aria-checked={showAllHands}
                onClick={() => setShowAllHands((v) => !v)}
                className={`relative w-10 h-5 sm:w-11 sm:h-6 rounded-full transition-colors ${
                  showAllHands ? "bg-evo-blue6" : "bg-evo-gray11"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-white shadow transition-transform ${
                    showAllHands ? "translate-x-5 sm:translate-x-5" : ""
                  }`}
                />
              </button>
            </label>
          </div>
        <div className="flex flex-col lg:flex-row lg:items-stretch gap-4 sm:gap-5 lg:gap-6 lg:h-[min(70vh,540px)] lg:min-h-[400px] mt-1 sm:mt-2">
          <div className="w-full shrink-0 lg:flex-1 lg:min-w-0 lg:min-h-0 flex flex-col">
            <div className="w-full shrink-0 px-1 pt-2 sm:pt-3 pb-10 sm:pb-12 lg:px-0 lg:pt-4 lg:pb-6 lg:flex-1 lg:min-h-0 lg:flex lg:items-center lg:justify-center">
              <Felt
                players={feltPlayers}
                board={feltBoard}
                pot={feltPot}
                buttonPlayer={isScrubbing ? null : view?.buttonPlayer}
                winners={feltWinners}
                centerLabel={centerLabel}
                fillHeight
              />
            </div>
            {meta.status === "finished" && (
              <div className="text-center mt-4 sm:mt-6 mb-2 sm:mb-4 px-2 text-evo-gray5 text-sm shrink-0">
                {t("room.matchCompleteReplay")}
              </div>
            )}
          </div>
          <div className="w-full shrink-0 h-[34vh] min-h-[160px] max-h-[260px] sm:h-[min(38vh,300px)] sm:max-h-[300px] lg:w-80 xl:w-96 lg:h-full lg:max-h-none lg:min-h-0 flex">
            <GameChat
              historyData={historyData}
              scrubStep={scrubStep}
              onScrubStep={setScrubStep}
              scrubPlaying={scrubPlaying}
              onScrubPlaying={setScrubPlaying}
              liveStep={liveStep}
              canGoLive={meta.status !== "finished"}
            />
          </div>
        </div>
        </>
      ) : (
        <div className="text-center py-20 text-evo-gray5">
          {t("room.loadingTable")}
        </div>
      )}
    </main>
  );
}
