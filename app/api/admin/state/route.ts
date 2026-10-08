import type { Poll } from "@/lib/domain";
import { adminRoute, json } from "@/lib/http";
import { packSummaries } from "@/lib/packs";
import { db, k } from "@/lib/redis";

/** All polls with their votes and correct option, newest first, for /admin. */
export const GET = adminRoute(async () => {
  const r = db();
  const [activeId, ids] = await r
    .pipeline()
    .get<string>(k("poll:active"))
    .zrange(k("poll:ids"), 0, -1, { rev: true })
    .exec<[string | null, unknown[]]>();
  const list = ids.map(String);
  if (!list.length)
    return json({ activeId, polls: [], packs: packSummaries() });
  const p = r.pipeline();
  for (const id of list) p.get(k(`poll:${id}`)).hgetall(k(`poll:${id}:votes`));
  const out = await p.exec<unknown[]>();
  const polls = list.flatMap((_, i) => {
    const poll = out[i * 2] as Poll | null;
    const votes = (out[i * 2 + 1] as Record<string, number> | null) ?? {};
    return poll ? [{ ...poll, votes }] : [];
  });
  return json({ activeId, polls, packs: packSummaries() });
});
