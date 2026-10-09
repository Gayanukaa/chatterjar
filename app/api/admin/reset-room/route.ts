import type { Poll } from "@/lib/domain";
import { adminRoute, json } from "@/lib/http";
import { db, k } from "@/lib/redis";
import { invalidate } from "@/lib/state";

/** All keys that match a pattern; SCAN avoids blocking Redis like KEYS would. */
async function scanKeys(pattern: string): Promise<string[]> {
  const r = db();
  const found: string[] = [];
  let cursor: string | number = 0;
  do {
    const [next, keys]: [string | number, string[]] = await r.scan(cursor, {
      match: pattern,
      count: 500,
    });
    found.push(...keys);
    cursor = next;
  } while (String(cursor) !== "0");
  return found;
}

/** Clears votes, questions, quiz answers and reactions; closes every poll. */
export const POST = adminRoute(async () => {
  const r = db();
  const [ids, questionIds] = await r
    .pipeline()
    .zrange(k("poll:ids"), 0, -1)
    .hkeys(k("q:text"))
    .exec<[unknown[], unknown[]]>();
  const pollIds = ids.map(String);
  const polls = pollIds.length
    ? await r.mget<(Poll | null)[]>(...pollIds.map((id) => k(`poll:${id}`)))
    : [];
  const deviceKeys = [
    ...(await scanKeys(k("qv:*"))),
    ...(await scanKeys(k("rl:*"))),
    ...(await scanKeys(k("rr:*"))),
  ];

  const doomed = [
    k("poll:active"),
    k("q:rank"),
    k("q:pending"),
    k("q:text"),
    k("quiz:tally"),
    k("quiz:done"),
    k("quiz:who"),
    k("reactions"),
    ...pollIds.flatMap((id) => [k(`poll:${id}:votes`), k(`poll:${id}:voters`)]),
    ...questionIds.map((id) => k(`q:${String(id)}`)),
    ...deviceKeys,
  ];
  const p = r.pipeline();
  // DEL in chunks keeps each command small for a busy room.
  for (let i = 0; i < doomed.length; i += 200)
    p.del(...doomed.slice(i, i + 200));
  for (const poll of polls)
    if (poll) p.set(k(`poll:${poll.id}`), { ...poll, status: "closed" });
  p.incr(k("room:epoch"));
  await p.exec();
  invalidate();
  return json({
    ok: true,
    polls: pollIds.length,
    questions: questionIds.length,
  });
});
