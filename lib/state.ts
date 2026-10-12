import {
  createdAtFromScore,
  publicPoll,
  reactionTotals,
  storedVote,
  votesFromScore,
  type DeviceState,
  type Poll,
  type Question,
  type RoomState,
} from "./domain";
import { QUIZ_KEY, roomQuiz, tallyFor } from "./quiz";
import { db, k } from "./redis";
import { currentRoom } from "./room";

type SharedState = Omit<RoomState, "me">;
type Hash = Record<string, unknown> | null;

// The CDN caches /api/room too; this cache covers self-hosts without a CDN.
const TTL_MS = 1000;
const TOP_QUESTIONS = 50;
const NO_DEVICE: DeviceState = { vote: null, upvoted: [], persona: null };
const cache = new Map<string, { at: number; data: SharedState }>();

/** Drops the cache so this instance shows its own writes at once. */
export function invalidate() {
  cache.delete(currentRoom());
}

/** State every phone shares: poll, questions, quiz, tally, reactions, epoch. */
export async function sharedState(): Promise<SharedState> {
  const room = currentRoom();
  const hit = cache.get(room);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;
  const r = db();
  const [activeRaw, ranked, tally, epoch, reactions, quizRaw] = await r
    .pipeline()
    .get(k("poll:active"))
    .zrange(k("q:rank"), 0, TOP_QUESTIONS - 1, { rev: true, withScores: true })
    .hgetall(k("quiz:tally"))
    .get(k("room:epoch"))
    .hgetall(k("reactions"))
    .get(k(QUIZ_KEY))
    .exec<unknown[]>();
  const { quiz, v } = roomQuiz(quizRaw);
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
    quiz: quiz ? { v, personas: quiz.personas } : null,
    tally: tallyFor(quiz?.personas ?? [], tally as Hash),
    epoch: Number(epoch ?? 0),
    reactions: reactionTotals(reactions as Hash),
  };
  cache.set(room, { at: Date.now(), data });
  return data;
}

/** This device's vote on pollId, upvotes and quiz persona: one round trip. */
export async function deviceState(
  rid: string | null,
  pollId: string | null,
): Promise<DeviceState> {
  if (!rid) return NO_DEVICE;
  const p = db().pipeline();
  if (pollId) p.hget(k(`poll:${pollId}:voters`), rid);
  p.smembers(k(`qv:${rid}`))
    .hget(k("quiz:who"), rid)
    .get(k(QUIZ_KEY));
  const out = await p.exec<unknown[]>();
  const vote = pollId ? out.shift() : null;
  const [upvoted, saved, quizRaw] = out;
  // Upstash parses "2024" as a number, so compare the persona as text.
  const persona = saved == null ? null : String(saved);
  // A persona from an older quiz in this room no longer counts.
  const personas = roomQuiz(quizRaw).quiz?.personas ?? [];
  return {
    vote: storedVote(vote),
    upvoted: Array.isArray(upvoted) ? upvoted.map(String) : [],
    persona: persona && personas.includes(persona) ? persona : null,
  };
}
