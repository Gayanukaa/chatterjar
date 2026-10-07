import type { Poll } from "@/lib/domain";
import { body, fail, getRid, json, route } from "@/lib/http";
import { db, k } from "@/lib/redis";

export const POST = route(async (req) => {
  const rid = getRid(req);
  if (!rid) return fail("Reload the page and try again.", 400);
  const { pollId, option } = await body(req);
  if (typeof pollId !== "string" || typeof option !== "string") {
    return fail("Pick one of the options.", 400);
  }
  const r = db();
  const [activeId, poll] = await r
    .pipeline()
    .get<string>(k("poll:active"))
    .get<Poll>(k(`poll:${pollId}`))
    .exec<[string | null, Poll | null]>();
  if (!poll || activeId !== pollId || poll.status !== "open") {
    return fail("Voting is closed for this poll.", 409);
  }
  if (!poll.options.some((o) => o.key === option))
    return fail("Pick one of the options.", 400);
  const fresh = await r.hsetnx(k(`poll:${pollId}:voters`), rid, option);
  if (!fresh) return fail("You already voted in this poll.", 409);
  await r.hincrby(k(`poll:${pollId}:votes`), option, 1);
  return json({ ok: true, vote: option });
});
