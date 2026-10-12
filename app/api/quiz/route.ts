import { body, fail, getRid, json, route } from "@/lib/http";
import {
  PERSONA_PREFIX,
  QUIZ_KEY,
  roomQuiz,
  scorePersona,
  storedPersona,
} from "@/lib/quiz";
import { db, k, touch } from "@/lib/redis";
import { invalidate } from "@/lib/state";

/** Scores one device's answers against the room quiz; counts it once. */
export const POST = route(async (req) => {
  const rid = getRid(req);
  if (!rid) return fail("Reload the page and try again.", 400);
  const { answers, v } = await body(req);
  const r = db();
  const room = roomQuiz(await r.get(k(QUIZ_KEY)));
  const { quiz } = room;
  if (!quiz) return fail("The quiz is off.", 409);
  // Pages loaded before quiz versions send no v; they still get scored.
  if (typeof v === "string" && v !== room.v)
    return fail("The quiz changed. Answer the new questions.", 409);
  const persona = Array.isArray(answers) ? scorePersona(answers, quiz) : null;
  if (!persona)
    return fail(`Answer all ${quiz.questions.length} questions.`, 400);
  const fresh = await r.sadd(k("quiz:done"), rid);
  if (!fresh) {
    const saved = storedPersona(await r.hget(k("quiz:who"), rid));
    // No saved persona yet: another request from this device is counting.
    if (saved == null || quiz.personas.includes(saved))
      return json({ ok: true, persona: saved ?? persona, counted: false });
    // A persona from an older quiz: the quiz changed after it was counted.
  }
  const p = r
    .pipeline()
    .hincrby(k("quiz:tally"), persona, 1)
    .hset(k("quiz:who"), { [rid]: PERSONA_PREFIX + persona });
  touch(p, k("quiz:tally"), k("quiz:done"), k("quiz:who"));
  await p.exec();
  invalidate();
  return json({ ok: true, persona, counted: true });
});
