"use client";

import { useEffect, useState } from "react";
import type { HistoryData } from "@/lib/replay-view";

export interface RoomMeta {
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

export interface StateView {
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

export function useRoomEvents(
  code: string,
  opts?: { revealAll?: boolean },
): {
  meta: RoomMeta | null;
  view: StateView | null;
  historyData: HistoryData | null;
  error: string | null;
} {
  const [meta, setMeta] = useState<RoomMeta | null>(null);
  const [view, setView] = useState<StateView | null>(null);
  const [historyData, setHistoryData] = useState<HistoryData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const params = new URLSearchParams();
    if (opts?.revealAll) params.set("revealAll", "1");

    const connect = () => {
      const es = new EventSource(
        `/api/rooms/${code}/events?${params.toString()}`,
      );

      es.onmessage = (event) => {
        if (!alive) return;
        try {
          const data = JSON.parse(event.data);
          if (data.type === "ping") return;
          if (data.type === "room") {
            setError(null);
            setMeta(data.meta);
            setView(data.state ?? null);
            setHistoryData(data.history ?? null);
          }
        } catch {
          /* ignore malformed frames */
        }
      };

      es.addEventListener("error", (event) => {
        if (!alive) return;
        try {
          const raw = (event as MessageEvent).data;
          if (raw) {
            const data = JSON.parse(raw);
            if (data.type === "error") {
              setError(data.message);
              es.close();
            }
          }
        } catch {
          /* connection drop — EventSource auto-reconnects */
        }
      });

      es.onerror = () => {
        if (!alive) return;
        if (es.readyState === EventSource.CLOSED) {
          setError("connection lost");
        }
      };

      return es;
    };

    const es = connect();
    return () => {
      alive = false;
      es.close();
    };
  }, [code, opts?.revealAll]);

  return { meta, view, historyData, error };
}
