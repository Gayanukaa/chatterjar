import {
  MAX_QUESTION,
  QUESTIONS_PER_MINUTE,
  questionScore,
  validateQuestion,
} from "@/lib/domain";
import { body, fail, getRid, json, route } from "@/lib/http";
import { needsReview } from "@/lib/moderation";
import { db, k, touch } from "@/lib/redis";
import { invalidate } from "@/lib/state";
import { t } from "@/lib/i18n";

export const POST = route(async (req) => {
  const rid = getRid(req);
  if (!rid) return fail(t("api.reload"), 400);
  const text = validateQuestion((await body(req)).text);
  if (!text) return fail(t("api.questionLength", { max: MAX_QUESTION }), 400);
  const r = db();
  const rl = k(`rl:${rid}`);
  const [count, , moderate] = await r
    .pipeline()
    .incr(rl)
    .expire(rl, 60, "NX")
    .hget(k("settings"), "moderate")
    .exec<[number, number, unknown]>();
  if (count > QUESTIONS_PER_MINUTE) {
    return fail(t("api.questionRate", { count: QUESTIONS_PER_MINUTE }), 429);
  }
  const createdAt = Date.now();
  const id = `q${createdAt.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const flagged = needsReview(text);
  const pending = Number(moderate) === 1 || flagged !== null;
  const p = r.pipeline().hset(k("q:text"), { [id]: text });
  if (pending) {
    // Pending questions stay out of q:rank until the host approves them.
    p.hset(k(`q:${id}`), {
      hidden: 0,
      by: rid,
      pending: 1,
      flagged: flagged ?? "",
    }).zadd(k("q:pending"), { score: createdAt, member: id });
    touch(p, k("q:text"), k(`q:${id}`), k("q:pending"));
  } else {
    p.hset(k(`q:${id}`), { hidden: 0, by: rid }).zadd(k("q:rank"), {
      score: questionScore(0, createdAt),
      member: id,
    });
    touch(p, k("q:text"), k(`q:${id}`), k("q:rank"));
  }
  await p.exec();
  if (pending) return json({ ok: true, id, pending: true }, 201);
  invalidate();
  return json({ ok: true, id }, 201);
});
