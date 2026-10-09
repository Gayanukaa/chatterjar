"use client";

import { Check, Copy, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { KeyForm } from "@/components/admin/key-form";
import { Button, ErrorText, FIELD, Section } from "@/components/admin/ui";
import { Logo } from "@/components/logo";
import { roomPath } from "@/lib/api";
import { useT } from "@/lib/i18n/react";

interface Room {
  code: string;
  title: string;
  createdAt: number;
}

const STORE = "room-super-key";

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
    // Private mode: the key lives in memory for this tab only.
  }
}

/** Owner console: create invite-only rooms and hand out their admin links. */
export function RoomsPage() {
  const t = useT();
  const [key, setKey] = useState<string | null | undefined>(undefined);
  const [rooms, setRooms] = useState<Room[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [created, setCreated] = useState<{
    title: string;
    adminUrl: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const call = useCallback(
    async (method: string, path: string, payload?: unknown) => {
      let res: Response;
      try {
        res = await fetch(path, {
          method,
          cache: "no-store",
          headers: {
            "content-type": "application/json",
            "x-admin-key": key ?? "",
          },
          body: payload ? JSON.stringify(payload) : undefined,
        });
      } catch {
        return { ok: false, data: { error: t("common.noConnection") } };
      }
      const data = await res.json().catch(() => ({}));
      if (res.status === 401 || res.status === 403) {
        saveKey(null);
        setKey(null);
        setKeyError(data.error ?? t("rooms.wrongKey"));
      }
      return { ok: res.ok, data };
    },
    [key, t],
  );

  const load = useCallback(async () => {
    const res = await call("GET", "/api/super/rooms");
    if (res.ok) setRooms(res.data.rooms);
  }, [call]);

  useEffect(() => {
    const t = setTimeout(() => setKey(readKey()), 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!key) return;
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [key, load]);

  async function create(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await call("POST", "/api/super/rooms", { title });
    setBusy(false);
    if (!res.ok) return setError(res.data.error ?? t("rooms.createFailed"));
    const { code, token } = res.data.room;
    const adminUrl = `${window.location.origin}${roomPath(code, "admin")}#key=${token}`;
    setCreated({ title: res.data.room.title, adminUrl });
    // Show the new room at once; load() then confirms the list from Redis.
    const { title: roomTitle, createdAt } = res.data.room;
    setRooms((list) => [
      { code, title: roomTitle, createdAt },
      ...(list ?? []),
    ]);
    setCopied(false);
    setTitle("");
    void load();
  }

  async function remove(room: Room) {
    if (!window.confirm(t("rooms.deleteConfirm", { title: room.title }))) {
      return;
    }
    const res = await call("DELETE", `/api/super/rooms?code=${room.code}`);
    if (!res.ok) setError(res.data.error ?? t("rooms.deleteFailed"));
    void load();
  }

  // A stable placeholder (not null) while the stored key loads; a page that
  // first renders nothing makes the dev server reload in a loop.
  if (key === undefined) return <main aria-busy="true" className="min-h-dvh" />;
  if (key === null) {
    return (
      <KeyForm
        title={t("rooms.title")}
        description={t("rooms.keyDescription")}
        label={t("rooms.keyLabel")}
        button={t("rooms.keyButton")}
        error={keyError}
        onSubmit={(next) => {
          saveKey(next);
          setKeyError(null);
          setKey(next);
        }}
      />
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:py-10">
      <header className="border-b border-line pb-5">
        <h1 className="flex items-center gap-2.5 text-3xl font-bold tracking-tight sm:text-4xl">
          <Logo className="size-10" />
          {t("rooms.title")}
        </h1>
        <p className="mt-1 text-muted">{t("rooms.intro")}</p>
      </header>

      <div className="mt-6 grid gap-10">
        <Section id="create-heading" title={t("rooms.createHeading")}>
          <form
            onSubmit={create}
            className="grid gap-3 rounded-xl border border-line bg-white p-4"
          >
            <label htmlFor="room-title" className="font-semibold">
              {t("rooms.nameLabel")}
            </label>
            <input
              id="room-title"
              className={FIELD}
              value={title}
              maxLength={80}
              placeholder={t("rooms.namePlaceholder")}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Button
              type="submit"
              variant="primary"
              disabled={busy || !title.trim()}
            >
              <Plus aria-hidden />
              {t("rooms.create")}
            </Button>
            {error && <ErrorText>{error}</ErrorText>}
            {created && (
              <div
                role="status"
                className="grid gap-2 rounded-lg bg-green/[0.07] p-3"
              >
                <p className="font-semibold text-green">
                  {t("rooms.ready", { title: created.title })}
                </p>
                <code className="block rounded bg-white p-2 text-sm break-all">
                  {created.adminUrl}
                </code>
                <Button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(created.adminUrl);
                      setCopied(true);
                    } catch {
                      setError(t("rooms.copyFailed"));
                    }
                  }}
                >
                  {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
                  {copied ? t("rooms.copied") : t("rooms.copy")}
                </Button>
              </div>
            )}
          </form>
        </Section>

        <Section id="rooms-heading" title={t("rooms.listHeading")}>
          {rooms === null ? (
            <p className="text-muted">{t("rooms.loading")}</p>
          ) : rooms.length === 0 ? (
            <p className="text-muted">{t("rooms.empty")}</p>
          ) : (
            <ul className="grid gap-3">
              {rooms.map((room) => (
                <li
                  key={room.code}
                  data-testid="room-row"
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white p-4"
                >
                  <div className="min-w-0">
                    <p className="font-semibold">{room.title}</p>
                    <p className="text-sm text-muted">
                      {t("rooms.code")}{" "}
                      <span className="font-mono">{room.code}</span> ·{" "}
                      <a
                        className="inline-flex min-h-12 items-center text-blue underline-offset-4 hover:underline"
                        href={roomPath(room.code)}
                      >
                        {t("common.phonePage")}
                      </a>{" "}
                      ·{" "}
                      <a
                        className="inline-flex min-h-12 items-center text-blue underline-offset-4 hover:underline"
                        href={roomPath(room.code, "screen")}
                      >
                        {t("common.projectorView")}
                      </a>
                    </p>
                  </div>
                  <Button variant="danger" onClick={() => remove(room)}>
                    <Trash2 aria-hidden />
                    {t("rooms.delete")}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </main>
  );
}
