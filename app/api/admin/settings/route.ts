import { adminRoute, body, fail, json } from "@/lib/http";
import { db, k } from "@/lib/redis";
import { t } from "@/lib/i18n";

/** Turns question review on or off for this room. */
export const POST = adminRoute(async (req) => {
  const { moderate } = await body(req);
  if (typeof moderate !== "boolean") return fail(t("api.settings"), 400);
  await db().hset(k("settings"), { moderate: moderate ? "1" : "0" });
  return json({ ok: true, settings: { moderate } });
});
