/** Chatterjar mark: a jar of speech bubbles; the lid follows the ink token. */
export function Logo({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 128 128" aria-hidden className={className}>
      <rect x="36" y="8" width="56" height="14" rx="6" className="fill-ink" />
      <rect x="42" y="20" width="44" height="10" rx="3" className="fill-ink" />
      <path
        d="M34 30h60c8 0 14 6 14 14v56c0 11-9 20-20 20H40c-11 0-20-9-20-20V44c0-8 6-14 14-14z"
        fill="#EEF2FC"
        className="stroke-ink"
        strokeWidth="6"
      />
      <rect x="32" y="44" width="40" height="24" rx="12" fill="#2D58D2" />
      <path d="M40 66l-4 10 12-8z" fill="#2D58D2" />
      <rect x="56" y="68" width="40" height="24" rx="12" fill="#6248BE" />
      <path d="M88 90l4 10-12-8z" fill="#6248BE" />
      <rect x="34" y="94" width="30" height="18" rx="9" fill="#147A58" />
    </svg>
  );
}
