"use client";

import { Check, Lock, Send, Star } from "lucide-react";
import { useState } from "react";
import { Bars } from "@/components/bars";
import { OptionMedia } from "@/components/option-media";
import { RatingResults, WordCloud } from "@/components/poll-results";
import { post, withRoom } from "@/lib/api";
import { useRoom } from "@/components/room";
import {
  MAX_WORD,
  RATING_OPTIONS,
  type PollKind,
  type PublicPoll,
} from "@/lib/domain";
import { ErrorNote, errorText } from "./error-note";

const BUTTON =
  "flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue px-4 text-base font-semibold text-white transition-colors hover:bg-blue/90 active:bg-ink disabled:bg-line disabled:text-muted";

const COPY: Record<PollKind, { done: string; hint: string; unit: string }> = {
  choice: {
    done: "You voted",
    hint: "Pick one option. You can vote once.",
    unit: "vote",
  },
  words: {
    done: "You answered",
    hint: "Send one short answer. You can answer once.",
    unit: "answer",
  },
  rating: {
    done: "You rated",
    hint: "Rate from 1 (low) to 5 (high). You can rate once.",
    unit: "rating",
  },
};

/** Current poll: options, vote buttons, and results only after reveal. */
export function VotePanel({
  poll,
  myVote,
  refresh,
}: {
  poll: PublicPoll | null;
  myVote: string | null;
  refresh: () => Promise<void>;
}) {
  const room = useRoom();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<{ pollId: string; text: string }>();

  if (!poll) {
    return (
      <div className="py-10 text-center">
        <h2 className="text-2xl font-semibold">No poll yet</h2>
        <p className="mt-2 text-muted">
          The next poll shows here. This page updates by itself.
        </p>
      </div>
    );
  }

  // me.vote is never cached, so the server is the only source of truth.
  const vote = myVote;
  const canVote = poll.status === "open" && !vote && !sending;
  const revealed = poll.status === "revealed";
  // A cached state from before poll types has no kind.
  const copy = COPY[poll.kind] ?? COPY.choice;

  /** Sends an option key or a word; true when the server took it. */
  async function send(payload: { option: string } | { text: string }) {
    if (!poll) return false;
    setSending(true);
    setError(undefined);
    const res = await post(withRoom("/api/vote", room), {
      pollId: poll.id,
      ...payload,
    });
    // Stay disabled until the refresh shows the vote from the server.
    if (res.ok) await refresh();
    setSending(false);
    if (!res.ok) {
      setError({
        pollId: poll.id,
        text: errorText(res.data, "Your vote did not go through. Try again."),
      });
    }
    return res.ok;
  }

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <h2 className="text-[1.375rem] leading-snug font-semibold">
          {poll.question}
        </h2>
        {poll.detail && (
          <p className="rounded-xl bg-line/60 px-3 py-2.5 text-[0.9375rem] text-ink">
            <span className="font-semibold">Task: </span>
            {poll.detail}
          </p>
        )}
      </header>

      <div className="space-y-2" aria-live="polite">
        {vote && (
          <p className="flex items-center gap-2 font-semibold text-green">
            <Check aria-hidden className="size-5 shrink-0" />
            <span className="min-w-0 wrap-anywhere">
              {copy.done} {vote}
            </span>
          </p>
        )}
        {poll.status === "closed" && (
          <p className="flex items-center gap-2 text-muted">
            <Lock aria-hidden className="size-5 shrink-0" />
            Voting is closed
          </p>
        )}
        {poll.status === "open" && !vote && (
          <p className="text-muted">{copy.hint}</p>
        )}
      </div>

      <ErrorNote message={error?.pollId === poll.id ? error.text : null} />

      {revealed && (
        <section
          data-testid="poll-results"
          className="space-y-4 rounded-2xl bg-white p-4 ring-1 ring-line"
        >
          {poll.kind === "words" ? (
            <WordCloud results={poll.results ?? {}} />
          ) : poll.kind === "rating" ? (
            <RatingResults
              results={poll.results ?? {}}
              average={poll.average}
            />
          ) : (
            <>
              {poll.correct && (
                <p className="text-lg font-semibold text-green">
                  Correct answer: {poll.correct}
                </p>
              )}
              <Bars
                items={poll.options.map((o) => ({
                  key: o.key,
                  label: o.label === o.key ? o.key : `${o.key}: ${o.label}`,
                  value: poll.results?.[o.key] ?? 0,
                  highlight: o.key === poll.correct,
                }))}
              />
            </>
          )}
          <p className="text-sm text-muted">
            {poll.total} {copy.unit}
            {poll.total === 1 ? "" : "s"}
          </p>
          {poll.source && (
            <p className="text-sm text-muted">Source: {poll.source}</p>
          )}
        </section>
      )}

      {poll.kind === "words" ? (
        !vote &&
        poll.status === "open" && (
          <WordForm disabled={!canVote} send={(text) => send({ text })} />
        )
      ) : poll.kind === "rating" ? (
        <RatingButtons
          vote={vote}
          disabled={!canVote}
          send={(option) => send({ option })}
        />
      ) : (
        <ChoiceOptions
          poll={poll}
          vote={vote}
          disabled={!canVote}
          send={(option) => send({ option })}
        />
      )}
    </div>
  );
}

