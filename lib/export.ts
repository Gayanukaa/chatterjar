import {
  PERSONAS,
  createdAtFromScore,
  votesFromScore,
  type Persona,
  type Poll,
  type PollStatus,
} from "./domain";

export type ExportFormat = "json" | "csv";

export interface SessionExport {
  room: string;
  exportedAt: string;
  polls: {
    id: string;
    question: string;
    status: PollStatus;
    options: { key: string; label: string; votes: number }[];
    correct: string | null;
    total: number;
  }[];
  questions: {
    text: string;
    votes: number;
    createdAt: string;
    hidden: boolean;
  }[];
  quiz: { tally: Record<Persona, number> };
}

/** Raw question data: rank score when visible, saved score when hidden. */
export interface RawQuestion {
  id: string;
  text: string;
  score: number | null;
  hidden: boolean;
}

/** Creation time from a question id (q + base36 ms + up to 4 random chars). */
export function createdAtFromId(id: string): number {
  const ms = parseInt(id.slice(1, 9), 36);
  return Number.isFinite(ms) ? ms : 0;
}

/** Export document: polls oldest first, questions oldest first, full tally. */
export function buildExport(input: {
  room: string;
  now: number;
  polls: { poll: Poll; votes: Record<string, unknown> | null }[];
  questions: RawQuestion[];
  tally: Record<string, unknown> | null;
}): SessionExport {
  const polls = input.polls.map(({ poll, votes }) => {
    const options = poll.options.map((o) => ({
      key: o.key,
      label: o.label,
      votes: Number(votes?.[o.key] ?? 0),
    }));
    return {
      id: poll.id,
      question: poll.question,
      status: poll.status,
      options,
      correct: poll.correct ?? null,
      total: options.reduce((sum, o) => sum + o.votes, 0),
    };
  });
  const questions = input.questions
    .map((q) => ({
      text: q.text,
      votes: q.score == null ? 0 : votesFromScore(q.score),
      at: q.score == null ? createdAtFromId(q.id) : createdAtFromScore(q.score),
      hidden: q.hidden,
    }))
    .sort((a, b) => a.at - b.at)
    .map(({ at, ...q }) => ({ ...q, createdAt: new Date(at).toISOString() }));
  const tally = Object.fromEntries(
    PERSONAS.map((p) => [p, Number(input.tally?.[p] ?? 0)]),
  ) as Record<Persona, number>;
  return {
    room: input.room,
    exportedAt: new Date(input.now).toISOString(),
    polls,
    questions,
    quiz: { tally },
  };
}

/** One CSV cell: quoted when needed; a formula prefix is defused for Excel. */
export function csvCell(value: string | number | boolean | null): string {
  if (value == null) return "";
  if (typeof value !== "string") return String(value);
  // Spreadsheets run cells that start with these as formulas.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

const CSV_HEADER = [
  "section",
  "poll_id",
  "status",
  "text",
  "option",
  "label",
  "votes",
  "total",
  "correct",
  "hidden",
  "created_at",
];

/** One CSV with a section column (poll, question, quiz); CRLF line ends. */
export function toCsv(data: SessionExport): string {
  const rows: (string | number | boolean | null)[][] = [CSV_HEADER];
  for (const p of data.polls)
    for (const o of p.options)
      rows.push([
        "poll",
        p.id,
        p.status,
        p.question,
        o.key,
        o.label,
        o.votes,
        p.total,
        p.correct == null ? null : o.key === p.correct,
        null,
        null,
      ]);
  for (const q of data.questions)
    rows.push([
      "question",
      null,
      null,
      q.text,
      null,
      null,
      q.votes,
      null,
      null,
      q.hidden,
      q.createdAt,
    ]);
  const quizTotal = Object.values(data.quiz.tally).reduce((a, b) => a + b, 0);
  for (const [persona, n] of Object.entries(data.quiz.tally))
    rows.push([
      "quiz",
      null,
      null,
      null,
      null,
      persona,
      n,
      quizTotal,
      null,
      null,
      null,
    ]);
  return rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

/** Download name: chatterjar-<room>-<yyyy-mm-dd>.<ext> (UTC date). */
export function exportFilename(room: string, now: number, ext: ExportFormat) {
  const day = new Date(now).toISOString().slice(0, 10);
  return `chatterjar-${room}-${day}.${ext}`;
}
