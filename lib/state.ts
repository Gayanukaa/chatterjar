import {
  PERSONAS,
  isPersona,
  publicPoll,
  votesFromScore,
  type DeviceState,
  type Persona,
  type Poll,
  type Question,
  type RoomState,
} from "./domain";
import { db, k } from "./redis";

type Shared = Omit<RoomState, "me">;
type Votes = Record<string, number> | null;

// 90 phones poll every 3 s; a 1 s cache keeps Upstash commands in budget.
const TTL_MS = 1000;
const TOP_QUESTIONS = 30;
let cache: { at: number; data: Shared } | null = null;

/** Drops the cache so this instance shows its own writes at once. */
export function invalidate() {
  cache = null;
}

function fullTally(
  raw: Record<string, unknown> | null,
): Record<Persona, number> {
  return Object.fromEntries(
    PERSONAS.map((p) => [p, Number(raw?.[p] ?? 0)]),
  ) as Record<Persona, number>;
}

/** Active poll, top visible questions and quiz tally: two pipelined round trips. */
export async function sharedState(): Promise<Shared> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.data;
  const r = db();
  const [activeId, ranked, tally] = await r
    .pipeline()
    .get<string>(k("poll:active"))
    .zrange(k("q:rank"), 0, TOP_QUESTIONS - 1, { rev: true, withScores: true })
    .hgetall<Record<string, number>>(k("quiz:tally"))
    .exec<
      [string | null, (string | number)[], Record<string, number> | null]
    >();

  const ids: string[] = [];
  const scores: number[] = [];
  for (let i = 0; i < ranked.length; i += 2) {
    ids.push(String(ranked[i]));
    scores.push(Number(ranked[i + 1]));
  }

  let poll: Poll | null = null;
  let votes: Votes = null;
  const texts: (Record<string, unknown> | null)[] = [];
  if (activeId || ids.length) {
    const p = r.pipeline();
    if (activeId)
      p.get(k(`poll:${activeId}`)).hgetall(k(`poll:${activeId}:votes`));
    for (const id of ids) p.hmget(k(`q:${id}`), "text", "createdAt");
    const out = await p.exec<unknown[]>();
    if (activeId) {
      poll = out.shift() as Poll | null;
      votes = out.shift() as Votes;
    }
    texts.push(...(out as (Record<string, unknown> | null)[]));
  }

  const questions: Question[] = ids.flatMap((id, i) => {
    const q = texts[i];
    if (!q || q.text == null) return [];
    const createdAt = Number(q.createdAt);
    return [
      { id, text: String(q.text), votes: votesFromScore(scores[i]), createdAt },
    ];
  });

  const data: Shared = {
    poll: poll ? publicPoll(poll, votes ?? {}) : null,
    questions,
    tally: fullTally(tally),
  };
  cache = { at: Date.now(), data };
  return data;
}

/** This device's vote, upvoted question ids and quiz persona: one round trip. */
export async function deviceState(
  rid: string | null,
  pollId: string | null,
): Promise<DeviceState> {
  if (!rid) return { vote: null, upvoted: [], persona: null };
  const [vote, upvoted, persona] = await db()
    .pipeline()
    .hget<string>(k(`poll:${pollId ?? "none"}:voters`), rid)
    .smembers(k(`qv:${rid}`))
    .hget<string>(k("quiz:who"), rid)
    .exec<[string | null, unknown[], string | null]>();
  return {
    vote: vote == null ? null : String(vote),
    upvoted: upvoted.map(String),
    persona: isPersona(persona) ? persona : null,
  };
}

export async function getState(rid: string | null): Promise<RoomState> {
  const shared = await sharedState();
  const me = await deviceState(rid, shared.poll?.id ?? null);
  return { ...shared, me };
}
