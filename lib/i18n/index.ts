import { en } from "./messages/en";

/** Plural forms of one message; Intl.PluralRules picks one, else `other`. */
export interface Plural {
  zero?: string;
  one: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
}

type Shape<T> = {
  [K in keyof T]: T[K] extends string
    ? string
    : T[K] extends Plural
      ? Plural
      : Shape<T[K]>;
};

/** The en catalog with every text widened; other catalogs must match it. */
export type Messages = Shape<typeof en>;

// Register a new language here (first entry is the fallback).
const catalogs = { en } satisfies Record<string, Messages>;

export type Locale = keyof typeof catalogs;
export const LOCALES = Object.keys(catalogs) as Locale[];
export const DEFAULT_LOCALE: Locale = LOCALES[0];
export const CATALOGS: Record<Locale, Messages> = catalogs;

type Keys<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string | Plural
    ? `${P}${K}`
    : Keys<T[K], `${P}${K}.`>;
}[keyof T & string];

export type MessageKey = Keys<Messages>;
export type Vars = Record<string, string | number>;
export type Translate = (key: MessageKey, vars?: Vars) => string;

function makeT(locale: Locale): Translate {
  const rules = new Intl.PluralRules(locale);
  return (key, vars = {}) => {
    const entry = key
      .split(".")
      .reduce<unknown>(
        (node, part) => (node as Record<string, unknown>)[part],
        CATALOGS[locale],
      ) as string | Plural;
    const text =
      typeof entry === "string"
        ? entry
        : (entry[rules.select(Number(vars.count))] ?? entry.other);
    return text.replace(/\{(\w+)\}/g, (match, name: string) =>
      name in vars ? String(vars[name]) : match,
    );
  };
}

const translators = Object.fromEntries(
  LOCALES.map((l) => [l, makeT(l)]),
) as Record<Locale, Translate>;

/** t() for a locale: dotted key, {name} values, plural forms by `count`. */
export const getT = (locale: Locale = DEFAULT_LOCALE) => translators[locale];

/** English t() for server routes; their messages still live in the catalog. */
export const t = getT(DEFAULT_LOCALE);

/** Language tags of an Accept-Language header, highest q first. */
export function parseAcceptLanguage(header: string): string[] {
  return header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.split(";").map((s) => s.trim());
      const q = params.find((p) => p.startsWith("q="));
      return { tag, q: q ? Number(q.slice(2)) : 1 };
    })
    .filter(({ tag, q }) => tag && tag !== "*" && q > 0)
    .sort((a, b) => b.q - a.q)
    .map(({ tag }) => tag);
}

/** Supported locale for one tag: exact match first, then the base language. */
function match<L extends string>(tag: string, supported: readonly L[]) {
  const lower = tag.trim().toLowerCase();
  const base = lower.split("-")[0];
  return (
    supported.find((l) => l.toLowerCase() === lower) ??
    supported.find((l) => l.toLowerCase() === base)
  );
}

/** ?lang= if supported, else the first supported browser language, else en. */
export function resolveLocale<L extends string = Locale>(
  {
    lang,
    languages = [],
  }: { lang?: string | null; languages?: readonly string[] | string },
  supported: readonly L[] = LOCALES as readonly string[] as readonly L[],
): L {
  const list =
    typeof languages === "string" ? parseAcceptLanguage(languages) : languages;
  for (const tag of [lang ?? "", ...list]) {
    const hit = tag ? match(tag, supported) : undefined;
    if (hit) return hit;
  }
  return supported[0];
}

/** Locale the LocaleProvider wrote to <html lang>; for code outside React. */
export const documentLocale = (): Locale =>
  typeof document === "undefined"
    ? DEFAULT_LOCALE
    : resolveLocale({ lang: document.documentElement.lang });
