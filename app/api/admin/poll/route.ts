import { parseOptions, type Poll } from "@/lib/domain";
import { adminRoute, body, fail, json } from "@/lib/http";
import { db, k } from "@/lib/redis";

export const POST = adminRoute(async (req) => {
  const b = await body(req);
  const question = typeof b.question === "string" ? b.question.trim() : "";
  const options = parseOptions(b.options);
  if (!question || question.length > 300) return fail("Write a question.", 400);
  if (!options) return fail("Add 2 to 4 options with text.", 400);
  const correct = options.some((o) => o.key === b.correct)
    ? String(b.correct)
    : undefined;
  const createdAt = Date.now();
  const poll: Poll = {
    id: `p${createdAt.toString(36)}`,
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
