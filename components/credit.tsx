const REPO = "https://github.com/Gayanukaa/chatterjar";
// lucide-react has no brand icons, so this is GitHub's own mark (Octicons).
const GITHUB_MARK =
  "M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z";
const LINK =
  "inline-flex min-h-12 items-center underline-offset-4 transition-colors hover:text-ink hover:underline";

/** Quiet maker credit and repo link; shown on every page.
 * `className` sets the size, spacing and alignment for each page. */
export function Credit({ className }: { className: string }) {
  return (
    <p
      className={`flex flex-wrap items-center gap-x-1 text-muted ${className}`}
    >
      {/* min-h-12 keeps both links 48 px tap targets on phones */}
      <a
        href="https://gayanukaa.com/"
        target="_blank"
        rel="noopener noreferrer"
        className={LINK}
      >
        Made by Gayanuka
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
      <a
        href={REPO}
        target="_blank"
        rel="noopener noreferrer"
        title="Source code on GitHub"
        className={`${LINK} min-w-12 justify-center`}
      >
        <svg
          viewBox="0 0 16 16"
          aria-hidden
          className="size-[1.25em] fill-current"
        >
          <path d={GITHUB_MARK} />
        </svg>
        <span className="sr-only">
          Chatterjar source code on GitHub (opens in a new tab)
        </span>
      </a>
    </p>
  );
}
