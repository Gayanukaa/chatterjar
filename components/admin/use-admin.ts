"use client";

import { useCallback, useEffect, useState } from "react";
import { post, withRoom } from "@/lib/api";
import type { PendingQuestion, Poll, RoomSettings } from "@/lib/domain";
import { POLL_MS } from "@/lib/poll-interval";

export type AdminPoll = Poll & { votes: Record<string, number> };
export interface PackSummary {
  id: string;
  title: string;
  description: string;
  count: number;
}
export interface AdminState {
  activeId: string | null;
  polls: AdminPoll[];
  packs: PackSummary[];
  settings: RoomSettings;
  pending: PendingQuestion[];
  pendingTotal: number;
}

const storeKey = (room: string) => `room-admin-key:${room}`;

function readKey(room: string): string | null {
  try {
    return sessionStorage.getItem(storeKey(room));
  } catch {
    return null;
  }
}

function saveKey(room: string, key: string | null) {
  try {
    if (key) sessionStorage.setItem(storeKey(room), key);
    else sessionStorage.removeItem(storeKey(room));
  } catch {
    // Storage can be blocked; the key then lives in memory only.
  }
}

/** Admin key (from #key=, ?key= or sessionStorage) and admin state every POLL_MS. */
export function useAdmin(room = "main") {
  // undefined: not read yet; null: no key, show the key form.
  const [key, setKey] = useState<string | null | undefined>(undefined);
  const [data, setData] = useState<AdminState | null>(null);
  const [offline, setOffline] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  const reject = useCallback(() => {
    saveKey(room, null);
    setKey(null);
    setData(null);
    setKeyError("This admin key is wrong. Enter the correct key.");
  }, [room]);

  useEffect(() => {
    const t = setTimeout(() => {
      const url = new URL(window.location.href);
      // #key= is preferred: fragments never reach the server or its logs.
      const fromHash = new URLSearchParams(url.hash.slice(1)).get("key");
      const fromUrl = fromHash || url.searchParams.get("key");
      if (fromUrl) {
        saveKey(room, fromUrl);
        url.searchParams.delete("key");
        if (fromHash) url.hash = "";
        // Removes the key from the address bar and history.
        window.history.replaceState(
          window.history.state,
          "",
          url.pathname + url.search + url.hash,
        );
      }
      setKey(fromUrl || readKey(room));
    }, 0);
    return () => clearTimeout(t);
  }, [room]);

  const refresh = useCallback(async () => {
    if (!key) return;
    try {
      const res = await fetch(withRoom("/api/admin/state", room), {
        cache: "no-store",
        headers: { "x-admin-key": key },
      });
      if (res.status === 401) return reject();
      if (res.status === 404) return setMissing(true);
      if (!res.ok) throw new Error(String(res.status));
      setData(await res.json());
      setOffline(false);
    } catch {
      setOffline(true);
    }
  }, [key, reject, room]);

  useEffect(() => {
    if (!key) return;
    const first = setTimeout(refresh, 0);
    const timer = setInterval(refresh, POLL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [key, refresh]);

  const signIn = useCallback(
    (next: string) => {
      saveKey(room, next);
      setKeyError(null);
      setKey(next);
    },
    [room],
  );

  /** POSTs an admin action with the key header, then refreshes admin state. */
  const act = useCallback(
    async (path: string, payload: unknown = {}) => {
      const res = await post(withRoom(path, room), payload, key ?? undefined);
      if (res.status === 401) reject();
      else void refresh();
      return res;
    },
    [key, refresh, reject, room],
  );

  /** GETs a file with the key header and saves it; the key stays out of URLs. */
  const download = useCallback(
    async (path: string): Promise<string | null> => {
      try {
        const res = await fetch(withRoom(path, room), {
          cache: "no-store",
          headers: { "x-admin-key": key ?? "" },
        });
        if (res.status === 401) {
          reject();
          return "This admin key is wrong.";
        }
        if (!res.ok) return "Could not download the results. Try again.";
        const name = /filename="([^"]+)"/.exec(
          res.headers.get("content-disposition") ?? "",
        )?.[1];
        const url = URL.createObjectURL(await res.blob());
        const a = document.createElement("a");
        a.href = url;
        a.download = name ?? "chatterjar-results";
        a.click();
        // Revoke later: some browsers read the blob after click() returns.
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
        return null;
      } catch {
        return "No connection. Try again.";
      }
    },
    [key, reject, room],
  );

  return { key, data, offline, missing, keyError, signIn, act, download };
}
