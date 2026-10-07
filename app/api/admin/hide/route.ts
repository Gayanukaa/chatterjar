import { adminRoute, body, fail, json } from "@/lib/http";
import { db, k } from "@/lib/redis";
import { invalidate } from "@/lib/state";

/** Hides a question for everyone by removing it from the ranking. */
export const POST = adminRoute(async (req) => {
  const { id } = await body(req);
  if (typeof id !== "string" || !/^q[a-z0-9]+$/.test(id))
    return fail("Question not found.", 404);
  await db()
    .pipeline()
    .hset(k(`q:${id}`), { hidden: 1 })
    .zrem(k("q:rank"), id)
    .exec();
  invalidate();
  return json({ ok: true });
});
