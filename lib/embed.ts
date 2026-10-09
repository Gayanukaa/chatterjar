// No "@/" imports: next.config.ts loads this file outside the app bundler.

export const EMBED_SHOWS = ["poll", "questions", "tally", "qr", "all"] as const;
export type EmbedShow = (typeof EMBED_SHOWS)[number];

export interface EmbedOptions {
  show: EmbedShow;
  theme: "light" | "dark";
  transparent: boolean;
}

type Param = string | string[] | undefined;
const one = (v: Param) => (Array.isArray(v) ? v[0] : v);

/** Embed query (?show=, ?theme=, ?bg=); unknown values fall back to defaults. */
export function parseEmbed(query: Record<string, Param>): EmbedOptions {
  const show = one(query.show);
  return {
    show: EMBED_SHOWS.includes(show as EmbedShow)
      ? (show as EmbedShow)
      : "poll",
    theme: one(query.theme) === "dark" ? "dark" : "light",
    transparent: one(query.bg) === "transparent",
  };
}

/** Query string for the embed options; defaults are left out. */
export function embedQuery({ show, theme, transparent }: EmbedOptions) {
  const q = new URLSearchParams();
  if (show !== "poll") q.set("show", show);
  if (theme !== "light") q.set("theme", theme);
  if (transparent) q.set("bg", "transparent");
  const s = q.toString();
  return s ? `?${s}` : "";
}

const EMBED_SOURCES = ["/embed", "/r/:code/embed"];

/** Security headers: only the embed pages may be framed by other sites. */
export function frameHeaders() {
  return [
    {
      // Every path except the embed pages (Next.js negative lookahead).
      source: "/:path((?!embed$|r/[^/]+/embed$).*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
      ],
    },
    ...EMBED_SOURCES.map((source) => ({
      source,
      headers: [{ key: "Content-Security-Policy", value: "frame-ancestors *" }],
    })),
  ];
}
