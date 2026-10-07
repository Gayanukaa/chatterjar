import {
  QUESTIONS_PER_MINUTE,
  questionScore,
  validateQuestion,
} from "@/lib/domain";
import { body, fail, getRid, json, route } from "@/lib/http";
import { db, k } from "@/lib/redis";
import { invalidate } from "@/lib/state";

export const POST = route(async (req) => {
  const rid = getRid(req);
  if (!rid) return fail("Reload the page and try again.", 400);
  const text = validateQuestion((await body(req)).text);
  if (!text) return fail("Write a question of 1 to 200 characters.", 400);
  const r = db();
  const rl = k(`rl:${rid}`);
  const count = await r.incr(rl);
  if (count === 1) await r.expire(rl, 60);
  if (count > QUESTIONS_PER_MINUTE) {
    return fail("You can post 3 questions per minute. Try again soon.", 429);
  }
  const createdAt = Date.now();
  const id = `q${createdAt.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  await r
    .pipeline()
    .hset(k(`q:${id}`), { text, createdAt, hidden: 0, by: rid })
    .zadd(k("q:rank"), { score: questionScore(0, createdAt), member: id })
    .exec();
  invalidate();
  return json({ ok: true, id }, 201);
});
