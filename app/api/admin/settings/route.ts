import { adminRoute, body, fail, json } from "@/lib/http";
import { db, k } from "@/lib/redis";

/** Turns question review on or off for this room. */
export const POST = adminRoute(async (req) => {
  const { moderate } = await body(req);
  if (typeof moderate !== "boolean")
    return fail("Send moderate: true or false.", 400);
  await db().hset(k("settings"), { moderate: moderate ? "1" : "0" });
  return json({ ok: true, settings: { moderate } });
});
