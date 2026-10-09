export type ScreenTheme = "light" | "dark";

export const THEME_STORE_KEY = "chatterjar-screen-theme";

const isTheme = (v: unknown): v is ScreenTheme => v === "light" || v === "dark";

/** Projector theme: ?theme= wins, then the saved choice, then light. */
export function pickTheme(
  param: string | null,
  stored: string | null,
): ScreenTheme {
  if (isTheme(param)) return param;
  return isTheme(stored) ? stored : "light";
}
