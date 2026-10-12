import { describe, expect, it } from "vitest";
import {
  QUIZ_OFF,
  STARTER,
  adminQuiz,
  checkQuiz,
  nextStored,
  parseQuiz,
  roomQuiz,
  scorePersona,
  tallyFor,
  type Quiz,
} from "@/lib/quiz";

const small: Quiz = {
  personas: ["Owl", "Fox", "Bee"],
  questions: [
    {
      question: "Morning?",
      answers: { Owl: "Late", Fox: "Early", Bee: "Busy" },
    },
    { question: "Snack?", answers: { Owl: "Tea", Fox: "Fruit", Bee: "Honey" } },
  ],
};

describe("parseQuiz", () => {
  it("accepts a valid quiz and trims its text", () => {
    const quiz = parseQuiz({
      personas: [" Owl ", "Fox"],
      questions: [{ question: " Q? ", answers: { " Owl": " a ", Fox: "b" } }],
    });
    expect(quiz).toEqual({
      personas: ["Owl", "Fox"],
      questions: [{ question: "Q?", answers: { Owl: "a", Fox: "b" } }],
    });
    expect(parseQuiz(STARTER)).toEqual(STARTER);
  });
  it("rejects too few or too many personas", () => {
    expect(parseQuiz({ ...small, personas: ["Owl"] })).toBeNull();
    const seven = ["a", "b", "c", "d", "e", "f", "g"];
    expect(checkQuiz({ ...small, personas: seven })).toBe(
      "Add 2 to 6 personas.",
    );
  });
  it("rejects duplicate personas, ignoring case and spaces", () => {
    expect(checkQuiz({ ...small, personas: ["Owl", "owl ", "Bee"] })).toBe(
      "Give each persona a different name.",
    );
  });
  it("rejects a missing, empty or extra answer", () => {
    const missing = {
      ...small,
      questions: [{ question: "Q", answers: { Owl: "a", Fox: "b" } }],
    };
    expect(checkQuiz(missing)).toMatch(/^Question 1: write an answer/);
    const empty = {
      ...small,
      questions: [{ question: "Q", answers: { Owl: "a", Fox: " ", Bee: "c" } }],
    };
    expect(parseQuiz(empty)).toBeNull();
    const extra = {
      ...small,
      questions: [
        { question: "Q", answers: { Owl: "a", Fox: "b", Bee: "c", Cat: "d" } },
      ],
    };
    expect(parseQuiz(extra)).toBeNull();
  });
  it("rejects text that is too long and question counts out of range", () => {
    expect(
      checkQuiz({ ...small, personas: ["x".repeat(25), "Fox", "Bee"] }),
    ).toBe("Give each persona a name of 1 to 24 characters.");
    const longQ = { ...small.questions[0], question: "q".repeat(161) };
    expect(checkQuiz({ ...small, questions: [longQ] })).toBe(
      "Question 1: write 1 to 160 characters.",
    );
    const longA = {
      question: "Q",
      answers: { Owl: "a".repeat(101), Fox: "b", Bee: "c" },
    };
    expect(parseQuiz({ ...small, questions: [longA] })).toBeNull();
    expect(checkQuiz({ ...small, questions: [] })).toBe(
      "Add 1 to 8 questions.",
    );
    const nine = Array.from({ length: 9 }, () => small.questions[0]);
    expect(parseQuiz({ ...small, questions: nine })).toBeNull();
    expect(parseQuiz(null)).toBeNull();
    expect(parseQuiz("quiz")).toBeNull();
  });
});

describe("scorePersona", () => {
  it("picks the persona with most answers in a custom quiz", () => {
    const three = {
      ...small,
      questions: [...small.questions, small.questions[0]],
    };
    expect(scorePersona(["Bee", "Fox", "Bee"], three)).toBe("Bee");
  });
  it("breaks a tie by persona order", () => {
    expect(scorePersona(["Bee", "Fox"], small)).toBe("Fox");
    expect(
      scorePersona(
        ["Developer", "Developer", "Researcher", "Researcher", "Idea"],
        STARTER,
      ),
    ).toBe("Researcher");
  });
  it("rejects incomplete answers or personas from another quiz", () => {
    expect(scorePersona(["Owl"], small)).toBeNull();
    expect(scorePersona(["Owl", "Idea"], small)).toBeNull();
    expect(scorePersona(["Owl", 1], small)).toBeNull();
  });
});

const saved = { ...small, v: "1760000000000" };

describe("roomQuiz", () => {
  it("is the starter quiz when nothing is stored", () => {
    expect(roomQuiz(null)).toEqual({
      mode: "starter",
      quiz: STARTER,
      v: "starter",
      hasCustom: false,
    });
  });
  it("is off with no custom quiz for the off marker", () => {
    expect(roomQuiz(QUIZ_OFF)).toEqual({
      mode: "off",
      quiz: null,
      v: "off",
      hasCustom: false,
    });
  });
  it("reads a custom quiz as an object or as JSON text", () => {
    const want = {
      mode: "custom",
      quiz: small,
      v: "1760000000000",
      hasCustom: true,
    };
    expect(roomQuiz({ ...small, v: 1760000000000 })).toEqual(want);
    expect(roomQuiz(JSON.stringify(saved))).toEqual(want);
  });
  it("hides a custom quiz that is off but keeps it for the admin", () => {
    const off = { ...saved, off: true };
    const quiz = roomQuiz(off);
    expect(quiz).toEqual({
      mode: "off",
      quiz: null,
      v: "off-1760000000000",
      hasCustom: true,
    });
    expect(quiz.v).not.toBe(roomQuiz(saved).v);
    expect(adminQuiz(off).saved).toEqual({ ...small, v: saved.v, off: true });
    expect(adminQuiz(null).saved).toBeNull();
  });
  it("falls back to the starter quiz for bad data", () => {
    expect(roomQuiz({ ...small }).mode).toBe("starter");
    expect(roomQuiz({ personas: ["x"], questions: [], v: 1 }).mode).toBe(
      "starter",
    );
    expect(roomQuiz("{not json").mode).toBe("starter");
  });
});

describe("nextStored", () => {
  it("turns the starter quiz off and on", () => {
    expect(nextStored("off", null)).toBe(QUIZ_OFF);
    expect(nextStored("on", QUIZ_OFF)).toBeNull();
    expect(nextStored("on", null)).toBeNull();
  });
  it("keeps a custom quiz while it is off and brings it back on", () => {
    const off = nextStored("off", saved);
    expect(off).toEqual({ ...saved, off: true });
    expect(nextStored("off", off)).toEqual(off);
    const on = nextStored("on", off);
    expect(on).toEqual(saved);
    expect(roomQuiz(on)).toEqual(roomQuiz(saved));
  });
  it("starter deletes any stored quiz", () => {
    expect(nextStored("starter", saved)).toBeNull();
    expect(nextStored("starter", { ...saved, off: true })).toBeNull();
    expect(nextStored("starter", QUIZ_OFF)).toBeNull();
  });
  it("changes v on every off and on", () => {
    const vs = [saved, nextStored("off", saved), QUIZ_OFF, null].map(
      (x) => roomQuiz(x).v,
    );
    expect(new Set(vs).size).toBe(vs.length);
  });
});

describe("tallyFor", () => {
  it("counts each persona in order and ignores other keys", () => {
    expect(tallyFor(["Owl", "Fox"], { Fox: "2", Bee: 5 })).toEqual({
      Owl: 0,
      Fox: 2,
    });
    expect(tallyFor(["constructor"], {})).toEqual({ constructor: 0 });
    expect(tallyFor(["Owl"], null)).toEqual({ Owl: 0 });
  });
});
