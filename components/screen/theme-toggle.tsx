"use client";

import { Moon, Sun } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  THEME_STORE_KEY,
  pickTheme,
  type ScreenTheme,
} from "@/lib/screen-theme";
import { useT } from "@/lib/i18n/react";

function readStored(): string | null {
  try {
    return localStorage.getItem(THEME_STORE_KEY);
  } catch {
    return null;
  }
}

/** Projector theme from ?theme= or localStorage; `initial` on the first paint. */
export function useScreenTheme(initial: ScreenTheme = "light") {
  const [theme, setTheme] = useState<ScreenTheme>(initial);

  useEffect(() => {
    const t = setTimeout(() => {
      const param = new URLSearchParams(window.location.search).get("theme");
      setTheme(pickTheme(param, readStored()));
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const toggle = useCallback(() => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      localStorage.setItem(THEME_STORE_KEY, next);
    } catch {
      // Storage can be blocked; the choice then lasts until reload.
    }
  }, [theme]);

  return { theme, toggle };
}

/** Footer button that switches the projector between light and dark. */
export function ThemeToggle({
  theme,
  onToggle,
}: {
  theme: ScreenTheme;
  onToggle: () => void;
}) {
  const t = useT();
  const dark = theme === "dark";
  const Icon = dark ? Sun : Moon;
  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-lg border border-line px-4 text-lg font-semibold text-muted transition-colors hover:border-muted hover:text-ink"
    >
      <Icon aria-hidden className="size-5 shrink-0" />
      {dark ? t("screen.lightTheme") : t("screen.darkTheme")}
    </button>
  );
}
