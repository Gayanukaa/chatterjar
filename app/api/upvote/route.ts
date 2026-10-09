import { VOTE_WEIGHT } from "@/lib/domain";
import { body, fail, getRid, json, route } from "@/lib/http";
import { db, k, touch } from "@/lib/redis";

export const POST = route(async (req) => {
  const rid = getRid(req);
  if (!rid) return fail("Reload the page and try again.", 400);
  const { id } = await body(req);
  if (typeof id !== "string" || !/^q[a-z0-9]+$/.test(id))
    return fail("Question not found.", 404);
  const r = db();
  const q = await r.hmget<Record<string, unknown>>(
    k(`q:${id}`),
    "hidden",
    "by",
    "pending",
  );
  if (
    !q ||
    q.hidden == null ||
    Number(q.hidden) === 1 ||
    Number(q.pending) === 1
  )
    return fail("Question not found.", 404);
  if (String(q.by) === rid)
    return fail("You cannot upvote your own question.", 409);
  const fresh = await r.sadd(k(`qv:${rid}`), id);
  if (!fresh) return fail("You already upvoted this question.", 409);
  // xx: never re-adds a question that was hidden after the check above.
  const p = r
    .pipeline()
    .zadd(
      k("q:rank"),
      { xx: true, incr: true },
      { score: VOTE_WEIGHT, member: id },
    );
  touch(p, k(`qv:${rid}`), k("q:rank"));
  await p.exec();
  return json({ ok: true });
});
