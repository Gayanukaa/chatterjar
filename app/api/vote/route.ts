import {
  MAX_WORD,
  WORD_VOTE_PREFIX,
  normalizeWord,
  type Poll,
} from "@/lib/domain";
import { body, fail, getRid, json, route } from "@/lib/http";
import { db, k, touch } from "@/lib/redis";

const BAD_WORD = `Write 1 to ${MAX_WORD} letters, numbers, spaces or hyphens.`;

/** One vote per device: an option key, or a short text for word clouds. */
export const POST = route(async (req) => {
  const rid = getRid(req);
  if (!rid) return fail("Reload the page and try again.", 400);
  const { pollId, option, text } = await body(req);
  if (typeof pollId !== "string") return fail("Pick one of the options.", 400);
  const r = db();
  const [activeId, poll] = await r
    .pipeline()
    .get<string>(k("poll:active"))
    .get<Poll>(k(`poll:${pollId}`))
    .exec<[string | null, Poll | null]>();
  if (!poll || activeId !== pollId || poll.status !== "open") {
    return fail("Voting is closed for this poll.", 409);
  }
  const words = poll.kind === "words";
  let vote: string;
  if (words) {
    const word = normalizeWord(text);
    if (!word) return fail(BAD_WORD, 400);
    vote = word;
  } else {
    if (!poll.options.some((o) => o.key === option))
      return fail("Pick one of the options.", 400);
    vote = String(option);
  }
  const stored = words ? WORD_VOTE_PREFIX + vote : vote;
  const fresh = await r.hsetnx(k(`poll:${pollId}:voters`), rid, stored);
  if (!fresh) {
    return fail(
      words
        ? "You already answered this poll."
        : "You already voted in this poll.",
      409,
    );
  }
  const p = r.pipeline().hincrby(k(`poll:${pollId}:votes`), vote, 1);
  touch(p, k(`poll:${pollId}:votes`), k(`poll:${pollId}:voters`));
  await p.exec();
  return json({ ok: true, vote });
});
