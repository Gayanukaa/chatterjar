export const DEFAULT_POLL_MS = 3000;
export const MIN_POLL_MS = 2000;
export const MAX_POLL_MS = 15000;

/** Client refresh interval from an env string: integer ms clamped to range. */
export function parsePollMs(raw: string | undefined): number {
  const n = Number(raw);
  if (!raw?.trim() || !Number.isFinite(n)) return DEFAULT_POLL_MS;
  return Math.min(MAX_POLL_MS, Math.max(MIN_POLL_MS, Math.round(n)));
}

// Literal access: Next.js inlines NEXT_PUBLIC_ values at build time.
export const POLL_MS = parsePollMs(process.env.NEXT_PUBLIC_POLL_MS);
