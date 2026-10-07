export interface BarItem {
  key: string;
  label: string;
  value: number;
  highlight?: boolean;
}

/** Horizontal result bars; widths animate when values change. */
export function Bars({
  items,
  large = false,
}: {
  items: BarItem[];
  large?: boolean;
}) {
  const total = items.reduce((sum, i) => sum + i.value, 0);
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className={large ? "space-y-5" : "space-y-3"}>
      {items.map((item) => {
        const pct = total ? Math.round((item.value / total) * 100) : 0;
        return (
          <li key={item.key}>
            <div
              className={`flex items-baseline justify-between gap-3 ${large ? "text-3xl" : "text-base"}`}
            >
              <span
                className={`font-semibold ${item.highlight ? "text-green" : "text-ink"}`}
              >
                {item.label}
              </span>
              <span className="tabular-nums text-muted">
                {item.value} ({pct}%)
              </span>
            </div>
            <div
              className={`mt-1.5 w-full overflow-hidden rounded-full bg-line ${large ? "h-7" : "h-3"}`}
            >
              <div
                className={`h-full rounded-full transition-[width] duration-700 ease-out ${item.highlight ? "bg-green" : "bg-blue"}`}
                style={{ width: `${(item.value / max) * 100}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
