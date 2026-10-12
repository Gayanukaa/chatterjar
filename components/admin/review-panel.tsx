"use client";

import { Check, ShieldAlert, X } from "lucide-react";
import { useState } from "react";
import type { PendingQuestion } from "@/lib/domain";
import { Button, ErrorText, Section } from "./ui";
import { useAction, type Act } from "./use-admin";

const REASONS = { language: "Strong language", link: "Contains a link" };
const isReason = (v: string): v is keyof typeof REASONS =>
  Object.hasOwn(REASONS, v);

/** Review setting plus the queue of questions that wait for the host. */
export function ReviewPanel({
  moderate,
  pending,
  total,
  act,
  onDone,
}: {
  moderate: boolean | null;
  pending: PendingQuestion[] | null;
  total: number;
  act: Act;
  onDone: () => void;
}) {
  const { busy, error, run: start } = useAction();
  // The new value shows until the next admin state differs from `from`.
  const [override, setOverride] = useState<{
    value: boolean;
    from: boolean | null;
  } | null>(null);
  const checked =
    override && override.from === moderate ? override.value : moderate;

  const run = (key: string, path: string, payload: object, msg: string) =>
    start(key, () => act(path, payload), msg);

  async function toggle(value: boolean) {
    setOverride({ value, from: moderate });
    const ok = await run(
      "settings",
      "/api/admin/settings",
      { moderate: value },
      "Could not save the setting. Try again.",
    );
    if (!ok) setOverride(null);
  }

  async function decide(id: string, approve: boolean) {
    await run(
      id,
      approve ? "/api/admin/approve" : "/api/admin/hide",
      { id },
      approve
        ? "Could not approve it. Try again."
        : "Could not reject it. Try again.",
    );
    onDone();
  }

  return (
    <Section id="review-heading" title="Question review">
      <div className="grid gap-4">
        <div className="rounded-xl border border-line bg-white p-4">
          <label className="flex min-h-12 cursor-pointer items-center gap-3 font-semibold">
            <input
              type="checkbox"
              className="size-6 shrink-0 cursor-pointer accent-blue"
              checked={checked ?? false}
              disabled={checked === null || busy === "settings"}
              onChange={(e) => void toggle(e.target.checked)}
            />
            Approve questions before they show
          </label>
          <p className="mt-1 text-sm text-muted">
            Questions with strong language or a link always wait here.
          </p>
        </div>
        {error && <ErrorText>{error}</ErrorText>}
        {pending === null ? (
          <p className="text-muted">Loading questions...</p>
        ) : pending.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line px-4 py-6 text-muted">
            No questions wait for review.
          </p>
        ) : (
          <>
            {total > pending.length && (
              <p className="text-sm text-muted">
                Showing {pending.length} of {total}
              </p>
            )}
            <ul
              aria-label="Questions to review"
              className="divide-y divide-line rounded-xl border border-line bg-white"
            >
              {pending.map((q) => (
                <li
                  key={q.id}
                  data-testid="pending-question"
                  className="grid gap-3 p-3 pl-4"
                >
                  <div className="grid gap-1.5">
                    {q.flagged && (
                      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-amber/10 px-2.5 py-0.5 text-sm font-medium text-amber">
                        <ShieldAlert aria-hidden className="size-4" />
                        {isReason(q.flagged) ? REASONS[q.flagged] : "Flagged"}
                      </span>
                    )}
                    <p id={`pending-${q.id}`} className="min-w-0 wrap-anywhere">
                      {q.text}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="primary"
                      className="px-3"
                      aria-describedby={`pending-${q.id}`}
                      onClick={() => decide(q.id, true)}
                      disabled={busy !== null}
                    >
                      <Check aria-hidden />
                      Approve
                    </Button>
                    <Button
                      variant="danger"
                      className="px-3"
                      aria-describedby={`pending-${q.id}`}
                      onClick={() => decide(q.id, false)}
                      disabled={busy !== null}
                    >
                      <X aria-hidden />
                      Reject
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </Section>
  );
}
