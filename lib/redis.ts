import { Redis } from "@upstash/redis";
import { MAIN_ROOM, currentRoom } from "./room";

let client: Redis | undefined;
const prefix = process.env.REDIS_PREFIX ?? "";

/** Shared Upstash client; Marketplace KV_* names first, UPSTASH_* as fallback. */
export function db(): Redis {
  if (client) return client;
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    // Fail loudly: an empty URL would only surface as vague fetch errors.
    throw new Error(
      "Redis is not configured. Set KV_REST_API_URL and KV_REST_API_TOKEN " +
        "(see the example env file).",
    );
  }
  client = new Redis({ url, token });
  return client;
}

/** Key in the current room; main keeps the original unscoped names. */
export function k(key: string) {
  const room = currentRoom();
  return prefix + (room === MAIN_ROOM ? "" : `r:${room}:`) + key;
}

/** Global key outside any room (the room registry); REDIS_PREFIX still applies. */
export const kg = (key: string) => prefix + key;

const ttlDays = Number(process.env.DATA_TTL_DAYS ?? 30);
// Audience data expires this long after its last write; 0 keeps it forever.
export const DATA_TTL_S = ttlDays > 0 ? Math.round(ttlDays * 86_400) : 0;

type Expirer = { expire: (key: string, seconds: number) => unknown };

/** Queues an expiry refresh on audience-data keys (no-op when TTL is off). */
export function touch(p: Expirer, ...keys: string[]) {
  if (DATA_TTL_S) for (const key of keys) p.expire(key, DATA_TTL_S);
}
