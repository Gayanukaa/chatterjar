import { isPollKind, optionsFor, type Poll } from "@/lib/domain";
import { adminRoute, body, fail, json } from "@/lib/http";
import { db, k } from "@/lib/redis";
import { t } from "@/lib/i18n";

export const POST = adminRoute(async (req) => {
  const b = await body(req);
  const question = typeof b.question === "string" ? b.question.trim() : "";
  if (b.kind !== undefined && !isPollKind(b.kind)) {
    return fail(t("api.pollKind"), 400);
  }
  const kind = isPollKind(b.kind) ? b.kind : "choice";
  const options = optionsFor(kind, b.options);
  if (!question || question.length > 300)
    return fail(t("api.pollQuestion"), 400);
  if (!options) return fail(t("api.pollOptions"), 400);
  // Only multiple choice polls can have a correct option.
  const correct =
    kind === "choice" && options.some((o) => o.key === b.correct)
      ? String(b.correct)
      : undefined;
  const createdAt = Date.now();
  const poll: Poll = {
    id: `p${createdAt.toString(36)}`,
    kind,
    question,
    options,
    correct,
    status: "closed",
    createdAt,
  };
  await db()
    .pipeline()
    .set(k(`poll:${poll.id}`), poll)
    .zadd(k("poll:ids"), { score: createdAt, member: poll.id })
    .exec();
  return json({ ok: true, poll }, 201);
});
