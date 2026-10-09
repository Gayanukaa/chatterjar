import { adminRoute, body, fail, json } from "@/lib/http";
import { PACKS, packPolls } from "@/lib/packs";
import { db, k } from "@/lib/redis";
import { t } from "@/lib/i18n";

/** Loads one content pack; fixed, prefixed ids make loading it twice harmless. */
export const POST = adminRoute(async (req) => {
  const { pack: id } = await body(req);
  const pack = PACKS.find((p) => p.id === id);
  if (!pack) return fail(t("api.pickPack"), 404);
  const polls = packPolls(pack, Date.now());
  if (!polls) return fail(t("api.badPack", { title: pack.title }), 500);
  const p = db().pipeline();
  for (const poll of polls) {
    p.set(k(`poll:${poll.id}`), poll, { nx: true });
    p.zadd(
      k("poll:ids"),
      { nx: true },
      { score: poll.createdAt, member: poll.id },
    );
  }
  await p.exec();
  return json({ ok: true, ids: polls.map((poll) => poll.id) });
});
