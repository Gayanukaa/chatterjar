"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { withRoom } from "./api";
import type { DeviceState, RoomState } from "./domain";

export const POLL_MS = 3000;

type Shared = Omit<RoomState, "me">;
const NO_DEVICE: DeviceState = { vote: null, upvoted: [], persona: null };

class HttpError extends Error {
  constructor(readonly status: number) {
    super(String(status));
  }
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new HttpError(res.status);
  return res.json();
}

/** Room state: shared part polled every 3 s, device part only when it can change. */
export function useRoomState({
  room = "main",
  device = true,
}: { room?: string; device?: boolean } = {}) {
  const [shared, setShared] = useState<Shared | null>(null);
  const [me, setMe] = useState<DeviceState>(NO_DEVICE);
  const [offline, setOffline] = useState(false);
  const [missing, setMissing] = useState(false);
  // Last poll id and epoch seen; a change means this device's state may differ.
  const seen = useRef<{ poll: string | null; epoch: number } | null>(null);

  const loadMe = useCallback(
    async (pollId: string | null) => {
      if (!device) return;
      const q = pollId ? `?poll=${encodeURIComponent(pollId)}` : "";
      setMe(await getJson<DeviceState>(withRoom(`/api/me${q}`, room)));
    },
    [device, room],
  );

  const tick = useCallback(
    async (fresh = false) => {
      try {
        // A unique query skips the 1 s CDN cache right after this device acts.
        const base = fresh ? `/api/room?t=${Date.now()}` : "/api/room";
        const url = withRoom(base, room);
        const next = await getJson<Shared>(url);
        const poll = next.poll?.id ?? null;
        const last = seen.current;
        setShared(next);
        setMissing(false);
        if (fresh || !last || last.poll !== poll || last.epoch !== next.epoch) {
          seen.current = { poll, epoch: next.epoch };
          await loadMe(poll);
        }
        setOffline(false);
      } catch (err) {
        // 404 means the room code does not exist; anything else is a network blip.
        if (err instanceof HttpError && err.status === 404) {
          setMissing(true);
          setShared(null);
        } else setOffline(true);
      }
    },
    [loadMe, room],
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
  return { state, offline, missing, refresh };
}
