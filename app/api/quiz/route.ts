import { body, fail, getRid, json, route } from "@/lib/http";
import { QUIZ_KEY, roomQuiz, scorePersona } from "@/lib/quiz";
import { db, k, touch } from "@/lib/redis";
import { invalidate } from "@/lib/state";

/** Scores one device's answers against the room quiz; counts it once. */
export const POST = route(async (req) => {
  const rid = getRid(req);
  if (!rid) return fail("Reload the page and try again.", 400);
  const { answers } = await body(req);
  const r = db();
  const { quiz } = roomQuiz(await r.get(k(QUIZ_KEY)));
  if (!quiz) return fail("The quiz is off.", 409);
  const persona = Array.isArray(answers) ? scorePersona(answers, quiz) : null;
  if (!persona)
    return fail(`Answer all ${quiz.questions.length} questions.`, 400);
  const fresh = await r.sadd(k("quiz:done"), rid);
  if (!fresh) {
    const saved = await r.hget(k("quiz:who"), rid);
    const known = saved != null && quiz.personas.includes(String(saved));
    return json({
      ok: true,
      persona: known ? String(saved) : persona,
      counted: false,
    });
  }
  const p = r
    .pipeline()
    .hincrby(k("quiz:tally"), persona, 1)
    .hset(k("quiz:who"), { [rid]: persona });
  touch(p, k("quiz:tally"), k("quiz:done"), k("quiz:who"));
  await p.exec();
  invalidate();
  return json({ ok: true, persona, counted: true });
});
