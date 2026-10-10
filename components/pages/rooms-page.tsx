"use client";

import { Check, Copy, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { KeyForm } from "@/components/admin/key-form";
import { Button, ErrorText, FIELD, Section } from "@/components/admin/ui";
import { readKey, saveKey } from "@/components/admin/use-admin";
import { Logo } from "@/components/logo";
import { request, roomPath } from "@/lib/api";
import type { RoomInfo } from "@/lib/rooms";

// Room codes are [a-z0-9], so this storage name never clashes with a room.
const OWNER = "_owner";

/** Owner console: create invite-only rooms and hand out their admin links. */
export function RoomsPage() {
  const [key, setKey] = useState<string | null | undefined>(undefined);
  const [rooms, setRooms] = useState<RoomInfo[] | null>(null);
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
    async <T,>(method: string, path: string, payload?: unknown) => {
      const res = await request<T>(method, path, payload, key ?? undefined);
      if (res.status === 401 || res.status === 403) {
        saveKey(OWNER, null);
        setKey(null);
        setKeyError(res.data.error ?? "This owner key is wrong.");
      }
      return res;
    },
    [key],
  );

  const load = useCallback(async () => {
    const res = await call<{ rooms: RoomInfo[] }>("GET", "/api/super/rooms");
    if (res.ok) setRooms(res.data.rooms);
  }, [call]);

  useEffect(() => {
    const t = setTimeout(() => setKey(readKey(OWNER)), 0);
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
    const res = await call<{ room: RoomInfo & { token: string } }>(
      "POST",
      "/api/super/rooms",
      { title },
    );
    setBusy(false);
    if (!res.ok)
      return setError(res.data.error ?? "Could not create the room.");
    const { code, token } = res.data.room;
    const adminUrl = `${window.location.origin}${roomPath(code, "admin")}#key=${token}`;
    setCreated({ title: res.data.room.title, adminUrl });
    setCopied(false);
    setTitle("");
    void load();
  }

  async function remove(room: RoomInfo) {
    if (
      !window.confirm(
        `Delete "${room.title}"? All of its polls, votes, questions and quiz answers are deleted.`,
      )
    ) {
      return;
    }
    const res = await call("DELETE", `/api/super/rooms?code=${room.code}`);
    if (!res.ok) setError(res.data.error ?? "Could not delete the room.");
    void load();
  }

  // A stable placeholder (not null) while the stored key loads; a page that
  // first renders nothing makes the dev server reload in a loop.
  if (key === undefined) return <main aria-busy="true" className="min-h-dvh" />;
  if (key === null) {
    return (
      <KeyForm
        title="Chatterjar rooms"
        description="Enter the owner key to create and delete rooms."
        label="Owner key"
        button="Open rooms"
        error={keyError}
        onSubmit={(next) => {
          saveKey(OWNER, next);
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
          Chatterjar rooms
        </h1>
        <p className="mt-1 text-muted">
          Create a room for each talk or speaker. Each room has its own polls,
          questions and admin link.
        </p>
      </header>

      <div className="mt-6 grid gap-10">
        <Section id="create-heading" title="Create a room">
          <form
            onSubmit={create}
            className="grid gap-3 rounded-xl border border-line bg-white p-4"
          >
            <label htmlFor="room-title" className="font-semibold">
              Room name
            </label>
            <input
              id="room-title"
              className={FIELD}
              value={title}
              maxLength={80}
              placeholder="For example: Design systems talk, Friday"
              onChange={(e) => setTitle(e.target.value)}
            />
            <Button
              type="submit"
              variant="primary"
              disabled={busy || !title.trim()}
            >
              <Plus aria-hidden />
              Create room
            </Button>
            {error && <ErrorText>{error}</ErrorText>}
            {created && (
              <div
                role="status"
                className="grid gap-2 rounded-lg bg-green/[0.07] p-3"
              >
                <p className="font-semibold text-green">
                  {`"${created.title}" is ready. Copy the admin link now: it is shown only once.`}
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
                      setError(
                        "Copy failed. Select the link above and copy it.",
                      );
                    }
                  }}
                >
                  {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
                  {copied ? "Copied" : "Copy admin link"}
                </Button>
              </div>
            )}
          </form>
        </Section>

        <Section id="rooms-heading" title="Rooms">
          {rooms === null ? (
            <p className="text-muted">Loading rooms...</p>
          ) : rooms.length === 0 ? (
            <p className="text-muted">
              No rooms yet. The main room is always at /.
            </p>
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
                      Code <span className="font-mono">{room.code}</span> ·{" "}
                      <a
                        className="inline-flex min-h-12 items-center text-blue underline-offset-4 hover:underline"
                        href={roomPath(room.code)}
                      >
                        Phone page
                      </a>{" "}
                      ·{" "}
                      <a
                        className="inline-flex min-h-12 items-center text-blue underline-offset-4 hover:underline"
                        href={roomPath(room.code, "screen")}
                      >
                        Projector view
                      </a>
                    </p>
                  </div>
                  <Button variant="danger" onClick={() => remove(room)}>
                    <Trash2 aria-hidden />
                    Delete room
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
