"use client";

import { useCallback, useEffect, useState } from "react";
import { post } from "@/lib/api";
import type { Poll } from "@/lib/domain";
import { POLL_MS } from "@/lib/use-room-state";

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
}

const STORE = "room-admin-key";

function readKey(): string | null {
  try {
    return sessionStorage.getItem(STORE);
  } catch {
    return null;
  }
}

function saveKey(key: string | null) {
  try {
    if (key) sessionStorage.setItem(STORE, key);
    else sessionStorage.removeItem(STORE);
  } catch {
    // Storage can be blocked; the key then lives in memory only.
  }
}

/** Admin key (from ?key= or sessionStorage) and admin state polled every 3 s. */
export function useAdmin() {
  // undefined: not read yet; null: no key, show the key form.
  const [key, setKey] = useState<string | null | undefined>(undefined);
  const [data, setData] = useState<AdminState | null>(null);
  const [offline, setOffline] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);

  const reject = useCallback(() => {
    saveKey(null);
    setKey(null);
    setData(null);
    setKeyError("This admin key is wrong. Enter the correct key.");
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      const url = new URL(window.location.href);
      const fromUrl = url.searchParams.get("key");
      if (fromUrl) {
        saveKey(fromUrl);
        url.searchParams.delete("key");
        // Removes the key from the address bar and history.
        window.history.replaceState(
          window.history.state,
          "",
          url.pathname + url.search + url.hash,
        );
      }
      setKey(fromUrl || readKey());
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const refresh = useCallback(async () => {
    if (!key) return;
    try {
      const res = await fetch("/api/admin/state", {
        cache: "no-store",
        headers: { "x-admin-key": key },
      });
      if (res.status === 401) return reject();
      if (!res.ok) throw new Error(String(res.status));
      setData(await res.json());
      setOffline(false);
    } catch {
      setOffline(true);
    }
  }, [key, reject]);

  useEffect(() => {
    if (!key) return;
    const first = setTimeout(refresh, 0);
    const timer = setInterval(refresh, POLL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [key, refresh]);

  const signIn = useCallback((next: string) => {
    saveKey(next);
    setKeyError(null);
    setKey(next);
  }, []);

  /** POSTs an admin action with the key header, then refreshes admin state. */
  const act = useCallback(
    async (path: string, payload: unknown = {}) => {
      const res = await post(path, payload, key ?? undefined);
      if (res.status === 401) reject();
      else void refresh();
      return res;
    },
    [key, refresh, reject],
  );

  return { key, data, offline, keyError, signIn, act };
}
