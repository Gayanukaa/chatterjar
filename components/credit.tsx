/** Quiet maker credit linking to the author's site; shown on every page.
 * `className` sets the size and spacing for each page. */
export function Credit({ className }: { className: string }) {
  return (
    <p className={`text-muted ${className}`}>
      {/* min-h-12 keeps the link a 48 px tap target on phones */}
      <a
        href="https://gayanukaa.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-12 items-center underline-offset-4 transition-colors hover:text-ink hover:underline"
      >
        Made by Gayanuka
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    </p>
  );
}
