"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/LocaleProvider";
import { LIMITS } from "@/lib/api-contract";
import { parseReplayFile } from "@/lib/replay-export";

export default function Home() {
  const router = useRouter();
  const { t, messages } = useI18n();
  const [startingChips, setStartingChips] = useState(LIMITS.defaultStartingChips);
  const [smallBlind, setSmallBlind] = useState(LIMITS.defaultSmallBlind);
  const [bigBlind, setBigBlind] = useState(LIMITS.defaultBigBlind);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const replayInputRef = useRef<HTMLInputElement>(null);

  async function createRoom() {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ startingChips, smallBlind, bigBlind }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "failed");
      sessionStorage.setItem(
        `host:${data.roomCode}`,
        JSON.stringify({ hostToken: data.hostToken }),
      );
      router.push(`/room/${data.roomCode}`);
    } catch (e: any) {
      setError(e.message);
      setCreating(false);
    }
  }

  async function loadReplayFile(file: File) {
    setError(null);
    try {
      const parsed = parseReplayFile(JSON.parse(await file.text()));
      if (!parsed.ok) throw new Error(parsed.error);
      sessionStorage.setItem("replay:loaded", JSON.stringify(parsed.data));
      router.push("/replay");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t("home.loadReplayInvalid");
      setError(msg);
    }
  }

  const stepList = messages.home.steps;

  return (
    <main className="page-shell mx-auto max-w-5xl">
      <header className="text-center mb-8 sm:mb-12">
        <p className="text-evo-gray5 text-[10px] sm:text-xs uppercase tracking-[0.2em] sm:tracking-[0.35em] mb-3">
          {t("home.tagline")}
        </p>
        <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight">
          <span className="evo-gradient-text">♠</span>{" "}
          <span className="text-evo-gray1">{t("home.title")}</span>
        </h1>
        <p className="mt-3 text-base sm:text-lg text-evo-gray5 px-2">
          {t("home.subtitle")}{" "}
          <span className="text-evo-blue6">{t("home.subtitleAccent")}</span>
        </p>
      </header>

      <section className="grid gap-4 sm:gap-6 md:grid-cols-2 mb-10 sm:mb-14">
        <div className="evo-panel p-5 sm:p-7 flex flex-col">
          <h2 className="text-xl sm:text-2xl font-semibold mb-2 text-evo-gray1">
            {t("home.createTitle")}
          </h2>
          <p className="text-evo-gray5 text-sm mb-4 flex-1">
            {t("home.createDesc")}
          </p>
          <div className="grid grid-cols-3 gap-2 mb-5 sm:mb-6">
            <label className="text-xs text-evo-gray5">
              <span className="block mb-1">{t("home.startingChips")}</span>
              <input
                type="number"
                min={1}
                value={startingChips}
                onChange={(e) => setStartingChips(Number(e.target.value) || LIMITS.defaultStartingChips)}
                className="w-full rounded-lg bg-black/50 border border-evo-gray9/40 px-2 py-2 text-center text-evo-gray1 outline-none focus:border-evo-blue6 min-h-10"
              />
            </label>
            <label className="text-xs text-evo-gray5">
              <span className="block mb-1">{t("home.smallBlind")}</span>
              <input
                type="number"
                min={1}
                value={smallBlind}
                onChange={(e) => setSmallBlind(Number(e.target.value) || LIMITS.defaultSmallBlind)}
                className="w-full rounded-lg bg-black/50 border border-evo-gray9/40 px-2 py-2 text-center text-evo-gray1 outline-none focus:border-evo-blue6 min-h-10"
              />
            </label>
            <label className="text-xs text-evo-gray5">
              <span className="block mb-1">{t("home.bigBlind")}</span>
              <input
                type="number"
                min={1}
                value={bigBlind}
                onChange={(e) => setBigBlind(Number(e.target.value) || LIMITS.defaultBigBlind)}
                className="w-full rounded-lg bg-black/50 border border-evo-gray9/40 px-2 py-2 text-center text-evo-gray1 outline-none focus:border-evo-blue6 min-h-10"
              />
            </label>
          </div>
          <button
            onClick={createRoom}
            disabled={creating}
            className="evo-btn-primary py-3 w-full"
          >
            {creating ? t("home.creating") : t("home.createBtn")}
          </button>
        </div>

        <div className="evo-panel p-5 sm:p-7 flex flex-col">
          <h2 className="text-xl sm:text-2xl font-semibold mb-2 text-evo-gray1">
            {t("home.loadReplayTitle")}
          </h2>
          <p className="text-evo-gray5 text-sm mb-4 flex-1">
            {t("home.loadReplayDesc")}
          </p>
          <input
            ref={replayInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) loadReplayFile(file);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => replayInputRef.current?.click()}
            className="evo-btn-secondary py-3 w-full sm:w-auto sm:self-start px-6"
          >
            {t("home.loadReplayBtn")}
          </button>
        </div>
      </section>

      {error && <p className="text-center text-evo-blue mb-6 sm:mb-8">{error}</p>}

      <section className="evo-panel p-5 sm:p-8 mb-8 sm:mb-10">
        <h2 className="text-xl sm:text-2xl font-semibold mb-5 sm:mb-6 text-evo-gray1">
          {t("home.howToPlay")}
        </h2>
        <ol className="space-y-4 sm:space-y-5">
          {stepList.map((s, i) => (
            <li key={i} className="flex gap-3 sm:gap-4">
              <span className="shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-full chip-badge grid place-items-center font-bold text-sm">
                {i + 1}
              </span>
              <div className="min-w-0">
                <h3 className="font-semibold text-evo-gray1">{s.title}</h3>
                <p className="text-evo-gray5 text-sm mt-0.5">{s.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="evo-panel-accent p-5 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center gap-5 sm:gap-6 justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold mb-1 text-evo-gray1">
              {t("home.skillTitle")}
            </h2>
            <p className="text-evo-gray5 text-sm max-w-xl">{t("home.skillDesc")}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full md:w-auto shrink-0">
            <a
              href="/agent-sdk/agent-example.mjs"
              download
              className="evo-btn-primary px-5 py-3 text-center text-sm sm:text-base"
            >
              {t("home.downloadSdk")}
            </a>
            <a
              href="/docs"
              className="evo-btn-secondary px-5 py-3 text-center text-sm sm:text-base"
            >
              {t("home.apiDocs")}
            </a>
          </div>
        </div>
      </section>

      <footer className="text-center text-evo-gray9 text-xs mt-10 sm:mt-12 px-2">
        {t("home.footer")}
      </footer>
    </main>
  );
}
