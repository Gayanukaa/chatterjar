import { adminRoute, json } from "@/lib/http";
import { db, k } from "@/lib/redis";
import { invalidate } from "@/lib/state";

/** Retracts the active poll: phones and /screen show no poll until one opens. */
export const POST = adminRoute(async () => {
  await db().del(k("poll:active"));
  invalidate();
  return json({ ok: true });
});
