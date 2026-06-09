"use client";

import { useEffect, useState } from "react";

/**
 * Client-side API base for agent connect commands.
 * Uses NEXT_PUBLIC_APP_URL when set, otherwise window.location.origin.
 */
export function useApiBase(): string {
  const envBase = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const [base, setBase] = useState(() => {
    if (envBase) return envBase;
    if (typeof window !== "undefined") return window.location.origin;
    return "";
  });

  useEffect(() => {
    if (envBase) return;
    setBase(window.location.origin);
  }, [envBase]);

  return base;
}
