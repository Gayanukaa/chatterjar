import { describe, expect, it } from "vitest";
import {
  REACTION_TYPES,
  isReaction,
  reactionBursts,
  reactionTotals,
} from "@/lib/domain";

const zero = { applause: 0, love: 0, idea: 0, confused: 0 };

describe("reactions", () => {
  it("knows the four reaction types", () => {
    expect(REACTION_TYPES).toEqual(["applause", "love", "idea", "confused"]);
    expect(isReaction("love")).toBe(true);
    expect(isReaction("boo")).toBe(false);
    expect(isReaction(1)).toBe(false);
  });

  it("fills missing or bad totals with 0", () => {
    expect(reactionTotals(null)).toEqual(zero);
    expect(reactionTotals({ love: "4", idea: "x", extra: 9 })).toEqual({
      ...zero,
      love: 4,
    });
  });

  it("spawns nothing on the first snapshot", () => {
    expect(reactionBursts(null, { ...zero, love: 5 }, 20)).toEqual([]);
  });

  it("spawns one icon per new reaction, types interleaved", () => {
    const next = { ...zero, applause: 3, love: 1 };
    expect(reactionBursts(zero, next, 20)).toEqual([
      "applause",
      "love",
      "applause",
      "applause",
    ]);
  });

  it("caps the spawn count and ignores totals that drop after a reset", () => {
    const prev = { ...zero, idea: 10, confused: 40 };
    const next = { ...zero, applause: 50, idea: 2, confused: 41 };
    const out = reactionBursts(prev, next, 5);
    expect(out).toEqual([
      "applause",
      "confused",
      "applause",
      "applause",
      "applause",
    ]);
    expect(reactionBursts(prev, prev, 20)).toEqual([]);
  });
});
