"use client";

import { CircleCheck, Lock, Radio, Smartphone, Star } from "lucide-react";
import { Bars } from "@/components/bars";
import { OptionMedia } from "@/components/option-media";
import { RatingResults, WordCloud } from "@/components/poll-results";
import type { PollKind, PublicPoll } from "@/lib/domain";
import { useT } from "@/lib/i18n/react";
import styles from "./screen.module.css";

const UNIT: Record<PollKind, "vote" | "answer" | "rating"> = {
  choice: "vote",
  words: "answer",
  rating: "rating",
};

/** Active poll for the projector; results appear only after the reveal. */
export function ScreenPoll({ poll }: { poll: PublicPoll | null }) {
  const t = useT();
  if (!poll) {
    return (
      <section
        data-testid="screen-poll"
        className="flex min-h-0 flex-col justify-center"
      >
        <h1 className="font-heading text-6xl font-semibold tracking-tight">
          {t("screen.noPoll")}
        </h1>
        <p className="mt-4 text-2xl text-muted">{t("screen.noPollHint")}</p>
      </section>
    );
  }

  const revealed = poll.status === "revealed";
  return (
    <section
      data-testid="screen-poll"
      aria-labelledby="screen-poll-question"
      className="flex min-h-0 flex-col"
    >
      <h1
        id="screen-poll-question"
        className={`font-heading font-semibold leading-[1.08] tracking-tight ${poll.question.length > 110 ? "text-4xl" : "text-5xl"}`}
      >
        {poll.question}
      </h1>
      {poll.detail && (
        <p className="mt-3 max-w-[60ch] text-2xl text-muted">{poll.detail}</p>
      )}

      {/* Clip so long content never pushes the vote count off screen. */}
      <div className="mt-8 min-h-0 flex-1 overflow-hidden">
        {poll.kind === "words" ? (
          revealed ? (
            <WordCloud results={poll.results ?? {}} large />
          ) : (
            <Prompt text={t("screen.wordsPrompt")} />
          )
        ) : poll.kind === "rating" ? (
          revealed ? (
            <div className="max-w-[56rem]">
              <RatingResults
                results={poll.results ?? {}}
                average={poll.average}
                large
              />
            </div>
          ) : (
            <Stars />
          )
        ) : revealed ? (
          <Results poll={poll} />
        ) : (
          <Options poll={poll} />
        )}
      </div>

      <VoteCount
        total={poll.total}
        status={poll.status}
        unit={UNIT[poll.kind] ?? UNIT.choice}
      />
    </section>
  );
}

function Options({ poll }: { poll: PublicPoll }) {
  return (
    <ul className="grid h-full grid-cols-2 content-start gap-x-8 gap-y-6">
      {poll.options.map((o) => (
        <li key={o.key} className="min-w-0">
          <div className="flex items-start gap-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-ink font-heading text-3xl font-bold text-paper">
              {o.key}
            </span>
            {o.label !== o.key && (
              <p className="pt-1.5 text-2xl leading-snug">{o.label}</p>
            )}
          </div>
          {o.media && (
            // Projector type sizes for the shared text and code view.
            <div className="mt-4 [&_pre]:max-h-[44vh] [&_pre]:p-5 [&_pre]:text-[15px] [&_pre]:leading-snug">
              <OptionMedia media={o.media} label={o.key} playAudio />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function Prompt({ text }: { text: string }) {
  return (
    <p className="flex items-center gap-4 text-3xl text-muted">
      <Smartphone aria-hidden className="size-10 shrink-0 text-blue" />
      {text}
    </p>
  );
}

function Stars() {
  const t = useT();
  return (
    <div className="space-y-8">
      <ul aria-label={t("screen.ratingScale")} className="flex gap-6">
        {[1, 2, 3, 4, 5].map((n) => (
          <li key={n} className="flex flex-col items-center gap-2">
            <Star aria-hidden className="size-20 text-amber" />
            <span className="font-heading text-4xl font-bold">{n}</span>
          </li>
        ))}
      </ul>
      <Prompt text={t("screen.ratingPrompt")} />
    </div>
  );
}

function Results({ poll }: { poll: PublicPoll }) {
  const t = useT();
  const items = poll.options.map((o) => ({
    key: o.key,
    label: o.label === o.key ? o.key : `${o.key}. ${o.label}`,
    value: poll.results?.[o.key] ?? 0,
    highlight: o.key === poll.correct,
  }));
  return (
    <div data-testid="screen-results" className="max-w-[56rem]">
      <Bars items={items} large />
      {poll.correct && (
        <p className="mt-8 flex items-center gap-3 font-heading text-4xl font-semibold text-green">
          <CircleCheck aria-hidden className="size-10 shrink-0" />
          {t("common.correctAnswer", { answer: poll.correct })}
        </p>
      )}
      {poll.source && (
        <p className="mt-3 text-lg text-muted">
          {t("common.source", { source: poll.source })}
        </p>
      )}
    </div>
  );
}

const STATUS = {
  open: { Icon: Radio, tone: "text-green" },
  closed: { Icon: Lock, tone: "text-amber" },
  revealed: { Icon: CircleCheck, tone: "text-green" },
} as const;

function VoteCount({
  total,
  status,
  unit,
}: {
  total: number;
  status: PublicPoll["status"];
  unit: (typeof UNIT)[PollKind];
}) {
  const t = useT();
  const { Icon, tone } = STATUS[status];
  return (
    <div className="mt-6 flex items-end justify-between gap-6 border-t border-line pt-5">
      <p aria-live="polite" className="flex items-baseline gap-3">
        {/* Remount on change so the pulse replays for each new vote. */}
        <span
          key={total}
          className={`${styles.pulse} font-heading text-7xl font-bold tabular-nums leading-none`}
        >
          {total}
        </span>
        <span className="text-3xl text-muted">
          {t(`common.units.${unit}`, { count: total })}
        </span>
      </p>
      <p
        className={`flex items-center gap-2.5 pb-1 text-2xl font-semibold ${tone}`}
      >
        <Icon aria-hidden className="size-7 shrink-0" />
        {t(`screen.status.${status}`)}
      </p>
    </div>
  );
}
