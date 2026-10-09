"use client";

import { ArrowBigUp, EyeOff } from "lucide-react";
import { useState } from "react";
import type { ApiResult } from "@/lib/api";
import type { Question } from "@/lib/domain";
import { useT } from "@/lib/i18n/react";
import { Button, ErrorText, Section } from "./ui";

/** Visible student questions with upvotes and a Hide button for each. */
export function QuestionsPanel({
  questions,
  onHide,
}: {
  questions: Question[] | null;
  onHide: (id: string) => Promise<ApiResult>;
}) {
  const t = useT();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function hide(id: string) {
    setBusy(id);
    setError(null);
    const res = await onHide(id);
    if (!res.ok) setError(res.data.error ?? t("admin.questions.failed"));
    setBusy(null);
  }

  return (
    <Section id="questions-heading" title={t("admin.questions.heading")}>
      {error && (
        <div className="mb-3">
          <ErrorText>{error}</ErrorText>
        </div>
      )}
      {questions === null ? (
        <p className="text-muted">{t("admin.questions.loading")}</p>
      ) : questions.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-6 text-muted">
          {t("admin.questions.empty")}
        </p>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line bg-white">
          {questions.map((q) => (
            <li key={q.id} className="flex items-center gap-3 p-3 pl-4">
              <span className="flex w-10 shrink-0 flex-col items-center text-blue">
                <ArrowBigUp aria-hidden className="size-5" />
                <span className="font-semibold tabular-nums">{q.votes}</span>
                <span className="sr-only">
                  {t("common.units.upvote", { count: q.votes })}
                </span>
              </span>
              <p className="min-w-0 flex-1 wrap-break-word">{q.text}</p>
              <Button
                className="px-3"
                onClick={() => hide(q.id)}
                disabled={busy !== null}
              >
                <EyeOff aria-hidden />
                {t("admin.questions.hide")}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
