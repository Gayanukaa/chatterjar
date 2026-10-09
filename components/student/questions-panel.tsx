"use client";

import { ArrowBigUp, Send } from "lucide-react";
import { useState } from "react";
import { post, withRoom } from "@/lib/api";
import { useRoom } from "@/components/room";
import { MAX_QUESTION, type Question } from "@/lib/domain";
import { ErrorNote, errorText } from "./error-note";

/** Ask form plus the question list in server order, with upvotes. */
export function QuestionsPanel({
  questions,
  upvoted,
  refresh,
}: {
  questions: Question[];
  upvoted: string[];
  refresh: () => Promise<void>;
}) {
  const room = useRoom();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sentNote, setSentNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mine, setMine] = useState<string[]>([]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    setSentNote("");
    const res = await post(withRoom("/api/question", room), { text });
    setSending(false);
    if (res.ok) {
      setText("");
      setSentNote(
        res.data.pending
          ? "Sent. The host will review your question."
          : "Question sent.",
      );
      await refresh();
    } else {
      setError(errorText(res.data, "Your question did not go through."));
    }
  }

  async function upvote(id: string) {
    setError(null);
    setMine((m) => [...m, id]);
    const res = await post(withRoom("/api/upvote", room), { id });
    if (res.ok) await refresh();
    else {
      setMine((m) => m.filter((x) => x !== id));
      setError(errorText(res.data, "Your upvote did not go through."));
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={send} className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor="question-text" className="font-semibold">
            Your question
          </label>
          <span
            id="question-count"
            className={`text-sm tabular-nums ${text.length >= MAX_QUESTION ? "text-rose" : "text-muted"}`}
          >
            {text.length}/{MAX_QUESTION}
          </span>
        </div>
        <textarea
          id="question-text"
          aria-describedby="question-count"
          value={text}
          maxLength={MAX_QUESTION}
          rows={3}
          onChange={(e) => {
            setText(e.target.value);
            setSentNote("");
          }}
          placeholder="Ask the speaker anything"
          className="block w-full resize-none rounded-xl bg-white px-3 py-3 text-base text-ink ring-1 ring-line placeholder:text-muted focus:ring-2 focus:ring-blue focus:outline-none"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue px-4 font-semibold text-white transition-colors hover:bg-blue/90 active:bg-ink disabled:bg-line disabled:text-muted"
        >
          <Send aria-hidden className="size-5" />
          {sending ? "Sending..." : "Send question"}
        </button>
        <ErrorNote message={error} />
        <p role="status" className="text-sm text-green empty:hidden">
          {sentNote}
        </p>
      </form>

      <section aria-labelledby="questions-heading" className="space-y-3">
        <h2 id="questions-heading" className="text-xl font-semibold">
          Questions from the room
        </h2>
        {questions.length === 0 ? (
          <p className="text-muted">No questions yet. Ask the first one.</p>
        ) : (
          <ul className="space-y-2">
            {questions.map((q) => {
              const done = upvoted.includes(q.id) || mine.includes(q.id);
              return (
                <li
                  key={q.id}
                  data-testid="question"
                  className="flex items-start gap-3 rounded-2xl bg-white p-3 ring-1 ring-line"
                >
                  <p className="min-w-0 flex-1 self-center leading-snug break-words">
                    {q.text}
                  </p>
                  <button
                    type="button"
                    aria-label={`Upvote question (${q.votes} votes)`}
                    aria-pressed={done}
                    disabled={done}
                    onClick={() => upvote(q.id)}
                    className="flex min-h-12 min-w-14 shrink-0 flex-col items-center justify-center rounded-xl px-2 text-ink ring-1 ring-line transition-colors hover:bg-blue/[0.06] aria-pressed:bg-blue/10 aria-pressed:text-blue aria-pressed:ring-blue/40"
                  >
                    <ArrowBigUp
                      aria-hidden
                      className={`size-5 ${done ? "fill-current" : ""}`}
                    />
                    <span className="text-sm font-semibold tabular-nums">
                      {q.votes}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
