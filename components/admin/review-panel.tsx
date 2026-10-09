"use client";

import { Check, ShieldAlert, X } from "lucide-react";
import { useState } from "react";
import type { ApiResult } from "@/lib/api";
import type { PendingQuestion } from "@/lib/domain";
import { useT } from "@/lib/i18n/react";
import { Button, ErrorText, Section } from "./ui";

type Act = (path: string, payload?: unknown) => Promise<ApiResult>;

const REASONS = ["language", "link"] as const;
const isReason = (v: string): v is (typeof REASONS)[number] =>
  (REASONS as readonly string[]).includes(v);

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
  const t = useT();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The new value shows until the next admin state differs from `from`.
  const [override, setOverride] = useState<{
    value: boolean;
    from: boolean | null;
  } | null>(null);
  const checked =
    override && override.from === moderate ? override.value : moderate;

  async function run(key: string, path: string, payload: object, msg: string) {
    setBusy(key);
    setError(null);
    const res = await act(path, payload);
    if (!res.ok) setError(res.data.error ?? msg);
    setBusy(null);
    return res.ok;
  }

  async function toggle(value: boolean) {
    setOverride({ value, from: moderate });
    const ok = await run(
      "settings",
      "/api/admin/settings",
      { moderate: value },
      t("admin.review.saveFailed"),
    );
    if (!ok) setOverride(null);
  }

  async function decide(id: string, approve: boolean) {
    await run(
      id,
      approve ? "/api/admin/approve" : "/api/admin/hide",
      { id },
      approve
        ? t("admin.review.approveFailed")
        : t("admin.review.rejectFailed"),
    );
    onDone();
  }

  return (
    <Section id="review-heading" title={t("admin.review.heading")}>
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
            {t("admin.review.toggle")}
          </label>
          <p className="mt-1 text-sm text-muted">
            {t("admin.review.toggleHint")}
          </p>
        </div>
        {error && <ErrorText>{error}</ErrorText>}
        {pending === null ? (
          <p className="text-muted">{t("admin.review.loading")}</p>
        ) : pending.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line px-4 py-6 text-muted">
            {t("admin.review.empty")}
          </p>
        ) : (
          <>
            {total > pending.length && (
              <p className="text-sm text-muted">
                {t("admin.review.showing", { shown: pending.length, total })}
              </p>
            )}
            <ul
              aria-label={t("admin.review.listLabel")}
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
                        {isReason(q.flagged)
                          ? t(`admin.review.reasons.${q.flagged}`)
                          : t("admin.review.flagged")}
                      </span>
                    )}
                    <p
                      id={`pending-${q.id}`}
                      className="min-w-0 wrap-break-word"
                    >
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
                      {t("admin.review.approve")}
                    </Button>
                    <Button
                      variant="danger"
                      className="px-3"
                      aria-describedby={`pending-${q.id}`}
                      onClick={() => decide(q.id, false)}
                      disabled={busy !== null}
                    >
                      <X aria-hidden />
                      {t("admin.review.reject")}
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
