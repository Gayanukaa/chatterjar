"use client";

import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { DEFAULT_LOCALE, getT, resolveLocale, type Locale } from "./index";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);
const noop = () => () => {};
const browserLocale = () =>
  resolveLocale({
    lang: new URLSearchParams(window.location.search).get("lang"),
    languages: navigator.languages,
  });

/** Picks the locale in the browser; pages stay static, so the server uses en. */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(
    noop,
    browserLocale,
    () => DEFAULT_LOCALE,
  );
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return <LocaleContext value={locale}>{children}</LocaleContext>;
}

export const useLocale = () => useContext(LocaleContext);

/** t() for the current locale; the function is stable per locale. */
export const useT = () => getT(useLocale());
