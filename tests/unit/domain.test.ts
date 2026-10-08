import { describe, expect, it } from "vitest";
import { PACKS, packPolls } from "@/lib/packs";
import { existsSync } from "node:fs";
import {
  publicPoll,
  questionScore,
  scorePersona,
  validateQuestion,
  votesFromScore,
  createdAtFromScore,
  type Poll,
} from "@/lib/domain";

const poll: Poll = {
  id: "p1",
  question: "Q",
  options: [
    { key: "A", label: "a" },
    { key: "B", label: "b" },
  ],
  correct: "B",
  status: "open",
  createdAt: 1,
};

describe("scorePersona", () => {
  it("picks the persona with most answers", () => {
    expect(
      scorePersona(["Builder", "Builder", "Idea", "Developer", "Builder"], 5),
    ).toBe("Builder");
  });
  it("breaks a tie by list order", () => {
    expect(
      scorePersona(
        ["Developer", "Developer", "Researcher", "Researcher", "Idea"],
        5,
      ),
    ).toBe("Researcher");
  });
  it("rejects incomplete or unknown answers", () => {
    expect(scorePersona(["Idea"], 5)).toBeNull();
    expect(
      scorePersona(["Idea", "Idea", "Idea", "Idea", "Hacker"], 5),
    ).toBeNull();
  });
});

describe("publicPoll", () => {
  it("hides the answer and results before reveal", () => {
    const p = publicPoll(poll, { A: 2, B: 3 });
    expect(p.correct).toBeUndefined();
    expect(p.results).toBeUndefined();
    expect(p.total).toBe(5);
  });
  it("shows the answer and results after reveal", () => {
    const p = publicPoll({ ...poll, status: "revealed" }, { B: 3 });
    expect(p.correct).toBe("B");
    expect(p.results).toEqual({ A: 0, B: 3 });
  });
});

describe("content packs", () => {
  it("every pack is valid, with prefixed ids and real media files", () => {
    for (const pack of PACKS) {
      const polls = packPolls(pack, 1000);
      expect(polls, pack.id).not.toBeNull();
      expect(polls).toHaveLength(pack.polls.length);
      for (const poll of polls ?? []) {
        expect(poll.id.startsWith(`${pack.id}-`)).toBe(true);
        for (const o of poll.options) {
          if (o.media)
            expect(existsSync(`public${o.media.src}`), o.media.src).toBe(true);
        }
      }
    }
  });
  it("rejects a pack whose correct option does not exist", () => {
    const bad = {
      ...PACKS[0],
      polls: [{ ...PACKS[0].polls[0], correct: "D" }],
    };
    bad.polls[0].options = bad.polls[0].options.slice(0, 2);
    expect(packPolls(bad, 1)).toBeNull();
  });
  it("loads the spot pack with text and audio media", () => {
    const spot = PACKS.find((p) => p.id === "spot-the-ai");
    const polls = packPolls(spot!, 1) ?? [];
    expect(polls.map((p) => p.options[0].media?.type)).toEqual([
      "text",
      "audio",
    ]);
  });
});

describe("questions", () => {
  it("orders by votes, then newer first", () => {
    const older = questionScore(1, 1_000_000);
    const newer = questionScore(1, 2_000_000);
    const top = questionScore(2, 2_000_000);
    expect(top).toBeGreaterThan(older);
    expect(newer).toBeGreaterThan(older);
    expect(createdAtFromScore(newer)).toBe(2_000_000);
    expect(votesFromScore(top)).toBe(2);
  });
  it("validates length", () => {
    expect(validateQuestion("  hi  ")).toBe("hi");
    expect(validateQuestion("")).toBeNull();
    expect(validateQuestion("x".repeat(201))).toBeNull();
  });
});
