import { adminRoute, body, fail, json } from "@/lib/http";
import { db, k } from "@/lib/redis";
import { invalidate } from "@/lib/state";

/** Hides a question for everyone; for a pending question this rejects it. */
export const POST = adminRoute(async (req) => {
  const { id } = await body(req);
  if (typeof id !== "string" || !/^q[a-z0-9]+$/.test(id))
    return fail("Question not found.", 404);
  const r = db();
  const score = await r.zscore(k("q:rank"), id);
  // The saved score keeps votes and time for the session export.
  const fields: Record<string, number> = { hidden: 1 };
  if (score != null) fields.score = Number(score);
  await r
    .pipeline()
    .hset(k(`q:${id}`), fields)
    .zrem(k("q:rank"), id)
    .zrem(k("q:pending"), id)
    .exec();
  invalidate();
  return json({ ok: true });
});
