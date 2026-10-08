import quiz from "@/data/quiz.json";
import { isPersona, scorePersona } from "@/lib/domain";
import { body, fail, getRid, json, route } from "@/lib/http";
import { db, k } from "@/lib/redis";
import { invalidate } from "@/lib/state";

export const POST = route(async (req) => {
  const rid = getRid(req);
  if (!rid) return fail("Reload the page and try again.", 400);
  const { answers } = await body(req);
  const persona = Array.isArray(answers)
    ? scorePersona(answers, quiz.questions.length)
    : null;
  if (!persona)
    return fail(`Answer all ${quiz.questions.length} questions.`, 400);
  const r = db();
  const fresh = await r.sadd(k("quiz:done"), rid);
  if (!fresh) {
    const saved = await r.hget<string>(k("quiz:who"), rid);
    return json({
      ok: true,
      persona: isPersona(saved) ? saved : persona,
      counted: false,
    });
  }
  await r
    .pipeline()
    .hincrby(k("quiz:tally"), persona, 1)
    .hset(k("quiz:who"), { [rid]: persona })
    .exec();
  invalidate();
  return json({ ok: true, persona, counted: true });
});
