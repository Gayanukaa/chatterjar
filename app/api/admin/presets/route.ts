import rounds from "@/data/rounds.json";
import { buildPresets } from "@/lib/domain";
import { adminRoute, json } from "@/lib/http";
import { db, k } from "@/lib/redis";

/** Loads the Spot-the-AI rounds and the exam poll; fixed ids make it idempotent. */
export const POST = adminRoute(async () => {
  const polls = buildPresets(rounds, Date.now());
  const p = db().pipeline();
  for (const poll of polls) {
    p.set(k(`poll:${poll.id}`), poll, { nx: true });
    p.zadd(
      k("poll:ids"),
      { nx: true },
      { score: poll.createdAt, member: poll.id },
    );
  }
  await p.exec();
  return json({ ok: true, ids: polls.map((poll) => poll.id) });
});
