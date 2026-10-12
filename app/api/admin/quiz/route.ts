import { adminRoute, body, fail, json } from "@/lib/http";
import { QUIZ_KEY, adminQuiz, checkQuiz, nextStored } from "@/lib/quiz";
import { db, k } from "@/lib/redis";
import { invalidate } from "@/lib/state";

/** Saves a custom quiz, turns the quiz off or on, or restores the starter. */
export const POST = adminRoute(async (req) => {
  const { action, quiz } = await body(req);
  const r = db();
  let stored: unknown;
  if (action === "save") {
    const checked = checkQuiz(quiz);
    if (typeof checked === "string") return fail(checked, 400);
    stored = { ...checked, v: String(Date.now()) };
  } else if (action === "off" || action === "on" || action === "starter") {
    stored = nextStored(action, await r.get(k(QUIZ_KEY)));
  } else return fail("Send action save, off, on or starter.", 400);
  // Old answers belong to the old quiz; the epoch makes phones drop them.
  const p = r
    .pipeline()
    .del(k("quiz:tally"), k("quiz:done"), k("quiz:who"))
    .incr(k("room:epoch"));
  if (stored == null) p.del(k(QUIZ_KEY));
  else p.set(k(QUIZ_KEY), stored);
  await p.exec();
  invalidate();
  return json({ ok: true, quiz: adminQuiz(stored) });
});
