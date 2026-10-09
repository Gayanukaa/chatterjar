"use client";

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
import { useT } from "@/lib/i18n/react";
import { useRoomState } from "@/lib/use-room-state";

const TABS = [
  { id: "vote", Icon: Vote },
  { id: "questions", Icon: MessageCircleQuestionMark },
  { id: "quiz", Icon: Compass },
] as const;
type TabId = (typeof TABS)[number]["id"];

/** Student page: vote, ask questions, take the quiz and send reactions. */
export function StudentPage({ room }: { room: string }) {
  const { state, offline, missing, refresh } = useRoomState({ room });
  const t = useT();
  const [tab, setTab] = useState<TabId>("vote");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function onTabKey(e: React.KeyboardEvent, i: number) {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    const next = (i + step + TABS.length) % TABS.length;
    setTab(TABS[next].id);
    tabRefs.current[next]?.focus();
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col">
      <header className="flex items-center justify-between gap-3 px-4 pt-5 pb-3">
        <h1 className="flex items-center gap-2 text-[2rem] leading-none font-bold tracking-[-0.03em]">
          <Logo className="size-9" />
          {t("common.appName")}
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
              {t("student.reconnecting")}
            </>
          ) : state && !missing ? (
            <>
              <span aria-hidden className="size-2 rounded-full bg-green" />
              {t("student.live")}
            </>
          ) : null}
        </p>
      </header>

      <div
        role="tablist"
        aria-label={t("student.tabsLabel")}
        className="sticky top-0 z-10 grid grid-cols-3 border-b border-line bg-paper/95 px-2 backdrop-blur-sm"
      >
        {TABS.map(({ id, Icon }, i) => {
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
              {t(`student.tabs.${id}`)}
              <span
                aria-hidden
                className={`absolute inset-x-3 bottom-0 h-[3px] rounded-t-full transition-colors ${active ? "bg-blue" : "bg-transparent"}`}
              />
            </button>
          );
        })}
      </div>

      {TABS.map(({ id }) => (
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
              {t("student.roomMissing")}
            </p>
          ) : !state ? (
            <p className="py-10 text-center text-muted">
              {t("student.loading")}
            </p>
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
          ) : (
            <QuizPanel
              persona={state.me.persona}
              tally={state.tally}
              refresh={refresh}
            />
          )}
        </section>
      ))}

      {state && !missing && <ReactionBar />}
    </div>
  );
}
