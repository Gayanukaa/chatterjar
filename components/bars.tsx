interface BarItem {
  key: string;
  label: string;
  value: number;
  highlight?: boolean;
}

// base: phones and admin. Projector: lg, or md for many or long labels.
const SIZE = {
  base: { list: "space-y-3", text: "text-base", bar: "h-3" },
  md: { list: "space-y-4", text: "text-2xl", bar: "h-5" },
  lg: { list: "space-y-5", text: "text-3xl", bar: "h-7" },
};

/** Horizontal result bars; fills slide when values change. */
export function Bars({
  items,
  size = "base",
}: {
  items: BarItem[];
  size?: keyof typeof SIZE;
}) {
  const s = SIZE[size];
  const total = items.reduce((sum, i) => sum + i.value, 0);
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className={s.list}>
      {items.map((item) => {
        const pct = total ? Math.round((item.value / total) * 100) : 0;
        return (
          <li key={item.key}>
            <div
              className={`flex items-baseline justify-between gap-3 ${s.text}`}
            >
              <span
                className={`min-w-0 font-semibold wrap-anywhere ${item.highlight ? "text-green" : "text-ink"}`}
              >
                {item.label}
              </span>
              <span className="shrink-0 tabular-nums text-muted">
                {item.value} ({pct}%)
              </span>
            </div>
            <div
              className={`mt-1.5 w-full overflow-hidden rounded-full bg-line ${s.bar}`}
            >
              {/* translateX skips layout and keeps the round end; 0 fades out. */}
              <div
                className={`h-full w-full rounded-full transition-[transform,opacity] duration-700 ease-out ${item.highlight ? "bg-green" : "bg-blue"} ${item.value ? "" : "opacity-0"}`}
                style={{
                  transform: `translateX(-${100 - (item.value / max) * 100}%)`,
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
