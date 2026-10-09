import claudeCodeTalk from "@/data/packs/claude-code-talk.json";
import demo from "@/data/packs/demo.json";
import spotTheAi from "@/data/packs/spot-the-ai.json";
import { isPollKind, optionsFor, type Poll } from "./domain";

export interface Pack {
  id: string;
  title: string;
  description: string;
  polls: {
    id: string;
    kind?: string;
    question: string;
    detail?: string;
    source?: string;
    options?: unknown[];
    correct?: string;
  }[];
}

// Add a pack: drop a JSON file in data/packs/ and list it here.
export const PACKS: Pack[] = [demo, spotTheAi, claudeCodeTalk];

/** Pack list for /admin; never sent to phones because packs hold answers. */
export const packSummaries = () =>
  PACKS.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    count: p.polls.length,
  }));

/** Validated polls of a pack with ids prefixed by the pack id, or null if invalid. */
export function packPolls(pack: Pack, now: number): Poll[] | null {
  const polls: Poll[] = [];
  for (const [i, p] of pack.polls.entries()) {
    const kind = p.kind ?? "choice";
    if (!isPollKind(kind)) return null;
    const options = optionsFor(kind, p.options);
    if (!options || !p.question?.trim()) return null;
    // Word clouds and ratings have no options to list and no correct answer.
    if (kind !== "choice" && (p.options || p.correct)) return null;
    if (p.correct && !options.some((o) => o.key === p.correct)) return null;
    polls.push({
      id: `${pack.id}-${p.id}`,
      kind,
      question: p.question.trim(),
      detail: p.detail,
      source: p.source,
      options,
      correct: p.correct,
      status: "closed",
      createdAt: now + i,
    });
  }
  return polls;
}
