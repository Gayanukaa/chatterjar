import { adminRoute, json } from "@/lib/http";
import { db, k } from "@/lib/redis";
import { invalidate } from "@/lib/state";

export const POST = adminRoute(async () => {
  await db()
    .pipeline()
    .del(k("quiz:tally"), k("quiz:done"), k("quiz:who"))
    .incr(k("room:epoch"))
    .exec();
  invalidate();
  return json({ ok: true });
});
