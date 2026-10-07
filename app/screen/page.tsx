"use client";

import { WifiOff } from "lucide-react";
import { JoinHost } from "@/components/screen/join-host";
import { ScreenPoll } from "@/components/screen/screen-poll";
import { ScreenQuestions } from "@/components/screen/screen-questions";
import { ScreenTally } from "@/components/screen/screen-tally";
import { useRoomState } from "@/lib/use-room-state";

/** Projector view (1600 x 900): poll, top questions and the quiz tally. */
export default function ScreenPage() {
  const { state, offline } = useRoomState();

  return (
    <div className="flex min-h-dvh flex-col px-10 pt-10 pb-5 lg:h-dvh lg:overflow-hidden">
      <main className="grid min-h-0 flex-1 grid-cols-1 gap-10 lg:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,1.15fr)]">
        {state ? (
          <>
            <ScreenPoll poll={state.poll} />
            <div className="min-h-0 overflow-hidden lg:border-l lg:border-line lg:pl-10">
              <ScreenQuestions questions={state.questions} />
            </div>
            <div className="min-h-0 lg:border-l lg:border-line lg:pl-10">
              <ScreenTally tally={state.tally} />
            </div>
          </>
        ) : (
          <p className="text-3xl text-muted">
            {offline ? "Cannot reach the room." : "Loading the room..."}
          </p>
        )}
      </main>
      <footer className="mt-5 flex items-center justify-between gap-6">
        <JoinHost />
        {offline && state && (
          <p
            role="status"
            className="flex items-center gap-2 text-lg text-rose"
          >
            <WifiOff aria-hidden className="size-5 shrink-0" />
            Connection lost. Trying again.
          </p>
        )}
      </footer>
    </div>
  );
}
