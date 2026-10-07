"use client";

import { Check, Lock } from "lucide-react";
import { useState } from "react";
import { Bars } from "@/components/bars";
import { OptionMedia } from "@/components/option-media";
import { post } from "@/lib/api";
import type { PublicPoll } from "@/lib/domain";
import { ErrorNote, errorText } from "./error-note";

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

  async function castVote(option: string) {
    if (!poll) return;
    setSending(true);
    setError(undefined);
    const res = await post("/api/vote", { pollId: poll.id, option });
    // Stay disabled until the refresh shows the vote from the server.
    if (res.ok) await refresh();
    setSending(false);
    if (!res.ok) {
      setError({
        pollId: poll.id,
        text: errorText(res.data, "Your vote did not go through. Try again."),
      });
    }
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
            You voted {vote}
          </p>
        )}
        {poll.status === "closed" && (
          <p className="flex items-center gap-2 text-muted">
            <Lock aria-hidden className="size-5 shrink-0" />
            Voting is closed
          </p>
        )}
        {poll.status === "open" && !vote && (
          <p className="text-muted">Pick one option. You can vote once.</p>
        )}
      </div>

      <ErrorNote message={error?.pollId === poll.id ? error.text : null} />

      {revealed && (
        <section
          data-testid="poll-results"
          className="space-y-4 rounded-2xl bg-white p-4 ring-1 ring-line"
        >
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
          <p className="text-sm text-muted">
            {poll.total} {poll.total === 1 ? "vote" : "votes"}
          </p>
          {poll.source && (
            <p className="text-sm text-muted">Source: {poll.source}</p>
          )}
        </section>
      )}

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
                disabled={!canVote}
                onClick={() => castVote(o.key)}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue px-4 text-base font-semibold text-white transition-colors hover:bg-blue/90 active:bg-ink disabled:bg-line disabled:text-muted"
              >
                {mine && <Check aria-hidden className="size-5" />}
                Vote {o.key}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
