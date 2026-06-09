"use client";

import { useEffect, useState } from "react";

function clientOrigin(): string {
  if (typeof window === "undefined") return "";
  return window.location.origin.replace(/\/$/, "");
}

/**
 * Client-side API base for agent connect commands.
 * Prefers /api/meta (respects reverse-proxy headers), then NEXT_PUBLIC_APP_URL,
 * then window.location.origin.
 */
export function useApiBase(): string {
  const envBase = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const [base, setBase] = useState(() => envBase || clientOrigin());

  useEffect(() => {
    let alive = true;

    fetch("/api/meta")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!alive || !data?.apiBase) return;
        setBase(String(data.apiBase).replace(/\/$/, ""));
      })
      .catch(() => {
        if (!alive) return;
        const origin = clientOrigin();
        if (origin) setBase(origin);
      });

    return () => {
      alive = false;
    };
  }, []);

  return base;
}
