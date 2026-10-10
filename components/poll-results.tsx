import { topWords } from "@/lib/domain";

const TONES = [
  "text-blue",
  "text-green",
  "text-rose",
  "text-violet",
  "text-amber",
  "text-ink",
];

/** Revealed word cloud answers; font size grows with each word's count. */
export function WordCloud({
  results,
  large = false,
}: {
  results: Record<string, number>;
  large?: boolean;
}) {
  const ranked = topWords(results);
  if (!ranked.length) {
    return (
      <p className={large ? "text-3xl text-muted" : "text-muted"}>
        No answers yet.
      </p>
    );
  }
  // Biggest words land in the middle: alternate adding to each end.
  const words: [string, number, number][] = [];
  ranked.forEach(([w, n], i) => {
    if (i % 2) words.unshift([w, n, i]);
    else words.push([w, n, i]);
  });
  const max = ranked[0][1];
  // Many words share the space: shrink the size range so 40 fit at 1600 x 900.
  const many = ranked.length > 20;
  const fit = Math.min(1, Math.max(0.35, Math.sqrt(8 / ranked.length)));
  const [min, span] = large ? [many ? 1.25 : 1.5, 3.5 * fit] : [1, 1.5 * fit];
  return (
    <ul
      data-testid="word-cloud"
      aria-label="Word cloud"
      className={`flex flex-wrap items-center justify-center ${large ? `h-full content-center-safe overflow-hidden ${many ? "gap-x-6 gap-y-2" : "gap-x-8 gap-y-3"}` : "gap-x-4 gap-y-1"}`}
    >
      {words.map(([w, n, i]) => (
        <li
          key={w}
          className={`font-heading leading-tight font-semibold wrap-anywhere ${TONES[i % TONES.length]}`}
          style={{ fontSize: `${min + (span * n) / max}rem` }}
        >
          {w}
          <span className="sr-only">, {n}</span>
        </li>
      ))}
    </ul>
  );
}
