import { Bars } from "@/components/bars";
import { PERSONAS, type Persona } from "@/lib/domain";
import { useT } from "@/lib/i18n/react";

/** Persona quiz tally in PERSONAS order. */
export function ScreenTally({ tally }: { tally: Record<Persona, number> }) {
  const t = useT();
  const items = PERSONAS.map((p) => ({
    key: p,
    label: p,
    value: tally[p] ?? 0,
  }));
  const total = items.reduce((sum, i) => sum + i.value, 0);
  return (
    <section data-testid="screen-tally" aria-labelledby="screen-tally-title">
      <h2
        id="screen-tally-title"
        className="font-heading text-3xl font-semibold tracking-tight"
      >
        {t("screen.personaQuiz")}
      </h2>
      <p className="mt-1 text-xl text-muted">
        {total} {t("common.units.answer", { count: total })}
      </p>
      <div className="mt-6">
        <Bars items={items} large />
      </div>
    </section>
  );
}
