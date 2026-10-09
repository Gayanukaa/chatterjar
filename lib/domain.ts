import quiz from "@/data/quiz.json";

// Personas come from data/quiz.json; their order breaks ties.
export const PERSONAS: readonly string[] = quiz.personas;
export type Persona = string;
export type PollStatus = "open" | "closed" | "revealed";
export type MediaType = "image" | "code" | "text" | "audio";
export type PollKind = "choice" | "words" | "rating";

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
  // Missing on polls made before poll types existed: those are "choice".
  kind?: PollKind;
  question: string;
  detail?: string;
  source?: string;
  options: Option[];
  correct?: string;
  status: PollStatus;
  createdAt: number;
}

export interface PublicPoll extends Omit<Poll, "correct" | "kind"> {
  kind: PollKind;
  correct?: string;
  total: number;
  // Choice and rating: count per option key. Words: the top words.
  results?: Record<string, number>;
  // Rating only, after reveal, when at least one device rated.
  average?: number;
}

export interface Question {
  id: string;
  text: string;
  votes: number;
  createdAt: number;
}

export interface PendingQuestion {
  id: string;
  text: string;
  createdAt: number;
  // Filter reason ("language" or "link"), or null when only review is on.
  flagged: string | null;
}

export interface RoomSettings {
  moderate: boolean;
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
  // Running totals since the last room reset.
  reactions: Record<Reaction, number>;
  // Bumped by room and quiz resets so phones refetch their device state.
  epoch: number;
  me: DeviceState;
}

export const REACTIONS = [
  { type: "applause", label: "Applause" },
  { type: "love", label: "Love it" },
  { type: "idea", label: "Great point" },
  { type: "confused", label: "I'm lost" },
] as const;
export type Reaction = (typeof REACTIONS)[number]["type"];
export const REACTION_TYPES: readonly Reaction[] = REACTIONS.map((r) => r.type);
export const REACTIONS_PER_WINDOW = 10;
export const REACTION_WINDOW_S = 10;

export const MAX_QUESTION = 200;
export const QUESTIONS_PER_MINUTE = 3;
export const OPTION_KEYS = ["A", "B", "C", "D"];
// Upvotes add VOTE_WEIGHT; low digits hold createdAt ms, newest wins ties.
export const VOTE_WEIGHT = 1e13;
export const RID_PATTERN = /^[0-9a-f-]{36}$/i;
export const POLL_KINDS: PollKind[] = ["choice", "words", "rating"];
export const KIND_LABEL: Record<PollKind, string> = {
  choice: "Multiple choice",
  words: "Word cloud",
  rating: "Rating 1 to 5",
};
export const MAX_WORD = 24;
export const TOP_WORDS = 40;
export const RATING_OPTIONS: Option[] = ["1", "2", "3", "4", "5"].map(
  (key) => ({ key, label: key }),
);
// \p{M} keeps Sinhala and Tamil vowel signs; ZWJ/ZWNJ form Sinhala conjuncts.
const WORD_PATTERN = /^[\p{L}\p{M}\p{N}\u200C\u200D -]+$/u;
const WORD_CHAR = /[\p{L}\p{N}]/u;
// Upstash parses stored JSON, so "null" or "123" would not read back as text.
export const WORD_VOTE_PREFIX = "w:";

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

export const isPollKind = (v: unknown): v is PollKind =>
  typeof v === "string" && POLL_KINDS.includes(v as PollKind);

/** Word cloud answer: trimmed, single spaces, lowercase; null if not valid. */
export function normalizeWord(text: unknown): string | null {
  if (typeof text !== "string") return null;
  const word = text.trim().replace(/\s+/g, " ").toLowerCase().normalize("NFC");
  return word.length <= MAX_WORD &&
    WORD_PATTERN.test(word) &&
    WORD_CHAR.test(word)
    ? word
    : null;
}

/** Device vote as stored in the voters hash; word answers drop their prefix. */
export function storedVote(raw: unknown): string | null {
  if (raw == null) return null;
  const vote = String(raw);
  return vote.startsWith(WORD_VOTE_PREFIX)
    ? vote.slice(WORD_VOTE_PREFIX.length)
    : vote;
}

/** Most frequent words, highest count first; ties sort by the word. */
export function topWords(
  votes: Record<string, number>,
  limit = TOP_WORDS,
): [string, number][] {
  return Object.entries(votes)
    .map(([w, n]): [string, number] => [w, Number(n)])
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit);
}

/** Mean of 1 to 5 star counts, to one decimal; null when nobody rated. */
export function ratingAverage(votes: Record<string, number>): number | null {
  let sum = 0;
  let count = 0;
  for (const { key } of RATING_OPTIONS) {
    const n = Number(votes[key] ?? 0);
    sum += n * Number(key);
    count += n;
  }
  return count ? Math.round((sum / count) * 10) / 10 : null;
}

/** Options a poll kind needs: parsed for choice, fixed for rating, none for words. */
export function optionsFor(kind: PollKind, raw: unknown): Option[] | null {
  if (kind === "words") return [];
  if (kind === "rating") return RATING_OPTIONS;
  return parseOptions(raw);
}

/** Hides the correct option and the results until the poll is revealed. */
export function publicPoll(
  poll: Poll,
  votes: Record<string, number>,
): PublicPoll {
  const kind = poll.kind ?? "choice";
  const total = Object.values(votes).reduce((sum, n) => sum + Number(n), 0);
  const base: PublicPoll = {
    id: poll.id,
    kind,
    question: poll.question,
    detail: poll.detail,
    options: poll.options,
    status: poll.status,
    createdAt: poll.createdAt,
    total,
  };
  if (poll.status !== "revealed") return base;
  if (kind === "words") {
    const results = Object.fromEntries(topWords(votes));
    return { ...base, source: poll.source, results };
  }
  const results = Object.fromEntries(
    poll.options.map((o) => [o.key, Number(votes[o.key] ?? 0)]),
  );
  if (kind === "rating") {
    const average = ratingAverage(votes);
    return {
      ...base,
      source: poll.source,
      results,
      ...(average === null ? {} : { average }),
    };
  }
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

export const isReaction = (v: unknown): v is Reaction =>
  typeof v === "string" && (REACTION_TYPES as string[]).includes(v);

/** Every reaction type with its count; missing or bad values become 0. */
export function reactionTotals(
  raw: Record<string, unknown> | null,
): Record<Reaction, number> {
  const entries = REACTION_TYPES.map((t) => [t, Number(raw?.[t] ?? 0) || 0]);
  return Object.fromEntries(entries) as Record<Reaction, number>;
}

/** New reactions between two snapshots, types interleaved, at most max items. */
export function reactionBursts(
  prev: Record<Reaction, number> | null,
  next: Record<Reaction, number>,
  max: number,
): Reaction[] {
  if (!prev) return [];
  // A reset drops totals below the last snapshot; that is not a reaction.
  const left = REACTION_TYPES.map((t) => Math.max(0, next[t] - prev[t]));
  const out: Reaction[] = [];
  while (out.length < max && left.some((n) => n > 0)) {
    REACTION_TYPES.forEach((t, i) => {
      if (left[i] > 0 && out.length < max) {
        out.push(t);
        left[i]--;
      }
    });
  }
  return out;
}
