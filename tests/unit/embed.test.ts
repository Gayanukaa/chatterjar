import { describe, expect, it } from "vitest";
// Next.js compiles headers() sources with this; the test uses the same code.
import { buildCustomRoute } from "next/dist/lib/build-custom-route";
import { embedQuery, frameHeaders, parseEmbed } from "@/lib/embed";

describe("parseEmbed", () => {
  it("defaults to the light poll view", () => {
    expect(parseEmbed({})).toEqual({
      show: "poll",
      theme: "light",
      transparent: false,
    });
  });
  it("reads every known option", () => {
    expect(
      parseEmbed({ show: "qr", theme: "dark", bg: "transparent" }),
    ).toEqual({ show: "qr", theme: "dark", transparent: true });
    for (const show of ["poll", "questions", "tally", "qr", "all"]) {
      expect(parseEmbed({ show }).show).toBe(show);
    }
  });
  it("ignores unknown values and uses the first of repeated keys", () => {
    expect(parseEmbed({ show: "answers", theme: "blue", bg: "red" })).toEqual(
      parseEmbed({}),
    );
    expect(parseEmbed({ show: ["tally", "qr"] }).show).toBe("tally");
  });
  it("round-trips through embedQuery", () => {
    const opts = { show: "all", theme: "dark", transparent: true } as const;
    const query = Object.fromEntries(new URLSearchParams(embedQuery(opts)));
    expect(parseEmbed(query)).toEqual(opts);
    expect(embedQuery(parseEmbed({}))).toBe("");
  });
});

describe("frameHeaders", () => {
  const routes = frameHeaders().map((r) => ({
    regex: new RegExp(buildCustomRoute("header", r).regex),
    headers: r.headers,
  }));

  /** Headers a path gets; later rules override earlier ones, as in Next.js. */
  function headersFor(path: string) {
    const out: Record<string, string> = {};
    for (const r of routes) {
      if (!r.regex.test(path)) continue;
      for (const h of r.headers) out[h.key.toLowerCase()] = h.value;
    }
    return out;
  }

  it("allows framing only for the embed pages", () => {
    for (const path of ["/embed", "/r/abc123/embed"]) {
      expect(headersFor(path), path).toEqual({
        "content-security-policy": "frame-ancestors *",
      });
    }
  });
  it("denies framing everywhere else", () => {
    const paths = [
      "/",
      "/screen",
      "/admin",
      "/admin/rooms",
      "/r/abc123",
      "/r/abc123/screen",
      "/r/abc123/admin",
      "/r/embed",
      "/embedded",
      "/embed/extra",
      "/api/room",
    ];
    for (const path of paths) {
      expect(headersFor(path), path).toEqual({
        "x-frame-options": "DENY",
        "content-security-policy": "frame-ancestors 'none'",
      });
    }
  });
});
