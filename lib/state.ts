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

export type SharedState = Omit<RoomState, "me">;
type Hash = Record<string, unknown> | null;

// The CDN caches /api/room too; this cache covers self-hosts without a CDN.
const TTL_MS = 1000;
const TOP_QUESTIONS = 50;
const NO_DEVICE: DeviceState = { vote: null, upvoted: [], persona: null };
let cache: { at: number; data: SharedState } | null = null;

/** Drops the cache so this instance shows its own writes at once. */
export function invalidate() {
  cache = null;
}

function fullTally(raw: Hash): Record<Persona, number> {
  const entries = PERSONAS.map((p) => [p, Number(raw?.[p] ?? 0)]);
  return Object.fromEntries(entries) as Record<Persona, number>;
}

/** State every phone shares: active poll, top questions, tally, reset epoch. */
export async function sharedState(): Promise<SharedState> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.data;
  const r = db();
  const [activeRaw, ranked, tally, epoch] = await r
    .pipeline()
    .get(k("poll:active"))
    .zrange(k("q:rank"), 0, TOP_QUESTIONS - 1, { rev: true, withScores: true })
    .hgetall(k("quiz:tally"))
    .get(k("room:epoch"))
    .exec<unknown[]>();
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
  let texts: Hash = null;
  if (activeId || ids.length) {
    const p2 = r.pipeline();
    if (activeId) {
      p2.get(k(`poll:${activeId}`)).hgetall(k(`poll:${activeId}:votes`));
    }
    if (ids.length) p2.hmget(k("q:text"), ...ids);
    const out = await p2.exec<unknown[]>();
    if (activeId) {
      poll = out.shift() as Poll | null;
      votes = out.shift() as Hash;
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

  const data: SharedState = {
    poll: poll
      ? publicPoll(poll, (votes ?? {}) as Record<string, number>)
      : null,
    questions,
    tally: fullTally(tally as Hash),
    epoch: Number(epoch ?? 0),
  };
  cache = { at: Date.now(), data };
  return data;
}

/** This device's vote on pollId, its upvotes and quiz persona: one round trip. */
export async function deviceState(
  rid: string | null,
  pollId: string | null,
): Promise<DeviceState> {
  if (!rid) return NO_DEVICE;
  const p = db().pipeline();
  if (pollId) p.hget(k(`poll:${pollId}:voters`), rid);
  p.smembers(k(`qv:${rid}`)).hget(k("quiz:who"), rid);
  const out = await p.exec<unknown[]>();
  const vote = pollId ? out.shift() : null;
  const [upvoted, persona] = out;
  return {
    vote: vote == null ? null : String(vote),
    upvoted: Array.isArray(upvoted) ? upvoted.map(String) : [],
    persona: isPersona(persona) ? persona : null,
  };
}

/** Shared plus device state in one response (GET /api/state, tests, scripts). */
export async function getState(rid: string | null): Promise<RoomState> {
  const shared = await sharedState();
  return { ...shared, me: await deviceState(rid, shared.poll?.id ?? null) };
}
