import starter from "@/data/quiz.json";

export interface QuizQuestion {
  question: string;
  answers: Record<string, string>;
}

export interface Quiz {
  personas: string[];
  questions: QuizQuestion[];
}

export type QuizMode = "starter" | "custom" | "off";
export type QuizAction = "save" | "off" | "on" | "starter";

/** A room's quiz; v changes on every admin action so phones refetch it. */
export interface RoomQuiz {
  mode: QuizMode;
  quiz: Quiz | null;
  v: string;
}

/** Custom quiz as stored: v is its save time; off hides it from phones. */
export interface StoredQuiz extends Quiz {
  v: string;
  off?: true;
}

// Absent: starter on. "off": starter off. JSON: custom, off when off is true.
export const QUIZ_KEY = "quiz:def";
export const QUIZ_OFF = "off";
export const STARTER: Quiz = starter;
export const MIN_PERSONAS = 2;
export const MAX_PERSONAS = 6;
export const MAX_PERSONA = 24;
export const MAX_QUIZ_QUESTIONS = 8;
export const MAX_QUIZ_QUESTION = 160;
export const MAX_ANSWER = 100;
// Upstash parses stored JSON, so "null" or "[1]" would not read back as text.
export const PERSONA_PREFIX = "p:";

const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** The quiz with trimmed text, or a plain message that names the problem. */
export function checkQuiz(raw: unknown): Quiz | string {
  const r = raw as { personas?: unknown; questions?: unknown } | null;
  if (!r || typeof r !== "object") return "Send a quiz.";
  const list = Array.isArray(r.personas) ? r.personas : [];
  if (list.length < MIN_PERSONAS || list.length > MAX_PERSONAS)
    return `Add ${MIN_PERSONAS} to ${MAX_PERSONAS} personas.`;
  const personas = list.map(text);
  if (personas.some((p) => !p || p.length > MAX_PERSONA))
    return `Give each persona a name of 1 to ${MAX_PERSONA} characters.`;
  // Upstash builds hashes as plain objects, where __proto__ is not a key.
  if (personas.some((p) => p.toLowerCase() === "__proto__"))
    return "Give each persona a name other than __proto__.";
  // Case-blind, so "Idea" and "idea" do not show as two bars.
  if (new Set(personas.map((p) => p.toLowerCase())).size !== personas.length)
    return "Give each persona a different name.";
  const rows = Array.isArray(r.questions) ? r.questions : [];
  if (!rows.length || rows.length > MAX_QUIZ_QUESTIONS)
    return `Add 1 to ${MAX_QUIZ_QUESTIONS} questions.`;
  const questions: QuizQuestion[] = [];
  for (const [i, row] of rows.entries()) {
    const question = text(row?.question);
    if (!question || question.length > MAX_QUIZ_QUESTION)
      return `Question ${i + 1}: write 1 to ${MAX_QUIZ_QUESTION} characters.`;
    const given = row?.answers;
    const entries =
      given && typeof given === "object" ? Object.entries(given) : [];
    const bad = `Question ${i + 1}: write an answer of 1 to ${MAX_ANSWER} characters for each persona.`;
    if (entries.length !== personas.length) return bad;
    const answers = Object.fromEntries(
      entries.map(([key, v]) => [key.trim(), text(v)]),
    );
    const fits = personas.every((p) => {
      const a = Object.hasOwn(answers, p) ? answers[p] : "";
      return a && a.length <= MAX_ANSWER;
    });
    if (!fits) return bad;
    questions.push({ question, answers });
  }
  return { personas, questions };
}

/** Custom quiz from the stored quiz:def value, or null for any other value. */
export function storedCustom(stored: unknown): StoredQuiz | null {
  let value = stored;
  if (typeof value === "string" && value !== QUIZ_OFF) {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  const quiz = checkQuiz(value);
  const meta = value as { v?: unknown; off?: unknown } | null;
  const v = meta?.v;
  if (typeof quiz === "string") return null;
  if (typeof v !== "number" && typeof v !== "string") return null;
  return meta?.off === true
    ? { ...quiz, v: String(v), off: true }
    : { ...quiz, v: String(v) };
}

/** Room quiz from the stored quiz:def value; bad data falls back to starter. */
export function roomQuiz(stored: unknown): RoomQuiz {
  const custom = storedCustom(stored);
  if (custom) {
    const { personas, questions, v } = custom;
    return custom.off
      ? { mode: "off", quiz: null, v: `off-${v}` }
      : { mode: "custom", quiz: { personas, questions }, v };
  }
  if (stored === QUIZ_OFF) return { mode: "off", quiz: null, v: QUIZ_OFF };
  return { mode: "starter", quiz: STARTER, v: "starter" };
}

/** New quiz:def value after off, on or starter; null deletes the key. */
export function nextStored(
  action: Exclude<QuizAction, "save">,
  stored: unknown,
): StoredQuiz | typeof QUIZ_OFF | null {
  if (action === "starter") return null;
  const custom = storedCustom(stored);
  if (action === "off") return custom ? { ...custom, off: true } : QUIZ_OFF;
  if (!custom) return null;
  return {
    personas: custom.personas,
    questions: custom.questions,
    v: custom.v,
  };
}

/** Persona with the most answers; a tie goes to the earlier persona. */
export function scorePersona(answers: unknown[], quiz: Quiz): string | null {
  const { personas } = quiz;
  const known = (a: unknown): a is string =>
    typeof a === "string" && personas.includes(a);
  if (answers.length !== quiz.questions.length || !answers.every(known))
    return null;
  const count = new Map<string, number>();
  for (const a of answers) count.set(a, (count.get(a) ?? 0) + 1);
  let best = personas[0];
  for (const p of personas)
    if ((count.get(p) ?? 0) > (count.get(best) ?? 0)) best = p;
  return best;
}

/** Count per persona in persona order; missing or bad counts become 0. */
export function tallyFor(
  personas: readonly string[],
  raw: Record<string, unknown> | null,
): Record<string, number> {
  const count = (p: string) =>
    raw && Object.hasOwn(raw, p) ? Number(raw[p]) || 0 : 0;
  return Object.fromEntries(personas.map((p) => [p, count(p)]));
}

export type AdminQuiz = RoomQuiz & { saved: StoredQuiz | null };

/** Room quiz for the admin, with the stored custom quiz even while off. */
export const adminQuiz = (stored: unknown): AdminQuiz => ({
  ...roomQuiz(stored),
  saved: storedCustom(stored),
});

/** Persona from a quiz:who value; old values have no prefix. */
export function storedPersona(raw: unknown): string | null {
  if (raw == null) return null;
  const persona = String(raw);
  return persona.startsWith(PERSONA_PREFIX)
    ? persona.slice(PERSONA_PREFIX.length)
    : persona;
}
