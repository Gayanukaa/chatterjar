import quiz from "@/data/quiz.json";
import { isPersona, scorePersona } from "@/lib/domain";
import { body, fail, getRid, json, route } from "@/lib/http";
import { db, k, touch } from "@/lib/redis";
import { invalidate } from "@/lib/state";
import { t } from "@/lib/i18n";

export const POST = route(async (req) => {
  const rid = getRid(req);
  if (!rid) return fail(t("api.reload"), 400);
  const { answers } = await body(req);
  const persona = Array.isArray(answers)
    ? scorePersona(answers, quiz.questions.length)
    : null;
  if (!persona)
    return fail(t("api.quizIncomplete", { count: quiz.questions.length }), 400);
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
  const p = r
    .pipeline()
    .hincrby(k("quiz:tally"), persona, 1)
    .hset(k("quiz:who"), { [rid]: persona });
  touch(p, k("quiz:tally"), k("quiz:done"), k("quiz:who"));
  await p.exec();
  invalidate();
  return json({ ok: true, persona, counted: true });
});
