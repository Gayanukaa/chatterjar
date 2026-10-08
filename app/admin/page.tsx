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
import { useRoomState } from "@/lib/use-room-state";

export default function AdminPage() {
  const { key, data, offline, keyError, signIn, act } = useAdmin();
  const room = useRoomState();

  if (key === undefined) return null;
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
            Run polls, hide questions and reset the room.
          </p>
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
          {lost ? "No connection. Trying again." : "Updates every 3 seconds"}
        </p>
      </header>

      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start lg:gap-8">
        <PollList
          polls={data?.polls ?? null}
          activeId={data?.activeId ?? null}
          act={act}
        />
        <div className="grid gap-10 lg:gap-8">
          <RoomPanel
            act={act}
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
