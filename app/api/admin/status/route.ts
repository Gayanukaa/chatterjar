import type { Poll, PollStatus } from "@/lib/domain";
import { adminRoute, body, fail, json } from "@/lib/http";
import { db, k } from "@/lib/redis";
import { invalidate } from "@/lib/state";
import { t } from "@/lib/i18n";

const STATUSES: PollStatus[] = ["open", "closed", "revealed"];

/** Opens, closes or reveals a poll; that poll becomes the active one. */
export const POST = adminRoute(async (req) => {
  const { id, status } = await body(req);
  if (typeof id !== "string" || !STATUSES.includes(status as PollStatus)) {
    return fail(t("api.status"), 400);
  }
  const r = db();
  const poll = await r.get<Poll>(k(`poll:${id}`));
  if (!poll) return fail(t("api.pollNotFound"), 404);
  const next: Poll = { ...poll, status: status as PollStatus };
  await r
    .pipeline()
    .set(k(`poll:${id}`), next)
    .set(k("poll:active"), id)
    .exec();
  invalidate();
  return json({ ok: true, poll: next });
});
