import { CircleCheck, Lock, Radio } from "lucide-react";
import { Bars } from "@/components/bars";
import { OptionMedia } from "@/components/option-media";
import type { PublicPoll } from "@/lib/domain";
import styles from "./screen.module.css";

const plural = (n: number, word: string) => `${word}${n === 1 ? "" : "s"}`;

/** Active poll for the projector; results appear only after the reveal. */
export function ScreenPoll({ poll }: { poll: PublicPoll | null }) {
  if (!poll) {
    return (
      <section
        data-testid="screen-poll"
        className="flex min-h-0 flex-col justify-center"
      >
        <h1 className="font-heading text-6xl font-semibold tracking-tight">
          No poll yet
        </h1>
        <p className="mt-4 text-2xl text-muted">
          The next poll shows here when it opens.
        </p>
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

      <div className="mt-8 min-h-0 flex-1">
        {revealed ? <Results poll={poll} /> : <Options poll={poll} />}
      </div>

      <VoteCount total={poll.total} status={poll.status} />
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

function Results({ poll }: { poll: PublicPoll }) {
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
          Correct answer: {poll.correct}
        </p>
      )}
      {poll.source && (
        <p className="mt-3 text-lg text-muted">Source: {poll.source}</p>
      )}
    </div>
  );
}

const STATUS = {
  open: { text: "Voting is open", Icon: Radio, tone: "text-green" },
  closed: { text: "Voting is closed", Icon: Lock, tone: "text-amber" },
  revealed: { text: "Results are in", Icon: CircleCheck, tone: "text-green" },
} as const;

function VoteCount({
  total,
  status,
}: {
  total: number;
  status: PublicPoll["status"];
}) {
  const { text, Icon, tone } = STATUS[status];
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
        <span className="text-3xl text-muted">{plural(total, "vote")}</span>
      </p>
      <p
        className={`flex items-center gap-2.5 pb-1 text-2xl font-semibold ${tone}`}
      >
        <Icon aria-hidden className="size-7 shrink-0" />
        {text}
      </p>
    </div>
  );
}
