"use client";

import { useCallback, useEffect, useState } from "react";
import type { RoomState } from "./domain";

export const POLL_MS = 3000;

/** Room state from GET /api/state, refreshed every 3 s with fetch (no WebSockets). */
export function useRoomState() {
  const [state, setState] = useState<RoomState | null>(null);
  const [offline, setOffline] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/state", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      setState(await res.json());
      setOffline(false);
    } catch {
      setOffline(true);
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(refresh, 0);
    const timer = setInterval(refresh, POLL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [refresh]);

  return { state, offline, refresh };
}
