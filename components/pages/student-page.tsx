"use client";

import { Credit } from "@/components/credit";
import { Logo } from "@/components/logo";
import {
  Compass,
  MessageCircleQuestionMark,
  RefreshCw,
  Vote,
} from "lucide-react";
import { useRef, useState } from "react";
import { QuestionsPanel } from "@/components/student/questions-panel";
import { QuizPanel } from "@/components/student/quiz-panel";
import { ReactionBar } from "@/components/student/reaction-bar";
import { VotePanel } from "@/components/student/vote-panel";
import { useRoom } from "@/components/room";
import { useRoomState } from "@/lib/use-room-state";

const TABS = [
  { id: "vote", label: "Vote", Icon: Vote },
  { id: "questions", label: "Questions", Icon: MessageCircleQuestionMark },
  { id: "quiz", label: "Quiz", Icon: Compass },
] as const;
type TabId = (typeof TABS)[number]["id"];

/** Student page: vote, ask questions, take the quiz and send reactions. */
export function StudentPage() {
  const room = useRoom();
  const { state, offline, missing, refresh } = useRoomState({ room });
  const [tab, setTab] = useState<TabId>("vote");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  // The host can turn the quiz off; its tab then goes and Vote opens instead.
  const quizOff = state?.quiz === null;
  const tabs = quizOff ? TABS.filter((t) => t.id !== "quiz") : TABS;
  if (quizOff && tab === "quiz") setTab("vote");

  function onTabKey(e: React.KeyboardEvent, i: number) {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    const next = (i + step + tabs.length) % tabs.length;
    setTab(tabs[next].id);
    tabRefs.current[next]?.focus();
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col">
      <header className="flex items-center justify-between gap-3 px-4 pt-5 pb-3">
        <h1 className="flex items-center gap-2 text-[2rem] leading-none font-bold tracking-[-0.03em]">
          <Logo className="size-9" />
          Chatterjar
        </h1>
        <p
          role="status"
          className="flex items-center gap-1.5 text-sm text-muted"
        >
          {offline ? (
            <>
              <RefreshCw
                aria-hidden
                className="size-4 text-amber motion-safe:animate-spin"
              />
              Reconnecting...
            </>
          ) : state && !missing ? (
            <>
              <span aria-hidden className="size-2 rounded-full bg-green" />
              Live
            </>
          ) : null}
        </p>
      </header>

      <div
        role="tablist"
        aria-label="Room sections"
        className={`sticky top-0 z-10 grid border-b border-line bg-paper/95 px-2 backdrop-blur-sm ${quizOff ? "grid-cols-2" : "grid-cols-3"}`}
      >
        {tabs.map(({ id, label, Icon }, i) => {
          const active = tab === id;
          return (
            <button
              key={id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`tab-${id}`}
              aria-selected={active}
              aria-controls={`panel-${id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => setTab(id)}
              onKeyDown={(e) => onTabKey(e, i)}
              className={`relative flex min-h-14 items-center justify-center gap-2 text-[0.9375rem] font-semibold transition-colors ${active ? "text-ink" : "text-muted hover:text-ink"}`}
            >
              <Icon
                aria-hidden
                className={`size-5 ${active ? "text-blue" : ""}`}
              />
              {label}
              <span
                aria-hidden
                className={`absolute inset-x-3 bottom-0 h-[3px] rounded-t-full transition-colors ${active ? "bg-blue" : "bg-transparent"}`}
              />
            </button>
          );
        })}
      </div>

      {tabs.map(({ id }) => (
        <section
          key={id}
          role="tabpanel"
          id={`panel-${id}`}
          aria-labelledby={`tab-${id}`}
          hidden={tab !== id}
          className="flex-1 px-4 pt-5 pb-10"
        >
          {missing ? (
            <p className="py-10 text-center text-muted">
              This room does not exist. Check the link or scan the QR code
              again.
            </p>
          ) : !state ? (
            <p className="py-10 text-center text-muted">Loading the room...</p>
          ) : id === "vote" ? (
            <VotePanel
              poll={state.poll}
              myVote={state.me.vote}
              refresh={refresh}
            />
          ) : id === "questions" ? (
            <QuestionsPanel
              questions={state.questions}
              upvoted={state.me.upvoted}
              refresh={refresh}
            />
          ) : state.quiz ? (
            <QuizPanel
              quiz={state.quiz}
              persona={state.me.persona}
              tally={state.tally}
              refresh={refresh}
            />
          ) : null}
        </section>
      ))}

      <Credit className="justify-center px-4 pb-2 text-sm" />

      {state && !missing && <ReactionBar />}
    </div>
  );
}
