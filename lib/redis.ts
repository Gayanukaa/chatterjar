import { Redis } from "@upstash/redis";

let client: Redis | undefined;
const prefix = process.env.REDIS_PREFIX ?? "";

/** Shared Upstash client; Marketplace KV_* names first, UPSTASH_* as fallback. */
export function db(): Redis {
  client ??= new Redis({
    url:
      process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL ?? "",
    token:
      process.env.KV_REST_API_TOKEN ??
      process.env.UPSTASH_REDIS_REST_TOKEN ??
      "",
  });
  return client;
}

/** Prefixes a key so e2e runs (REDIS_PREFIX=e2e:) never touch live data. */
export const k = (key: string) => prefix + key;
