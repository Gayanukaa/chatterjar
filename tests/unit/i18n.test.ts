import { describe, expect, it } from "vitest";
import {
  CATALOGS,
  DEFAULT_LOCALE,
  LOCALES,
  getT,
  parseAcceptLanguage,
  resolveLocale,
  t,
} from "@/lib/i18n";
import { en } from "@/lib/i18n/messages/en";

/** Dotted keys of a catalog; a plural form group counts as one key. */
function keys(node: object, prefix = ""): string[] {
  return Object.entries(node).flatMap(([k, v]) =>
    typeof v === "string" || "other" in v
      ? [prefix + k]
      : keys(v, `${prefix}${k}.`),
  );
}

describe("t()", () => {
  it("returns the English text and fills {name} values", () => {
    expect(t("student.vote.noPoll")).toBe("No poll yet");
    expect(t("student.vote.option", { key: "A" })).toBe("Vote A");
    expect(t("admin.review.showing", { shown: 3, total: 9 })).toBe(
      "Showing 3 of 9",
    );
  });

  it("leaves a placeholder without a value as it is", () => {
    expect(t("student.vote.option")).toBe("Vote {key}");
  });

  it("picks the plural form from count", () => {
    expect(t("common.units.vote", { count: 1 })).toBe("vote");
    expect(t("common.units.vote", { count: 0 })).toBe("votes");
    expect(t("common.units.vote", { count: 2 })).toBe("votes");
    expect(t("common.stars", { count: 1 })).toBe("1 star");
    expect(t("common.stars", { count: 5 })).toBe("5 stars");
    expect(t("admin.polls.packOption", { title: "Demo", count: 1 })).toBe(
      "Demo (1 poll)",
    );
  });

  it("server t() is the default-locale translator", () => {
    expect(getT()).toBe(t);
    expect(getT(DEFAULT_LOCALE)("api.alreadyVoted")).toBe(
      "You already voted in this poll.",
    );
  });
});

describe("resolveLocale", () => {
  const supported = ["en", "si", "ta"];

  it("uses a supported ?lang= before the browser languages", () => {
    expect(resolveLocale({ lang: "ta", languages: ["si"] }, supported)).toBe(
      "ta",
    );
    expect(resolveLocale({ lang: "en" })).toBe("en");
  });

  it("takes the first supported browser language in order", () => {
    const languages = ["fr-FR", "si-LK", "en-US"];
    expect(resolveLocale({ languages }, supported)).toBe("si");
    expect(resolveLocale({ lang: "xx", languages }, supported)).toBe("si");
  });

  it("reads an Accept-Language header by q value", () => {
    const header = "fr;q=0.9, ta;q=0.5, si-LK;q=0.8, *;q=0.1";
    expect(parseAcceptLanguage(header)).toEqual(["fr", "si-LK", "ta"]);
    expect(resolveLocale({ languages: header }, supported)).toBe("si");
  });

  it("falls back to en when nothing is supported", () => {
    expect(resolveLocale({ lang: "xx", languages: ["fr", "de"] })).toBe("en");
    expect(resolveLocale({}, supported)).toBe("en");
    expect(resolveLocale({ lang: "xx" })).toBe(DEFAULT_LOCALE);
  });
});

describe("catalogs", () => {
  it("lists en first as the default", () => {
    expect(LOCALES[0]).toBe("en");
    expect(DEFAULT_LOCALE).toBe("en");
  });

  it("every catalog has exactly the keys of en", () => {
    const expected = keys(en).sort();
    for (const locale of LOCALES) {
      expect(keys(CATALOGS[locale]).sort(), locale).toEqual(expected);
    }
  });
});