function ChoiceOptions({
  poll,
  vote,
  disabled,
  send,
}: {
  poll: PublicPoll;
  vote: string | null;
  disabled: boolean;
  send: (option: string) => Promise<boolean>;
}) {
  return (
    <ul className="space-y-4">
      {poll.options.map((o) => {
        const mine = vote === o.key;
        return (
          <li
            key={o.key}
            className={`space-y-3 rounded-2xl bg-white p-3 ring-1 ${mine ? "ring-2 ring-blue" : "ring-line"}`}
          >
            {o.label !== o.key && (
              <p className="flex gap-3 px-1 pt-1">
                <span className="font-heading text-lg leading-6 font-bold text-blue">
                  {o.key}
                </span>
                <span className="min-w-0 leading-6">{o.label}</span>
              </p>
            )}
            {o.media && <OptionMedia media={o.media} label={o.key} />}
            <button
              type="button"
              disabled={disabled}
              onClick={() => send(o.key)}
              className={BUTTON}
            >
              {mine && <Check aria-hidden className="size-5" />}
              Vote {o.key}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function WordForm({
  disabled,
  send,
}: {
  disabled: boolean;
  send: (text: string) => Promise<boolean>;
}) {
  const [text, setText] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (await send(text)) setText("");
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor="word-text" className="font-semibold">
          Your answer
        </label>
        <span id="word-count" className="text-sm text-muted tabular-nums">
          {text.length}/{MAX_WORD}
        </span>
      </div>
      <input
        id="word-text"
        aria-describedby="word-count word-rule"
        value={text}
        maxLength={MAX_WORD}
        autoComplete="off"
        enterKeyHint="send"
        onChange={(e) => setText(e.target.value)}
        className="block min-h-12 w-full rounded-xl bg-white px-3 text-base text-ink ring-1 ring-line placeholder:text-muted focus:ring-2 focus:ring-blue focus:outline-none"
      />
      <p id="word-rule" className="text-sm text-muted">
        Letters, numbers, spaces and hyphens.
      </p>
      <button
        type="submit"
        disabled={disabled || !text.trim()}
        className={BUTTON}
      >
        <Send aria-hidden className="size-5" />
        Send answer
      </button>
    </form>
  );
}

function RatingButtons({
  vote,
  disabled,
  send,
}: {
  vote: string | null;
  disabled: boolean;
  send: (option: string) => Promise<boolean>;
}) {
  return (
    <ul className="grid grid-cols-5 gap-2">
      {RATING_OPTIONS.map(({ key }) => {
        const mine = vote === key;
        return (
          <li key={key}>
            <button
              type="button"
              aria-label={`Rate ${key}`}
              aria-pressed={mine}
              disabled={disabled}
              onClick={() => send(key)}
              className={`flex min-h-16 w-full flex-col items-center justify-center gap-1 rounded-xl font-heading text-xl font-bold transition-colors disabled:cursor-not-allowed ${mine ? "bg-blue text-white" : "bg-white text-ink ring-1 ring-line hover:ring-blue disabled:text-muted disabled:hover:ring-line"}`}
            >
              <Star
                aria-hidden
                className={`size-6 ${mine ? "fill-white" : "text-amber"}`}
              />
              {key}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
