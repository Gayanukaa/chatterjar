"use client";

import { ArrowBigUp, EyeOff } from "lucide-react";
import type { ApiResult } from "@/lib/api";
import type { Question } from "@/lib/domain";
import { Button, ErrorText, Section } from "./ui";
import { useAction } from "./use-admin";

/** Visible student questions with upvotes and a Hide button for each. */
export function QuestionsPanel({
  questions,
  onHide,
}: {
  questions: Question[] | null;
  onHide: (id: string) => Promise<ApiResult>;
}) {
  const { busy, error, run } = useAction();
  const hide = (id: string) =>
    run(id, () => onHide(id), "Could not hide it. Try again.");

  return (
    <Section id="questions-heading" title="Questions">
      {error && (
        <div className="mb-3">
          <ErrorText>{error}</ErrorText>
        </div>
      )}
      {questions === null ? (
        <p className="text-muted">Loading questions...</p>
      ) : questions.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-6 text-muted">
          No questions yet. Student questions show here.
        </p>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line bg-white">
          {questions.map((q) => (
            <li key={q.id} className="flex items-center gap-3 p-3 pl-4">
              <span className="flex w-10 shrink-0 flex-col items-center text-blue">
                <ArrowBigUp aria-hidden className="size-5" />
                <span className="font-semibold tabular-nums">{q.votes}</span>
                <span className="sr-only">
                  {q.votes === 1 ? "upvote" : "upvotes"}
                </span>
              </span>
              <p className="min-w-0 flex-1 wrap-break-word">{q.text}</p>
              <Button
                className="px-3"
                onClick={() => hide(q.id)}
                disabled={busy !== null}
              >
                <EyeOff aria-hidden />
                Hide
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
