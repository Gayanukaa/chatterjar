"use client";

import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { Bars } from "@/components/bars";
import type { ApiResult } from "@/lib/api";
import { PERSONAS, type Persona } from "@/lib/domain";
import { useT } from "@/lib/i18n/react";
import { Button, ErrorText, Section } from "./ui";

/** Persona quiz tally with a confirmed reset. */
export function QuizPanel({
  tally,
  onReset,
}: {
  tally: Record<Persona, number> | null;
  onReset: () => Promise<ApiResult>;
}) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const items = PERSONAS.map((p) => ({
    key: p,
    label: p,
    value: Number(tally?.[p] ?? 0),
  }));
  const total = items.reduce((sum, i) => sum + i.value, 0);

  async function reset() {
    if (!window.confirm(t("admin.quiz.confirm"))) {
      return;
    }
    setBusy(true);
    setError(null);
    const res = await onReset();
    if (!res.ok) setError(res.data.error ?? t("admin.quiz.failed"));
    setBusy(false);
  }

  return (
    <Section
      id="quiz-heading"
      title={t("admin.quiz.heading")}
      action={
        <span className="text-sm tabular-nums text-muted">
          {total} {t("common.units.answer", { count: total })}
        </span>
      }
    >
      <div className="grid gap-4 rounded-xl border border-line bg-white p-4">
        {tally === null ? (
          <p className="text-muted">{t("admin.quiz.loading")}</p>
        ) : (
          <Bars items={items} />
        )}
        {error && <ErrorText>{error}</ErrorText>}
        <Button variant="danger" onClick={reset} disabled={busy}>
          <RotateCcw aria-hidden />
          {t("admin.quiz.reset")}
        </Button>
      </div>
    </Section>
  );
}
