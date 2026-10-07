export const PERSONAS = [
  "Idea",
  "Researcher",
  "Freelancer",
  "Builder",
  "Developer",
] as const;
export type Persona = (typeof PERSONAS)[number];
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

export interface Round {
  round: number;
  type: string;
  subject: string;
  A: string;
  B: string;
  answer: string;
  source: string;
  task?: string;
}

export const MAX_QUESTION = 200;
export const QUESTIONS_PER_MINUTE = 3;
export const OPTION_KEYS = ["A", "B", "C", "D"];
// Upvotes add VOTE_WEIGHT; low digits hold createdAt ms, newest wins ties.
export const VOTE_WEIGHT = 1e13;
export const RID_PATTERN = /^[0-9a-f-]{36}$/i;

export const isPersona = (v: unknown): v is Persona =>
  PERSONAS.includes(v as Persona);

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

const MEDIA: Record<string, MediaType> = {
  image: "image",
  code: "code",
  text: "text",
  audio: "audio",
};

export const EXAM_QUESTION =
  "Your team must split one large app into many smaller services. Many files will change. " +
  "You must decide where each service starts and stops. What do you do first?";

/** Preset polls: five Spot-the-AI rounds plus the exam question, with fixed ids. */
export function buildPresets(rounds: Round[], now: number): Poll[] {
  const spot: Poll[] = rounds.map((r) => ({
    id: `spot-${r.round}`,
    question: `Round ${r.round}: ${r.subject.split(": ").pop()}. Which one did an AI make?`,
    detail: r.task,
    source: r.source,
    options: (["A", "B"] as const).map((key) => ({
      key,
      label: key,
      media: { type: MEDIA[r.type] ?? "image", src: `/spot/${r[key]}` },
    })),
    correct: r.answer,
    status: "closed",
    createdAt: now + r.round,
  }));
  const exam: Poll = {
    id: "exam-1",
    question: EXAM_QUESTION,
    options: [
      {
        key: "A",
        label: "Start to change the code. Learn the structure as you go.",
      },
      {
        key: "B",
        label: "Use plan mode. Explore the code and design the change first.",
      },
      {
        key: "C",
        label: "Write very detailed instructions. Then run them directly.",
      },
      {
        key: "D",
        label: "Start directly. Change to plan mode only if problems occur.",
      },
    ],
    correct: "B",
    status: "closed",
    createdAt: now + rounds.length + 1,
  };
  return [...spot, exam];
}
