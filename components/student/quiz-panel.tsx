"use client";

import { useState } from "react";
import { Bars } from "@/components/bars";
import quiz from "@/data/quiz.json";
import { post } from "@/lib/api";
import { PERSONAS, isPersona, type Persona } from "@/lib/domain";
import { ErrorNote, errorText } from "./error-note";

const QUIZ = quiz as { question: string; answers: Record<Persona, string> }[];

/** Five-question persona quiz; after it, the persona and the room tally. */
export function QuizPanel({
  persona,
  tally,
  refresh,
}: {
  persona: Persona | null;
  tally: Record<Persona, number> | null;
  refresh: () => Promise<void>;
}) {
  const [answers, setAnswers] = useState<(Persona | null)[]>(() =>
    QUIZ.map(() => null),
  );
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // me.persona is never cached, so a room reset clears it here too.
  const shown = persona;
  const complete = answers.every(Boolean);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    const res = await post<{ persona?: string }>("/api/quiz", { answers });
    // Stay disabled until the refresh shows the persona from the server.
    if (res.ok && isPersona(res.data.persona)) await refresh();
    setSending(false);
    if (!res.ok || !isPersona(res.data.persona)) {
      setError(errorText(res.data, "Your answers did not go through."));
    }
  }

  if (shown) {
    return (
      <div className="space-y-6">
        <section
          data-testid="quiz-result"
          className="rounded-2xl bg-violet/[0.07] px-4 py-5"
        >
          <p className="font-heading text-3xl leading-tight font-bold text-violet">
            You are {shown === "Idea" ? "an" : "a"} {shown}
          </p>
          <p className="mt-2 text-muted">
            Your answer is in the room count below.
          </p>
        </section>
        <section
          data-testid="quiz-tally"
          aria-labelledby="tally-heading"
          className="space-y-3"
        >
          <h2 id="tally-heading" className="text-xl font-semibold">
            The room so far
          </h2>
          <Bars
            items={PERSONAS.map((p) => ({
              key: p,
              label: p,
              value: tally?.[p] ?? 0,
              highlight: p === shown,
            }))}
          />
        </section>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <p className="text-muted">
        Answer 5 short questions. Pick the answer that fits you best.
      </p>
      {QUIZ.map((q, i) => (
        <fieldset key={q.question} className="space-y-2">
          <legend className="mb-2 font-heading text-lg leading-snug font-semibold">
            <span className="text-muted">{i + 1}/5 </span>
            {q.question}
          </legend>
          {PERSONAS.map((p) => (
            <label
              key={p}
              className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl bg-white px-3 py-2 ring-1 ring-line transition-colors has-checked:bg-violet/[0.07] has-checked:ring-2 has-checked:ring-violet"
            >
              <input
                type="radio"
                name={`quiz-${i}`}
                value={p}
                checked={answers[i] === p}
                onChange={() =>
                  setAnswers((a) => a.map((v, j) => (j === i ? p : v)))
                }
                className="size-5 shrink-0 accent-violet"
              />
              <span className="leading-snug">{q.answers[p]}</span>
            </label>
          ))}
        </fieldset>
      ))}
      <ErrorNote message={error} />
      <button
        type="submit"
        disabled={!complete || sending}
        className="flex min-h-12 w-full items-center justify-center rounded-xl bg-violet px-4 font-semibold text-white transition-colors hover:bg-violet/90 active:bg-ink disabled:bg-line disabled:text-muted"
      >
        {sending ? "Checking..." : "See my persona"}
      </button>
      {!complete && (
        <p className="-mt-3 text-center text-sm text-muted">
          {answers.filter(Boolean).length} of 5 answered
        </p>
      )}
    </form>
  );
}
