"use client";

import { WifiOff } from "lucide-react";
import { JoinHost } from "@/components/screen/join-host";
import { JoinQr } from "@/components/screen/join-qr";
import { ScreenPoll } from "@/components/screen/screen-poll";
import { ScreenQuestions } from "@/components/screen/screen-questions";
import {
  ReactionLayer,
  ReactionTotals,
} from "@/components/screen/screen-reactions";
import { ScreenTally } from "@/components/screen/screen-tally";
import { ThemeToggle, useScreenTheme } from "@/components/screen/theme-toggle";
import type { ScreenTheme } from "@/lib/screen-theme";
import { useT } from "@/lib/i18n/react";
import { useRoomState } from "@/lib/use-room-state";

/** Projector view (1600 x 900): poll, questions, quiz tally and reactions. */
export function ScreenPage({
  room,
  initialTheme,
}: {
  room: string;
  initialTheme?: ScreenTheme;
}) {
  const { state, offline, missing } = useRoomState({ room, device: false });
  const { theme, toggle } = useScreenTheme(initialTheme);
  const t = useT();

  return (
    <div
      data-theme={theme}
      className="flex min-h-dvh flex-col bg-paper px-10 pt-10 pb-5 text-ink lg:h-dvh lg:overflow-hidden"
    >
      <main className="grid min-h-0 flex-1 grid-cols-1 gap-10 lg:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,1.15fr)]">
        {state ? (
          <>
            <ScreenPoll poll={state.poll} />
            <div className="min-h-0 overflow-hidden lg:border-l lg:border-line lg:pl-10">
              <ScreenQuestions questions={state.questions} />
            </div>
            <div className="flex min-h-0 flex-col justify-between gap-8 lg:border-l lg:border-line lg:pl-10">
              <ScreenTally tally={state.tally} />
              <JoinQr />
            </div>
          </>
        ) : (
          <p className="text-3xl text-muted">
            {missing
              ? t("screen.roomMissing")
              : offline
                ? t("screen.offline")
                : t("screen.loading")}
          </p>
        )}
      </main>
      {state && <ReactionLayer reactions={state.reactions} />}
      <footer className="mt-5 flex flex-wrap items-center justify-between gap-6">
        <JoinHost />
        {state && <ReactionTotals reactions={state.reactions} />}
        <div className="flex items-center gap-6">
          {offline && state && (
            <p
              role="status"
              className="flex items-center gap-2 text-lg text-rose"
            >
              <WifiOff aria-hidden className="size-5 shrink-0" />
              {t("screen.connectionLost")}
            </p>
          )}
          <ThemeToggle theme={theme} onToggle={toggle} />
        </div>
      </footer>
    </div>
  );
}
