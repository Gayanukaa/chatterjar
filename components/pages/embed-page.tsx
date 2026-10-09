"use client";

import { WifiOff } from "lucide-react";
import { JoinHost } from "@/components/screen/join-host";
import { JoinQr } from "@/components/screen/join-qr";
import { ScreenPoll } from "@/components/screen/screen-poll";
import { ScreenQuestions } from "@/components/screen/screen-questions";
import { ScreenTally } from "@/components/screen/screen-tally";
import type { EmbedOptions } from "@/lib/embed";
import { useT } from "@/lib/i18n/react";
import { useRoomState } from "@/lib/use-room-state";

// The question list must clip, not scroll, inside a slide.
const CLIP = "min-h-0 overflow-hidden [&_ol]:overflow-hidden";

/** Chrome-less projector parts for an iframe; rem follows the frame size. */
export function EmbedPage({
  room,
  options: { show, theme, transparent },
}: {
  room: string;
  options: EmbedOptions;
}) {
  const t = useT();
  const { state, offline, missing } = useRoomState({ room, device: false });

  let body;
  if (missing) body = <Note>{t("screen.roomMissing")}</Note>;
  else if (show === "qr") {
    // The QR needs no room data, so it shows before the first poll returns.
    body = (
      <div className="flex flex-col items-center justify-center gap-6">
        <JoinQr />
        <JoinHost />
      </div>
    );
  } else if (!state) {
    body = <Note>{offline ? t("screen.offline") : t("screen.loading")}</Note>;
  } else if (show === "poll") body = <ScreenPoll poll={state.poll} />;
  else if (show === "questions") {
    body = <ScreenQuestions questions={state.questions} />;
  } else if (show === "tally") body = <ScreenTally tally={state.tally} />;
  else {
    body = (
      <div className="grid h-full min-h-0 grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,1.15fr)] gap-10 portrait:grid-cols-2 portrait:grid-rows-2">
        <div className="flex min-h-0 portrait:col-span-2 [&>section]:flex-1">
          <ScreenPoll poll={state.poll} />
        </div>
        <div
          className={`${CLIP} border-l border-line pl-10 portrait:border-l-0 portrait:pl-0`}
        >
          <ScreenQuestions questions={state.questions} />
        </div>
        <div className="flex min-h-0 flex-col justify-between gap-8 overflow-hidden border-l border-line pl-10">
          <ScreenTally tally={state.tally} />
          <JoinQr />
        </div>
      </div>
    );
  }

  return (
    <div
      data-embed={show}
      data-embed-bg={transparent ? "transparent" : undefined}
      data-theme={theme}
      className={`relative flex h-dvh w-full flex-col overflow-hidden p-8 text-ink ${transparent ? "" : "bg-paper"}`}
    >
      <main
        className={`flex min-h-0 flex-1 flex-col ${show === "qr" ? "items-center justify-center" : "[&>section]:flex-1"} ${CLIP}`}
      >
        {body}
      </main>
      {offline && state && (
        <p
          role="status"
          className="absolute right-4 bottom-3 flex items-center gap-2 text-lg text-rose"
        >
          <WifiOff aria-hidden className="size-5 shrink-0" />
          {t("screen.connectionLost")}
        </p>
      )}
    </div>
  );
}

function Note({ children }: { children: string }) {
  return <p className="m-auto text-3xl text-muted">{children}</p>;
}
