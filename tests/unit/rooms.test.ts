import { describe, expect, it } from "vitest";
import { roomPath, withRoom } from "@/lib/api";
import { k, kg } from "@/lib/redis";
import { currentRoom, roomFromUrl, runInRoom } from "@/lib/room";

describe("room-scoped keys", () => {
  it("keeps main-room keys unscoped", () => {
    expect(currentRoom()).toBe("main");
    expect(k("poll:active")).toBe("poll:active");
  });
  it("prefixes keys inside a room, including async work", async () => {
    await runInRoom("abc123", async () => {
      await Promise.resolve();
      expect(k("poll:active")).toBe("r:abc123:poll:active");
      expect(kg("rooms")).toBe("rooms");
    });
    expect(k("poll:active")).toBe("poll:active");
  });
});

describe("room codes", () => {
  it("reads ?room= and rejects malformed codes", () => {
    expect(roomFromUrl(new URL("http://x/api/room"))).toBe("main");
    expect(roomFromUrl(new URL("http://x/api/room?room=abc123"))).toBe(
      "abc123",
    );
    expect(roomFromUrl(new URL("http://x/api/room?room=../etc"))).toBeNull();
    expect(roomFromUrl(new URL("http://x/api/room?room=AB"))).toBeNull();
  });
  it("builds client paths", () => {
    expect(withRoom("/api/room", "main")).toBe("/api/room");
    expect(withRoom("/api/me?poll=p1", "abc123")).toBe(
      "/api/me?poll=p1&room=abc123",
    );
    expect(roomPath("main")).toBe("/");
    expect(roomPath("abc123", "screen")).toBe("/r/abc123/screen");
  });
});
