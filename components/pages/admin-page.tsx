"use client";

import { WifiOff } from "lucide-react";
import { Logo } from "@/components/logo";
import { CreatePollForm } from "@/components/admin/create-poll-form";
import { KeyForm } from "@/components/admin/key-form";
import { PollList } from "@/components/admin/poll-list";
import { QuestionsPanel } from "@/components/admin/questions-panel";
import { QuizPanel } from "@/components/admin/quiz-panel";
import { RoomPanel } from "@/components/admin/room-panel";
import { useAdmin } from "@/components/admin/use-admin";
import { roomPath } from "@/lib/api";
import { POLL_MS } from "@/lib/poll-interval";
import { useRoomState } from "@/lib/use-room-state";

export function AdminPage({ room: code }: { room: string }) {
  const { key, data, offline, missing, keyError, signIn, act, download } =
    useAdmin(code);
  const room = useRoomState({ room: code, device: false });

  if (missing || room.missing) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 text-center">
        <h1 className="text-2xl font-semibold">This room does not exist</h1>
        <p className="mt-2 text-muted">
          Check the admin link. The room may have been deleted.
        </p>
      </main>
    );
  }
  // A stable placeholder (not null) while the stored key loads; a page that
  // first renders nothing makes the dev server reload in a loop.
  if (key === undefined) return <main aria-busy="true" className="min-h-dvh" />;
  if (key === null) return <KeyForm error={keyError} onSubmit={signIn} />;

  const lost = offline || room.offline;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 selection:bg-blue/15 sm:px-6 lg:py-10">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-line pb-5">
        <div>
          <h1 className="flex items-center gap-2.5 text-3xl font-bold tracking-tight sm:text-4xl">
            <Logo className="size-10" />
            Chatterjar admin
          </h1>
          <p className="mt-1 text-muted">
            {code === "main" ? "Main room" : `Room ${code}`}: run polls, hide
            questions and reset the room.
          </p>
          <nav className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold">
            <a
              className="inline-flex min-h-12 items-center text-blue underline-offset-4 hover:underline"
              href={roomPath(code)}
            >
              Phone page
            </a>
            <a
              className="inline-flex min-h-12 items-center text-blue underline-offset-4 hover:underline"
              href={roomPath(code, "screen")}
            >
              Projector view
            </a>
          </nav>
        </div>
        <p
          role="status"
          className={`inline-flex items-center gap-2 text-sm font-medium ${lost ? "text-amber" : "text-green"}`}
        >
          {lost ? (
            <WifiOff aria-hidden className="size-4" />
          ) : (
            <span aria-hidden className="size-2 rounded-full bg-green" />
          )}
          {lost
            ? "No connection. Trying again."
            : `Updates every ${Number((POLL_MS / 1000).toFixed(1))} seconds`}
        </p>
      </header>

      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start lg:gap-8">
        <PollList
          polls={data?.polls ?? null}
          activeId={data?.activeId ?? null}
          packs={data?.packs ?? []}
          act={act}
        />
        <div className="grid gap-10 lg:gap-8">
          <RoomPanel
            act={act}
            download={download}
            hasActive={Boolean(data?.activeId)}
            onDone={() => void room.refresh()}
          />
          <CreatePollForm act={act} />
          <QuestionsPanel
            questions={room.state?.questions ?? null}
            onHide={async (id) => {
              const res = await act("/api/admin/hide", { id });
              void room.refresh();
              return res;
            }}
          />
          <QuizPanel
            tally={room.state?.tally ?? null}
            onReset={async () => {
              const res = await act("/api/admin/reset-quiz");
              void room.refresh();
              return res;
            }}
          />
        </div>
      </div>
    </main>
  );
}
