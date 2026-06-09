"use client";

import { useEffect, useState } from "react";
import ReplayBar from "@/components/ReplayBar";
import { useI18n } from "@/components/LocaleProvider";
import {
  parseReplayFile,
  type ReplayExport,
} from "@/lib/replay-export";

const STORAGE_KEY = "replay:loaded";

export default function ReplayPage() {
  const { t } = useI18n();
  const [data, setData] = useState<ReplayExport | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setErr(t("replay.noFile"));
        return;
      }
      const parsed = parseReplayFile(JSON.parse(raw));
      if (!parsed.ok) {
        setErr(parsed.error);
        return;
      }
      setData(parsed.data);
    } catch {
      setErr(t("replay.noFile"));
    }
  }, [t]);

  return (
    <main className="page-shell mx-auto max-w-5xl">
      <a
        href="/"
        className="text-evo-gray5 text-sm hover:text-evo-blue6 transition"
      >
        {t("common.home")}
      </a>

      {err ? (
        <div className="text-center py-16">
          <p className="text-evo-gray5 mb-4">{err}</p>
          <a href="/" className="evo-btn-primary px-5 py-2.5 text-sm inline-block">
            {t("home.loadReplayBtn")}
          </a>
        </div>
      ) : data ? (
        <div className="mt-4">
          <div className="mb-4 text-center sm:text-left">
            <h1 className="text-xl sm:text-2xl font-bold text-evo-gray1">
              {t("replay.loadedTitle")}
            </h1>
            <p className="text-sm text-evo-gray5 mt-1">
              {t("replay.roomLabel")}{" "}
              <span className="text-evo-blue6 font-semibold">{data.code}</span>
              {" · "}
              {data.players.length} {t("replay.playerLabel")}
              {" · "}
              {t("replay.blindsLabel")} {data.smallBlind}/{data.bigBlind}
            </p>
          </div>
          <ReplayBar data={data} />
        </div>
      ) : (
        <div className="text-center py-20 text-evo-gray5">
          {t("replay.loading")}
        </div>
      )}
    </main>
  );
}
