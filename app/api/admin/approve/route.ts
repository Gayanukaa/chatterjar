import { questionScore } from "@/lib/domain";
import { adminRoute, body, fail, json } from "@/lib/http";
import { db, k, touch } from "@/lib/redis";
import { invalidate } from "@/lib/state";

/** Moves a pending question into the ranking so everyone sees it. */
export const POST = adminRoute(async (req) => {
  const { id } = await body(req);
  if (typeof id !== "string" || !/^q[a-z0-9]+$/.test(id))
    return fail("Question not found.", 404);
  const r = db();
  const createdAt = await r.zscore(k("q:pending"), id);
  if (createdAt == null) return fail("Question not found.", 404);
  const p = r
    .pipeline()
    .zrem(k("q:pending"), id)
    .hset(k(`q:${id}`), { pending: 0 })
    .zadd(k("q:rank"), {
      score: questionScore(0, Number(createdAt)),
      member: id,
    });
  touch(p, k(`q:${id}`), k("q:rank"));
  await p.exec();
  invalidate();
  return json({ ok: true });
});
