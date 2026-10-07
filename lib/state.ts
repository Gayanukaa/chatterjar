import {
  PERSONAS,
  createdAtFromScore,
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
type Hash = Record<string, unknown> | null;

// 90 phones poll every 3 s; a 1 s cache keeps Upstash commands in budget.
const TTL_MS = 1000;
const TOP_QUESTIONS = 50;
const NO_DEVICE: DeviceState = { vote: null, upvoted: [], persona: null };
let cache: { at: number; data: Shared } | null = null;

/** Drops the cache so this instance shows its own writes at once. */
export function invalidate() {
  cache = null;
}

function fullTally(raw: Hash): Record<Persona, number> {
  const entries = PERSONAS.map((p) => [p, Number(raw?.[p] ?? 0)]);
  return Object.fromEntries(entries) as Record<Persona, number>;
}

function toDevice(
  vote: unknown,
  upvoted: unknown,
  persona: unknown,
): DeviceState {
  return {
    vote: vote == null ? null : String(vote),
    upvoted: Array.isArray(upvoted) ? upvoted.map(String) : [],
    persona: isPersona(persona) ? persona : null,
  };
}

/** Cache hit: only this device's vote, upvotes and persona, in one round trip. */
async function deviceOnly(
  rid: string | null,
  pollId: string | null,
): Promise<DeviceState> {
  if (!rid) return NO_DEVICE;
  const [vote, upvoted, persona] = await db()
    .pipeline()
    .hget(k(`poll:${pollId ?? "none"}:voters`), rid)
    .smembers(k(`qv:${rid}`))
    .hget(k("quiz:who"), rid)
    .exec<[unknown, unknown, unknown]>();
  return toDevice(vote, upvoted, persona);
}

/** Room state for one device: at most two pipelined round trips. */
export async function getState(rid: string | null): Promise<RoomState> {
  if (cache && Date.now() - cache.at < TTL_MS) {
    return {
      ...cache.data,
      me: await deviceOnly(rid, cache.data.poll?.id ?? null),
    };
  }
  const r = db();
  const p1 = r
    .pipeline()
    .get(k("poll:active"))
    .zrange(k("q:rank"), 0, TOP_QUESTIONS - 1, { rev: true, withScores: true })
    .hgetall(k("quiz:tally"));
  if (rid) p1.smembers(k(`qv:${rid}`)).hget(k("quiz:who"), rid);
  const [activeRaw, ranked, tally, upvoted, persona] =
    await p1.exec<unknown[]>();
  const activeId = activeRaw == null ? null : String(activeRaw);

  const flat = (ranked as unknown[]) ?? [];
  const ids: string[] = [];
  const scores: number[] = [];
  for (let i = 0; i < flat.length; i += 2) {
    ids.push(String(flat[i]));
    scores.push(Number(flat[i + 1]));
  }

  let poll: Poll | null = null;
  let votes: Hash = null;
  let vote: unknown = null;
  let texts: Hash = null;
  if (activeId || ids.length) {
    const p2 = r.pipeline();
    if (activeId) {
      p2.get(k(`poll:${activeId}`)).hgetall(k(`poll:${activeId}:votes`));
      if (rid) p2.hget(k(`poll:${activeId}:voters`), rid);
    }
    if (ids.length) p2.hmget(k("q:text"), ...ids);
    const out = await p2.exec<unknown[]>();
    if (activeId) {
      poll = out.shift() as Poll | null;
      votes = out.shift() as Hash;
      if (rid) vote = out.shift();
    }
    if (ids.length) texts = out.shift() as Hash;
  }

  const questions: Question[] = ids.flatMap((id, i) => {
    const text = texts?.[id];
    if (text == null) return [];
    const score = scores[i];
    return [
      {
        id,
        text: String(text),
        votes: votesFromScore(score),
        createdAt: createdAtFromScore(score),
      },
    ];
  });

  const data: Shared = {
    poll: poll
      ? publicPoll(poll, (votes ?? {}) as Record<string, number>)
      : null,
    questions,
    tally: fullTally(tally as Hash),
  };
  cache = { at: Date.now(), data };
  return { ...data, me: rid ? toDevice(vote, upvoted, persona) : NO_DEVICE };
}
