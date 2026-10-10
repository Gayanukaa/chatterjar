import type { Poll } from "@/lib/domain";
import {
  buildExport,
  exportFilename,
  toCsv,
  type RawQuestion,
} from "@/lib/export";
import { adminRoute, fail } from "@/lib/http";
import { db, k } from "@/lib/redis";
import { currentRoom } from "@/lib/room";

type Hash = Record<string, unknown> | null;

/** Session results as a JSON or CSV download, hidden questions included. */
export const GET = adminRoute(async (req) => {
  const format = req.nextUrl.searchParams.get("format") ?? "json";
  if (format !== "json" && format !== "csv")
    return fail("Use format=json or format=csv.", 400);
  const r = db();
  const [ids, texts, ranked, tally] = await r
    .pipeline()
    .zrange(k("poll:ids"), 0, -1)
    .hgetall(k("q:text"))
    .zrange(k("q:rank"), 0, -1, { withScores: true })
    .hgetall(k("quiz:tally"))
    .exec<[unknown[], Hash, unknown[], Hash]>();

  const pollIds = ids.map(String);
  const textMap = texts ?? {};
  const questionIds = Object.keys(textMap);
  const rankScore = new Map<string, number>();
  for (let i = 0; i < ranked.length; i += 2)
    rankScore.set(String(ranked[i]), Number(ranked[i + 1]));

  const out: unknown[] = [];
  if (pollIds.length || questionIds.length) {
    const p = r.pipeline();
    for (const id of pollIds)
      p.get(k(`poll:${id}`)).hgetall(k(`poll:${id}:votes`));
    for (const id of questionIds) p.hmget(k(`q:${id}`), "hidden", "score");
    out.push(...(await p.exec<unknown[]>()));
  }

  const polls = pollIds.flatMap((_, i) => {
    const poll = out[i * 2] as Poll | null;
    return poll ? [{ poll, votes: out[i * 2 + 1] as Hash }] : [];
  });
  const questions: RawQuestion[] = questionIds.map((id, i) => {
    const meta = out[pollIds.length * 2 + i] as Hash;
    const hidden = Number(meta?.hidden ?? 0) === 1;
    const saved = meta?.score == null ? null : Number(meta.score);
    return {
      id,
      text: String(textMap[id]),
      score: rankScore.get(id) ?? (hidden ? saved : null),
      hidden,
    };
  });

  const room = currentRoom();
  const now = Date.now();
  const data = buildExport({ room, now, polls, questions, tally });
  // BOM: Excel reads the CSV as UTF-8 only with it.
  const text =
    format === "csv" ? "\uFEFF" + toCsv(data) : JSON.stringify(data, null, 2);
  return new Response(text, {
    headers: {
      "Content-Type":
        format === "csv"
          ? "text/csv; charset=utf-8"
          : "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportFilename(room, now, format)}"`,
      "Cache-Control": "no-store",
    },
  });
});
