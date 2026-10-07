import {
  OPTION_KEYS,
  type MediaType,
  type Option,
  type Poll,
} from "@/lib/domain";
import { adminRoute, body, fail, json } from "@/lib/http";
import { db, k } from "@/lib/redis";

const MEDIA_TYPES: MediaType[] = ["image", "code", "text", "audio"];

/** Builds a valid option list from the request, or null if it is invalid. */
function parseOptions(raw: unknown): Option[] | null {
  if (!Array.isArray(raw) || raw.length < 2 || raw.length > 4) return null;
  const options: Option[] = [];
  for (const [i, o] of raw.entries()) {
    const label = typeof o?.label === "string" ? o.label.trim() : "";
    if (!label || label.length > 200) return null;
    const option: Option = { key: OPTION_KEYS[i], label };
    const m = o?.media;
    if (
      m &&
      MEDIA_TYPES.includes(m.type) &&
      typeof m.src === "string" &&
      m.src.startsWith("/")
    ) {
      option.media = { type: m.type, src: m.src };
    }
    options.push(option);
  }
  return options;
}

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
