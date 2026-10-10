"use client";

import { useCallback, useEffect, useState } from "react";
import { post, request, withRoom, type ApiResult } from "@/lib/api";
import type { PendingQuestion, Poll, RoomSettings } from "@/lib/domain";
import type { packSummaries } from "@/lib/packs";
import { POLL_MS } from "@/lib/use-room-state";

export type AdminPoll = Poll & { votes: Record<string, number> };
export type PackSummary = ReturnType<typeof packSummaries>[number];
export type Act = (path: string, payload?: unknown) => Promise<ApiResult>;
export interface AdminState {
  activeId: string | null;
  polls: AdminPoll[];
  packs: PackSummary[];
  settings: RoomSettings;
  pending: PendingQuestion[];
  pendingTotal: number;
}

const storeKey = (room: string) => `room-admin-key:${room}`;

export function readKey(room: string): string | null {
  try {
    return sessionStorage.getItem(storeKey(room));
  } catch {
    return null;
  }
}

export function saveKey(room: string, key: string | null) {
  try {
    if (key) sessionStorage.setItem(storeKey(room), key);
    else sessionStorage.removeItem(storeKey(room));
  } catch {
    // Storage can be blocked; the key then lives in memory only.
  }
}

/** Admin key (from #key= or sessionStorage) and admin state every POLL_MS. */
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
    const timer = setTimeout(() => {
      const url = new URL(window.location.href);
      // #key= only: fragments never reach the server or its logs.
      const fromHash = new URLSearchParams(url.hash.slice(1)).get("key");
      if (fromHash) {
        saveKey(room, fromHash);
        // Removes the key from the address bar and history.
        window.history.replaceState(
          window.history.state,
          "",
          url.pathname + url.search,
        );
      }
      setKey(fromHash || readKey(room));
    }, 0);
    return () => clearTimeout(timer);
  }, [room]);

  const refresh = useCallback(async () => {
    if (!key) return;
    const res = await request<AdminState>(
      "GET",
      withRoom("/api/admin/state", room),
      undefined,
      key,
    );
    if (res.status === 401) return reject();
    if (res.status === 404) return setMissing(true);
    setOffline(!res.ok);
    if (res.ok) setData(res.data);
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
    async (path: string): Promise<Pick<ApiResult, "ok" | "data">> => {
      try {
        const res = await fetch(withRoom(path, room), {
          cache: "no-store",
          headers: { "x-admin-key": key ?? "" },
        });
        if (res.status === 401) {
          reject();
          return { ok: false, data: { error: "This admin key is wrong." } };
        }
        if (!res.ok) return { ok: false, data: {} };
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
        return { ok: true, data: {} };
      } catch {
        return { ok: false, data: { error: "No connection. Try again." } };
      }
    },
    [key, reject, room],
  );

  return { key, data, offline, missing, keyError, signIn, act, download };
}

/** Runs one admin call at a time: `busy` is its tag, `error` its failure. */
export function useAction() {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(
    tag: string,
    call: () => Promise<Pick<ApiResult, "ok" | "data">>,
    msg: string,
  ) {
    setBusy(tag);
    setError(null);
    const res = await call();
    if (!res.ok) setError(res.data.error ?? msg);
    setBusy(null);
    return res.ok;
  }

  return { busy, error, run };
}
