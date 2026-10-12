import type { PendingQuestion, Poll, RoomSettings } from "@/lib/domain";
import { adminRoute, json } from "@/lib/http";
import { packSummaries } from "@/lib/packs";
import { QUIZ_KEY, adminQuiz } from "@/lib/quiz";
import { db, k } from "@/lib/redis";

const MAX_PENDING = 50;

/** Polls (newest first, with votes and answers), settings, review queue, quiz. */
export const GET = adminRoute(async () => {
  const r = db();
  const [activeId, ids, moderate, queued, pendingTotal, quizRaw] = await r
    .pipeline()
    .get<string>(k("poll:active"))
    .zrange(k("poll:ids"), 0, -1, { rev: true })
    .hget(k("settings"), "moderate")
    .zrange(k("q:pending"), 0, MAX_PENDING - 1, { rev: true, withScores: true })
    .zcard(k("q:pending"))
    .get(k(QUIZ_KEY))
    .exec<[string | null, unknown[], unknown, unknown[], number, unknown]>();
  const settings: RoomSettings = { moderate: Number(moderate) === 1 };
  const list = ids.map(String);
  const flat = queued ?? [];
  const pendingIds: string[] = [];
  const createdAt: number[] = [];
  for (let i = 0; i < flat.length; i += 2) {
    pendingIds.push(String(flat[i]));
    createdAt.push(Number(flat[i + 1]));
  }

  const p = r.pipeline();
  for (const id of list) p.get(k(`poll:${id}`)).hgetall(k(`poll:${id}:votes`));
  if (pendingIds.length) p.hmget(k("q:text"), ...pendingIds);
  for (const id of pendingIds) p.hget(k(`q:${id}`), "flagged");
  const out = list.length || pendingIds.length ? await p.exec<unknown[]>() : [];

  const polls = list.flatMap((_, i) => {
    const poll = out[i * 2] as Poll | null;
    const votes = (out[i * 2 + 1] as Record<string, number> | null) ?? {};
    return poll ? [{ ...poll, votes }] : [];
  });
  const rest = out.slice(list.length * 2);
  const texts = (rest.shift() ?? null) as Record<string, unknown> | null;
  const pending: PendingQuestion[] = pendingIds.flatMap((id, i) => {
    const text = texts?.[id];
    if (text == null) return [];
    const flagged = rest[i];
    return [
      {
        id,
        text: String(text),
        createdAt: createdAt[i],
        flagged: flagged ? String(flagged) : null,
      },
    ];
  });
  return json({
    activeId,
    polls,
    packs: packSummaries(),
    settings,
    pending,
    pendingTotal: Number(pendingTotal) || 0,
    quiz: adminQuiz(quizRaw),
  });
});
