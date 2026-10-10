"use client";

import { RotateCcw } from "lucide-react";
import { Bars } from "@/components/bars";
import type { ApiResult } from "@/lib/api";
import { PERSONAS, type Persona } from "@/lib/domain";
import { Button, ErrorText, Section } from "./ui";
import { useAction } from "./use-admin";

/** Persona quiz tally with a confirmed reset. */
export function QuizPanel({
  tally,
  onReset,
}: {
  tally: Record<Persona, number> | null;
  onReset: () => Promise<ApiResult>;
}) {
  const { busy, error, run } = useAction();
  const items = PERSONAS.map((p) => ({
    key: p,
    label: p,
    value: Number(tally?.[p] ?? 0),
  }));
  const total = items.reduce((sum, i) => sum + i.value, 0);

  async function reset() {
    if (!window.confirm("Reset the quiz tally? All quiz answers go to 0.")) {
      return;
    }
    await run("reset", onReset, "Could not reset. Try again.");
  }

  return (
    <Section
      id="quiz-heading"
      title="Quiz"
      action={
        <span className="text-sm tabular-nums text-muted">
          {total} {total === 1 ? "answer" : "answers"}
        </span>
      }
    >
      <div className="grid gap-4 rounded-xl border border-line bg-white p-4">
        {tally === null ? (
          <p className="text-muted">Loading quiz tally...</p>
        ) : (
          <Bars items={items} />
        )}
        {error && <ErrorText>{error}</ErrorText>}
        <Button variant="danger" onClick={reset} disabled={busy !== null}>
          <RotateCcw aria-hidden />
          Reset quiz tally
        </Button>
      </div>
    </Section>
  );
}
