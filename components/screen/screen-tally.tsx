import { Bars } from "@/components/bars";

/** Persona quiz tally in the room quiz's persona order. */
export function ScreenTally({
  personas,
  tally,
}: {
  personas: string[];
  tally: Record<string, number>;
}) {
  const items = personas.map((p) => ({
    key: p,
    label: p,
    value: tally[p] ?? 0,
  }));
  const total = items.reduce((sum, i) => sum + i.value, 0);
  // The starter quiz (5 short names) fits lg at 1280 x 720; more needs md.
  const dense = personas.length > 5 || personas.some((p) => p.length > 12);
  return (
    // min-h-0 lets it shrink, so a long tally never pushes the QR card down.
    <section
      data-testid="screen-tally"
      aria-labelledby="screen-tally-title"
      className="min-h-0 overflow-hidden"
    >
      <h2
        id="screen-tally-title"
        className="font-heading text-3xl font-semibold tracking-tight"
      >
        Persona quiz
      </h2>
      <p className="mt-1 text-xl text-muted">
        {total} {total === 1 ? "answer" : "answers"}
      </p>
      <div className="mt-6">
        <Bars items={items} size={dense ? "md" : "lg"} />
      </div>
    </section>
  );
}
