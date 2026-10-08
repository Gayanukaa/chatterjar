import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isAdmin } from "@/lib/http";
import { DATA_TTL_S, touch } from "@/lib/redis";

describe("isAdmin", () => {
  beforeEach(() => {
    process.env.ADMIN_KEY = "secret-key";
  });
  afterEach(() => {
    delete process.env.ADMIN_KEY;
  });

  const req = (url: string, key?: string) =>
    new NextRequest(url, { headers: key ? { "x-admin-key": key } : {} });

  it("accepts the right key in the header", () => {
    expect(isAdmin(req("http://x/api/admin/state", "secret-key"))).toBe(true);
  });
  it("rejects a wrong or missing key", () => {
    expect(isAdmin(req("http://x/api/admin/state", "nope"))).toBe(false);
    expect(isAdmin(req("http://x/api/admin/state"))).toBe(false);
  });
  it("ignores a key in the query string", () => {
    expect(isAdmin(req("http://x/api/admin/state?key=secret-key"))).toBe(false);
  });
  it("rejects everything when ADMIN_KEY is unset", () => {
    delete process.env.ADMIN_KEY;
    expect(isAdmin(req("http://x/api/admin/state", ""))).toBe(false);
  });
});

describe("touch", () => {
  it("queues one expiry per key with the default 30-day TTL", () => {
    const calls: [string, number][] = [];
    touch({ expire: (key, s) => calls.push([key, s]) }, "a", "b");
    expect(DATA_TTL_S).toBe(30 * 86_400);
    expect(calls).toEqual([
      ["a", DATA_TTL_S],
      ["b", DATA_TTL_S],
    ]);
  });
});
