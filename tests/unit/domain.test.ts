import { describe, expect, it } from "vitest";
import rounds from "@/data/rounds.json";
import {
  buildPresets,
  publicPoll,
  questionScore,
  scorePersona,
  validateQuestion,
  votesFromScore,
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

describe("buildPresets", () => {
  const presets = buildPresets(rounds, 1000);
  it("builds 5 rounds and the exam question with fixed ids", () => {
    expect(presets.map((p) => p.id)).toEqual([
      "spot-1",
      "spot-2",
      "spot-3",
      "spot-4",
      "spot-5",
      "exam-1",
    ]);
    expect(presets[5].correct).toBe("B");
  });
  it("names rounds without the type prefix and maps media", () => {
    expect(presets[0].question).toBe(
      "Round 1: cats. Which one did an AI make?",
    );
    expect(presets[1].options[0].media).toEqual({
      type: "code",
      src: "/spot/assets/round2_code_A.java",
    });
    expect(presets[4].options[1].media?.type).toBe("audio");
  });
});

describe("questions", () => {
  it("orders by votes, then older first", () => {
    const older = questionScore(1, 1_000_000);
    const newer = questionScore(1, 2_000_000);
    const top = questionScore(2, 2_000_000);
    expect(top).toBeGreaterThan(older);
    expect(older).toBeGreaterThan(newer);
    expect(votesFromScore(top)).toBe(2);
  });
  it("validates length", () => {
    expect(validateQuestion("  hi  ")).toBe("hi");
    expect(validateQuestion("")).toBeNull();
    expect(validateQuestion("x".repeat(201))).toBeNull();
  });
});
