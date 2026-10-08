import { Redis } from "@upstash/redis";

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

/** Prefixes a key so e2e runs (REDIS_PREFIX=e2e:) never touch live data. */
export const k = (key: string) => prefix + key;
