import { createHash, randomBytes, randomInt } from "node:crypto";
import { db, kg } from "./redis";
import { MAIN_ROOM } from "./room";

export interface RoomInfo {
  code: string;
  title: string;
  createdAt: number;
}

interface RoomMeta extends RoomInfo {
  tokenHash: string;
}

// Lookups run on every request. Only owner-created rooms are cached (misses
// are not), so the cache is bounded by the room count. A short TTL limits how
// long another instance trusts a room that was just deleted.
const META_TTL_MS = 5_000;
const metaCache = new Map<string, { at: number; meta: RoomMeta }>();
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

export const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

/** Stored room record, or null if the room does not exist. */
export async function getRoomMeta(code: string): Promise<RoomMeta | null> {
  const hit = metaCache.get(code);
  if (hit && Date.now() - hit.at < META_TTL_MS) return hit.meta;
  const raw = await db().hgetall<Record<string, unknown>>(kg(`rooms:${code}`));
  const meta = raw?.tokenHash
    ? {
        code,
        title: String(raw.title ?? code),
        createdAt: Number(raw.createdAt ?? 0),
        tokenHash: String(raw.tokenHash),
      }
    : null;
  if (meta) metaCache.set(code, { at: Date.now(), meta });
  return meta;
}

export async function roomExists(code: string): Promise<boolean> {
  return code === MAIN_ROOM || (await getRoomMeta(code)) !== null;
}

/** All created rooms, newest first, without their token hashes. */
export async function listRooms(): Promise<RoomInfo[]> {
  const codes = (await db().zrange(kg("rooms"), 0, -1, { rev: true })).map(
    String,
  );
  if (!codes.length) return [];
  const p = db().pipeline();
  for (const code of codes) p.hgetall(kg(`rooms:${code}`));
  const out = await p.exec<(Record<string, unknown> | null)[]>();
  return codes.flatMap((code, i) => {
    const raw = out[i];
    if (!raw) return [];
    return [
      {
        code,
        title: String(raw.title ?? code),
        createdAt: Number(raw.createdAt ?? 0),
      },
    ];
  });
}

/** Creates a room; the plain admin token is returned once and never stored. */
export async function createRoom(title: string) {
  const r = db();
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = Array.from(
      { length: 6 },
      () => ALPHABET[randomInt(ALPHABET.length)],
    ).join("");
    const token = randomBytes(18).toString("base64url");
    const createdAt = Date.now();
    // hsetnx claims the code, so two creates can never share a room.
    const claimed = await r.hsetnx(
      kg(`rooms:${code}`),
      "tokenHash",
      hashToken(token),
    );
    if (!claimed) continue;
    try {
      await r
        .pipeline()
        .hset(kg(`rooms:${code}`), { title, createdAt })
        .zadd(kg("rooms"), { score: createdAt, member: code })
        .exec();
    } catch (err) {
      // Release the claimed code so no invisible half-made room stays behind.
      await r.del(kg(`rooms:${code}`));
      throw err;
    }
    metaCache.delete(code);
    return { code, title, createdAt, token };
  }
  throw new Error("Could not find a free room code.");
}

/** Deletes a room record and every key of that room. */
export async function deleteRoom(code: string): Promise<number> {
  const r = db();
  const doomed: string[] = [];
  let cursor: string | number = 0;
  do {
    const [next, keys]: [string | number, string[]] = await r.scan(cursor, {
      match: kg(`r:${code}:*`),
      count: 500,
    });
    doomed.push(...keys);
    cursor = next;
  } while (String(cursor) !== "0");
  const p = r.pipeline();
  for (let i = 0; i < doomed.length; i += 200)
    p.del(...doomed.slice(i, i + 200));
  p.del(kg(`rooms:${code}`)).zrem(kg("rooms"), code);
  await p.exec();
  metaCache.delete(code);
  return doomed.length;
}
