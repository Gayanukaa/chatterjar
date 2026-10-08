import quiz from "@/data/quiz.json";

// Personas come from data/quiz.json; their order breaks ties.
export const PERSONAS: readonly string[] = quiz.personas;
export type Persona = string;
export type PollStatus = "open" | "closed" | "revealed";
export type MediaType = "image" | "code" | "text" | "audio";

export interface Media {
  type: MediaType;
  src: string;
}

export interface Option {
  key: string;
  label: string;
  media?: Media;
}

export interface Poll {
  id: string;
  question: string;
  detail?: string;
  source?: string;
  options: Option[];
  correct?: string;
  status: PollStatus;
  createdAt: number;
}

export interface PublicPoll extends Omit<Poll, "correct"> {
  correct?: string;
  total: number;
  results?: Record<string, number>;
}

export interface Question {
  id: string;
  text: string;
  votes: number;
  createdAt: number;
}

export interface DeviceState {
  vote: string | null;
  upvoted: string[];
  persona: Persona | null;
}

export interface RoomState {
  poll: PublicPoll | null;
  questions: Question[];
  tally: Record<Persona, number>;
  me: DeviceState;
}

export const MAX_QUESTION = 200;
export const QUESTIONS_PER_MINUTE = 3;
export const OPTION_KEYS = ["A", "B", "C", "D"];
// Upvotes add VOTE_WEIGHT; low digits hold createdAt ms, newest wins ties.
export const VOTE_WEIGHT = 1e13;
export const RID_PATTERN = /^[0-9a-f-]{36}$/i;

export const isPersona = (v: unknown): v is Persona =>
  typeof v === "string" && PERSONAS.includes(v);

/** Persona with the most answers; a tie goes to the earlier persona in PERSONAS. */
export function scorePersona(
  answers: unknown[],
  expected: number,
): Persona | null {
  if (answers.length !== expected || !answers.every(isPersona)) return null;
  const count = new Map<Persona, number>();
  for (const a of answers) count.set(a, (count.get(a) ?? 0) + 1);
  let best: Persona = PERSONAS[0];
  for (const p of PERSONAS)
    if ((count.get(p) ?? 0) > (count.get(best) ?? 0)) best = p;
  return best;
}

/** Hides the correct option and the results until the poll is revealed. */
export function publicPoll(
  poll: Poll,
  votes: Record<string, number>,
): PublicPoll {
  const total = Object.values(votes).reduce((sum, n) => sum + Number(n), 0);
  const base: PublicPoll = {
    id: poll.id,
    question: poll.question,
    detail: poll.detail,
    options: poll.options,
    status: poll.status,
    createdAt: poll.createdAt,
    total,
  };
  if (poll.status !== "revealed") return base;
  const results = Object.fromEntries(
    poll.options.map((o) => [o.key, Number(votes[o.key] ?? 0)]),
  );
  return { ...base, correct: poll.correct, source: poll.source, results };
}

/** Sorted-set score: votes first, then newer questions first so new ones show. */
export function questionScore(votes: number, createdAt: number): number {
  return votes * VOTE_WEIGHT + createdAt;
}

export const votesFromScore = (score: number) =>
  Math.floor(score / VOTE_WEIGHT);
export const createdAtFromScore = (score: number) => score % VOTE_WEIGHT;

/** Trimmed question text, or null if empty or over MAX_QUESTION chars. */
export function validateQuestion(text: unknown): string | null {
  const t = typeof text === "string" ? text.trim() : "";
  return t.length > 0 && t.length <= MAX_QUESTION ? t : null;
}

const MEDIA_TYPES: MediaType[] = ["image", "code", "text", "audio"];

/** Valid option list (2 to 4, keys A to D), or null; media must be a site path. */
export function parseOptions(raw: unknown): Option[] | null {
  if (!Array.isArray(raw) || raw.length < 2 || raw.length > 4) return null;
  const options: Option[] = [];
  for (const [i, o] of raw.entries()) {
    const label = typeof o?.label === "string" ? o.label.trim() : "";
    if (!label || label.length > 200) return null;
    const option: Option = { key: OPTION_KEYS[i], label };
    const m = o?.media;
    if (
      m &&
      MEDIA_TYPES.includes(m.type) &&
      typeof m.src === "string" &&
      m.src.startsWith("/")
    ) {
      option.media = { type: m.type, src: m.src };
    }
    options.push(option);
  }
  return options;
}
