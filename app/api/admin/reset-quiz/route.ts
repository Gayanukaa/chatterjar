import { adminRoute, json } from "@/lib/http";
import { db, k } from "@/lib/redis";
import { invalidate } from "@/lib/state";

export const POST = adminRoute(async () => {
  await db().del(k("quiz:tally"), k("quiz:done"), k("quiz:who"));
  invalidate();
  return json({ ok: true });
});
