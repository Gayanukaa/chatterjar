"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DeviceState, RoomState } from "./domain";

export const POLL_MS = 3000;

type Shared = Omit<RoomState, "me">;
const NO_DEVICE: DeviceState = { vote: null, upvoted: [], persona: null };

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

/** Room state: shared part polled every 3 s, device part only when it can change. */
export function useRoomState({ device = true }: { device?: boolean } = {}) {
  const [shared, setShared] = useState<Shared | null>(null);
  const [me, setMe] = useState<DeviceState>(NO_DEVICE);
  const [offline, setOffline] = useState(false);
  // Last poll id and epoch seen; a change means this device's state may differ.
  const seen = useRef<{ poll: string | null; epoch: number } | null>(null);

  const loadMe = useCallback(
    async (pollId: string | null) => {
      if (!device) return;
      const q = pollId ? `?poll=${encodeURIComponent(pollId)}` : "";
      setMe(await getJson<DeviceState>(`/api/me${q}`));
    },
    [device],
  );

  const tick = useCallback(
    async (fresh = false) => {
      try {
        // A unique query skips the 1 s CDN cache right after this device acts.
        const url = fresh ? `/api/room?t=${Date.now()}` : "/api/room";
        const next = await getJson<Shared>(url);
        const poll = next.poll?.id ?? null;
        const last = seen.current;
        setShared(next);
        if (fresh || !last || last.poll !== poll || last.epoch !== next.epoch) {
          seen.current = { poll, epoch: next.epoch };
          await loadMe(poll);
        }
        setOffline(false);
      } catch {
        setOffline(true);
      }
    },
    [loadMe],
  );

  const refresh = useCallback(() => tick(true), [tick]);

  useEffect(() => {
    const first = setTimeout(() => void tick(), 0);
    // Hidden tabs skip polls; that saves requests during long talks.
    const timer = setInterval(() => {
      if (!document.hidden) void tick();
    }, POLL_MS);
    const onShow = () => {
      if (!document.hidden) void tick();
    };
    document.addEventListener("visibilitychange", onShow);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onShow);
    };
  }, [tick]);

  const state: RoomState | null = shared ? { ...shared, me } : null;
  return { state, offline, refresh };
}
