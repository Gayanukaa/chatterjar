import {
  REACTIONS_PER_WINDOW,
  REACTION_WINDOW_S,
  isReaction,
} from "@/lib/domain";
import { body, fail, getRid, json, route } from "@/lib/http";
import { db, k, touch } from "@/lib/redis";
import { t } from "@/lib/i18n";

export const POST = route(async (req) => {
  const rid = getRid(req);
  if (!rid) return fail(t("api.reload"), 400);
  const { type } = await body(req);
  if (!isReaction(type)) return fail(t("api.pickReaction"), 400);
  const r = db();
  const rl = k(`rr:${rid}`);
  const [count] = await r
    .pipeline()
    .incr(rl)
    .expire(rl, REACTION_WINDOW_S, "NX")
    .exec<[number, number]>();
  if (count > REACTIONS_PER_WINDOW) return fail(t("api.slowDown"), 429);
  const p = r.pipeline().hincrby(k("reactions"), type, 1);
  touch(p, k("reactions"));
  await p.exec();
  return json({ ok: true });
});
