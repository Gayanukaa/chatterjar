import { describe, expect, it } from "vitest";
import { PACKS, packPolls } from "@/lib/packs";
import { existsSync } from "node:fs";
import {
  isMediaSrc,
  normalizeWord,
  optionsFor,
  publicPoll,
  topWords,
  questionScore,
  storedVote,
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

describe("publicPoll", () => {
  it("hides the answer and results before reveal", () => {
    const p = publicPoll(poll, { A: 2, B: 3 });
    expect(p.correct).toBeUndefined();
    expect(p.results).toBeUndefined();
    expect(p.total).toBe(5);
  });
  it("shows the answer and results after reveal", () => {
    const p = publicPoll({ ...poll, status: "revealed" }, { B: 3 });
    expect(p.kind).toBe("choice");
    expect(p.correct).toBe("B");
    expect(p.results).toEqual({ A: 0, B: 3 });
  });
  it("words: only the total before reveal, top words after", () => {
    const words: Poll = { ...poll, kind: "words", options: [], correct: "x" };
    const votes = { rust: 3, go: 1 };
    const open = publicPoll(words, votes);
    expect(open.kind).toBe("words");
    expect(open.total).toBe(4);
    expect(open.results).toBeUndefined();
    const shown = publicPoll({ ...words, status: "revealed" }, votes);
    expect(shown.results).toEqual({ rust: 3, go: 1 });
    expect(shown.correct).toBeUndefined();
    const many = Object.fromEntries(
      Array.from({ length: 50 }, (_, i) => [`w${i}`, i + 1]),
    );
    const top = publicPoll({ ...words, status: "revealed" }, many);
    expect(Object.keys(top.results ?? {})).toHaveLength(40);
    expect(top.results?.w49).toBe(50);
  });
  it("shows a stored poll of a retired kind as choice", () => {
    const old = { ...poll, kind: "rating", status: "revealed" } as unknown;
    const p = publicPoll(old as Poll, { A: 1 });
    expect(p.kind).toBe("choice");
    expect(p.results).toEqual({ A: 1, B: 0 });
  });
});

describe("word cloud answers", () => {
  it("trims, collapses spaces and lowercases", () => {
    expect(normalizeWord("  Open   Source ")).toBe("open source");
    expect(normalizeWord("Self-hosted")).toBe("self-hosted");
    expect(normalizeWord("Café 2")).toBe("café 2");
  });
  it("rejects empty, long, symbol and non-text answers", () => {
    expect(normalizeWord("   ")).toBeNull();
    expect(normalizeWord("x".repeat(25))).toBeNull();
    expect(normalizeWord("x".repeat(24))).toBe("x".repeat(24));
    expect(normalizeWord("hi!")).toBeNull();
    expect(normalizeWord("<b>")).toBeNull();
    expect(normalizeWord(42)).toBeNull();
    expect(normalizeWord("-")).toBeNull();
    expect(normalizeWord("- -")).toBeNull();
  });
  it("accepts Sinhala and Tamil words with vowel signs", () => {
    expect(normalizeWord("ආයුබෝවන්")).toBe("ආයුබෝවන්");
    expect(normalizeWord("ශ්\u200Dරී ලංකා")).toBe("ශ්\u200Dරී ලංකා");
    expect(normalizeWord("வணக்கம்")).toBe("வணக்கம்");
  });
  it("counts NFC and NFD forms as the same word", () => {
    const nfd = "Café".normalize("NFD");
    expect(nfd).not.toBe("Café".normalize("NFC"));
    expect(normalizeWord(nfd)).toBe(normalizeWord("Café".normalize("NFC")));
    expect(normalizeWord(nfd)).toBe("café".normalize("NFC"));
  });
  it("strips the word prefix from stored votes", () => {
    expect(storedVote("w:null")).toBe("null");
    expect(storedVote("w:123")).toBe("123");
    expect(storedVote("A")).toBe("A");
    expect(storedVote(3)).toBe("3");
    expect(storedVote(null)).toBeNull();
  });
  it("keeps the top words, highest count first", () => {
    const votes = { b: 2, a: 2, c: 5, d: 0 };
    expect(topWords(votes)).toEqual([
      ["c", 5],
      ["a", 2],
      ["b", 2],
    ]);
    expect(topWords(votes, 1)).toEqual([["c", 5]]);
  });
});

describe("poll options", () => {
  it("words has none and choice needs 2 to 4", () => {
    expect(optionsFor("words", [{ label: "a" }])).toEqual([]);
    expect(optionsFor("choice", [{ label: "a" }])).toBeNull();
  });
});

describe("content packs", () => {
  it("every pack is valid, with prefixed ids and usable media", () => {
    for (const pack of PACKS) {
      const polls = packPolls(pack, 1000);
      expect(polls, pack.id).not.toBeNull();
      expect(polls).toHaveLength(pack.polls.length);
      for (const poll of polls ?? []) {
        expect(poll.id.startsWith(`${pack.id}-`)).toBe(true);
        for (const o of poll.options) {
          if (!o.media) continue;
          // Site paths must exist; links are checked by isMediaSrc.
          const local = o.media.src.startsWith("/");
          if (local) expect(existsSync(`public${o.media.src}`)).toBe(true);
          else expect(isMediaSrc(o.media.src), o.media.src).toBe(true);
        }
      }
    }
  });
  it("rejects a pack whose correct option does not exist", () => {
    const bad = {
      ...PACKS[0],
      polls: [{ ...PACKS[0].polls[0], correct: "D" }],
    };
    bad.polls[0].options = bad.polls[0].options?.slice(0, 2);
    expect(packPolls(bad, 1)).toBeNull();
  });
  it("builds word cloud polls from the demo pack", () => {
    const demo = PACKS.find((p) => p.id === "demo");
    const polls = packPolls(demo!, 1) ?? [];
    const words = polls.find((p) => p.kind === "words");
    expect(words?.options).toEqual([]);
  });
  it("rejects unknown kinds and options or answers on other kinds", () => {
    const base = { id: "x", question: "Q" };
    const pack = (poll: object) => ({
      ...PACKS[0],
      polls: [{ ...base, ...poll }],
    });
    expect(packPolls(pack({ kind: "essay" }), 1)).toBeNull();
    expect(packPolls(pack({ kind: "words", correct: "A" }), 1)).toBeNull();
    expect(packPolls(pack({ kind: "rating" }), 1)).toBeNull();
    expect(packPolls(pack({ kind: "words" }), 1)).toHaveLength(1);
  });
  it("loads the spot pack with image, text and audio rounds", () => {
    const spot = PACKS.find((p) => p.id === "spot-the-ai");
    const polls = packPolls(spot!, 1) ?? [];
    expect(polls.map((p) => p.options[0].media?.type)).toEqual([
      "image",
      "text",
      "image",
      "audio",
    ]);
    // The AI side varies, so A is not always the answer.
    expect(new Set(polls.map((p) => p.correct)).size).toBe(2);
  });
});

describe("media links", () => {
  it("accepts site paths and https links on the allowed hosts only", () => {
    expect(isMediaSrc("/img/a.png")).toBe(true);
    expect(isMediaSrc("https://upload.wikimedia.org/a.jpg")).toBe(true);
    expect(isMediaSrc("https://raw.githubusercontent.com/o/r/a.txt")).toBe(
      true,
    );
    expect(isMediaSrc("//evil.example/a.png")).toBe(false);
    expect(isMediaSrc("http://upload.wikimedia.org/a.jpg")).toBe(false);
    expect(isMediaSrc("https://evil.example/a.jpg")).toBe(false);
    expect(isMediaSrc("javascript:alert(1)")).toBe(false);
    expect(isMediaSrc(42)).toBe(false);
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
