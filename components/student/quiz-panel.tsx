"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Bars } from "@/components/bars";
import { post, withRoom } from "@/lib/api";
import { useRoom } from "@/components/room";
import type { Quiz } from "@/lib/quiz";
import { ErrorNote, errorText } from "./error-note";

type Loaded = { v: string; quiz: Quiz | null } | "error" | null;

/** Room persona quiz; after it, the persona and the room tally. */
export function QuizPanel({
  quiz,
  persona,
  tally,
  refresh,
}: {
  quiz: { v: string; personas: string[] };
  persona: string | null;
  tally: Record<string, number> | null;
  refresh: () => Promise<void>;
}) {
  // me.persona is never cached, so a room reset clears it here too; one from
  // an older quiz in this room does not count.
  const mine = persona && quiz.personas.includes(persona) ? persona : null;
  if (!mine) return <QuizForm key={quiz.v} v={quiz.v} refresh={refresh} />;
  return (
    <div className="space-y-6">
      <section
        data-testid="quiz-result"
        className="rounded-2xl bg-violet/[0.07] px-4 py-5"
      >
        <p className="font-heading text-3xl leading-tight font-bold text-violet">
          {`You are ${/^[aeiou]/i.test(mine) ? "an" : "a"} ${mine}`}
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
          items={quiz.personas.map((p) => ({
            key: p,
            label: p,
            value: tally?.[p] ?? 0,
            highlight: p === mine,
          }))}
        />
      </section>
    </div>
  );
}

/** Questions of quiz version v; keyed by v, so a new quiz starts fresh. */
function QuizForm({ v, refresh }: { v: string; refresh: () => Promise<void> }) {
  const room = useRoom();
  const [loaded, setLoaded] = useState<Loaded>(null);
  const [attempt, setAttempt] = useState(0);
  const [answers, setAnswers] = useState<(string | null)[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      // Retries add t= to skip the CDN copy of this version.
      const bust = attempt ? `&t=${Date.now()}` : "";
      const path = `/api/room/quiz?v=${encodeURIComponent(v)}${bust}`;
      try {
        const res = await fetch(withRoom(path, room), { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const data: { v: string; quiz: Quiz | null } = await res.json();
        if (!live) return;
        // Another version than asked for: fetch once more past the CDN.
        if (data.v !== v && !attempt) return setAttempt(1);
        setLoaded({ v: data.v, quiz: data.quiz });
        setAnswers((data.quiz?.questions ?? []).map(() => null));
      } catch {
        if (live) setLoaded("error");
      }
    })();
    return () => {
      live = false;
    };
  }, [room, v, attempt]);

  if (loaded === null)
    return <p className="py-10 text-center text-muted">Loading the quiz...</p>;
  if (loaded === "error")
    return (
      <div className="space-y-4">
        <ErrorNote message="The quiz did not load. Check your connection." />
        <button
          type="button"
          onClick={() => {
            setLoaded(null);
            setAttempt((n) => n + 1);
          }}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 font-semibold text-ink ring-1 ring-line transition-colors hover:bg-ink/[0.03]"
        >
          <RefreshCw aria-hidden className="size-5" />
          Load the quiz again
        </button>
      </div>
    );
  const { quiz } = loaded;
  if (!quiz)
    return (
      <p className="py-10 text-center text-muted">The quiz is off right now.</p>
    );

  const { personas, questions } = quiz;
  const done = answers.filter(Boolean).length;
  const complete = done === questions.length;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    const res = await post<{ persona?: string }>(withRoom("/api/quiz", room), {
      answers,
      v: loaded && loaded !== "error" ? loaded.v : v,
    });
    const ok = res.ok && typeof res.data.persona === "string";
    // Stay disabled until the refresh shows the persona from the server.
    if (ok) await refresh();
    setSending(false);
    if (ok) return;
    setError(errorText(res.data, "Your answers did not go through."));
    // 409: the quiz changed or went off, so load what the room has now.
    if (res.status === 409) {
      setLoaded(null);
      setAttempt((n) => n + 1);
      void refresh();
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <p className="text-muted">
        {questions.length === 1
          ? "Answer 1 short question. Pick the answer that fits you best."
          : `Answer ${questions.length} short questions. Pick the answer that fits you best.`}
      </p>
      {questions.map((q, i) => (
        <fieldset key={i} className="space-y-2">
          <legend className="mb-2 font-heading text-lg leading-snug font-semibold wrap-anywhere">
            <span className="text-muted">{`${i + 1}/${questions.length} `}</span>
            {q.question}
          </legend>
          {personas.map((p) => (
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
                  setAnswers((a) => a.map((x, j) => (j === i ? p : x)))
                }
                className="size-5 shrink-0 accent-violet"
              />
              <span className="min-w-0 leading-snug wrap-anywhere">
                {q.answers[p]}
              </span>
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
          {done} of {questions.length} answered
        </p>
      )}
    </form>
  );
}
