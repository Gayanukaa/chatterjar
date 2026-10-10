import {
  PERSONAS,
  createdAtFromScore,
  kindOf,
  votesFromScore,
  type Persona,
  type Poll,
} from "./domain";

export type ExportFormat = "json" | "csv";
export type SessionExport = ReturnType<typeof buildExport>;

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
}) {
  const polls = input.polls.map(({ poll, votes }) => {
    const kind = kindOf(poll);
    // Word clouds have no fixed options: every distinct answer is a row.
    const options =
      kind === "words"
        ? Object.entries(votes ?? {})
            .map(([word, n]) => ({ key: word, label: word, votes: Number(n) }))
            .sort((a, b) => b.votes - a.votes)
        : poll.options.map((o) => ({
            key: o.key,
            label: o.label,
            votes: Number(votes?.[o.key] ?? 0),
          }));
    return {
      id: poll.id,
      question: poll.question,
      kind,
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
] as const;

type CsvRow = Partial<
  Record<(typeof CSV_HEADER)[number], string | number | boolean | null>
>;

/** One CSV with a section column (poll, question, quiz); CRLF line ends. */
export function toCsv(data: SessionExport): string {
  const rows: CsvRow[] = [];
  for (const p of data.polls)
    for (const o of p.options)
      rows.push({
        section: "poll",
        poll_id: p.id,
        status: p.status,
        text: p.question,
        option: o.key,
        label: o.label,
        votes: o.votes,
        total: p.total,
        correct: p.correct == null ? null : o.key === p.correct,
      });
  for (const q of data.questions)
    rows.push({
      section: "question",
      text: q.text,
      votes: q.votes,
      hidden: q.hidden,
      created_at: q.createdAt,
    });
  const quizTotal = Object.values(data.quiz.tally).reduce((a, b) => a + b, 0);
  for (const [persona, n] of Object.entries(data.quiz.tally))
    rows.push({ section: "quiz", label: persona, votes: n, total: quizTotal });
  const lines = rows.map((r) => CSV_HEADER.map((h) => csvCell(r[h] ?? null)));
  return [CSV_HEADER, ...lines].map((r) => r.join(",")).join("\r\n") + "\r\n";
}

/** Download name: chatterjar-<room>-<yyyy-mm-dd>.<ext> (UTC date). */
export function exportFilename(room: string, now: number, ext: ExportFormat) {
  const day = new Date(now).toISOString().slice(0, 10);
  return `chatterjar-${room}-${day}.${ext}`;
}
