import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { RID_PATTERN } from "./domain";
import { MAIN_ROOM, currentRoom, roomFromUrl, runInRoom } from "./room";
import { getRoomMeta, hashToken, roomExists } from "./rooms";

/** JSON response that is never cached. */
export function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export const fail = (error: string, status: number) => json({ error }, status);

/** JSON the Vercel CDN may cache for 1 s; only for data every client shares. */
export function sharedJson(data: unknown) {
  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, s-maxage=1, must-revalidate" },
  });
}

/** Device id from the rid cookie set in proxy.ts, or null if missing or malformed. */
export function getRid(req: NextRequest): string | null {
  const rid = req.cookies.get("rid")?.value;
  return rid && RID_PATTERN.test(rid) ? rid : null;
}

const digest = (s: string) => createHash("sha256").update(s).digest();

/** Constant-time compare of two secrets (equal-length digests). */
export const sameSecret = (a: string, b: string) =>
  timingSafeEqual(digest(a), digest(b));

const headerKey = (req: NextRequest) => req.headers.get("x-admin-key");

/** True if x-admin-key matches ADMIN_KEY; header only, so keys stay out of logs. */
export function isAdmin(req: NextRequest): boolean {
  const key = headerKey(req);
  const expected = process.env.ADMIN_KEY;
  return Boolean(key && expected) && sameSecret(key!, expected!);
}

/** True if x-admin-key matches SUPER_ADMIN_KEY (the owner, all rooms). */
export function isSuper(req: NextRequest): boolean {
  const key = headerKey(req);
  const expected = process.env.SUPER_ADMIN_KEY;
  return Boolean(key && expected) && sameSecret(key!, expected!);
}

/** Admin of the current room: owner, ADMIN_KEY for main, or the room's token. */
async function isRoomAdmin(req: NextRequest): Promise<boolean> {
  if (isSuper(req)) return true;
  const room = currentRoom();
  if (room === MAIN_ROOM) return isAdmin(req);
  const key = headerKey(req);
  const meta = await getRoomMeta(room);
  return Boolean(key && meta) && sameSecret(hashToken(key!), meta!.tokenHash);
}

/** Parsed JSON body, or an empty object when the body is not JSON. */
export async function body(req: NextRequest): Promise<Record<string, unknown>> {
  try {
    const data = await req.json();
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

type Handler = (req: NextRequest) => Promise<Response>;

/** Unexpected errors become a JSON 500 without a stack trace. */
async function safely(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    console.error(err);
    return fail("Something went wrong. Try again.", 500);
  }
}

/** Wraps a route: resolves ?room= (default main) and scopes all keys to it. */
export function route(fn: Handler): Handler {
  return (req) =>
    safely(async () => {
      const room = roomFromUrl(req.nextUrl);
      if (!room || !(await roomExists(room))) {
        return fail("Room not found.", 404);
      }
      return runInRoom(room, () => fn(req));
    });
}

/** Wraps an admin route: 401 unless the key unlocks this room. */
export function adminRoute(fn: Handler): Handler {
  return route(async (req) =>
    (await isRoomAdmin(req)) ? fn(req) : fail("Admin key required.", 401),
  );
}

/** Wraps an owner-only route; rooms are off when SUPER_ADMIN_KEY is unset. */
export function superRoute(fn: Handler): Handler {
  return (req) =>
    safely(async () => {
      if (!process.env.SUPER_ADMIN_KEY) {
        return fail("Rooms are not enabled. Set SUPER_ADMIN_KEY.", 403);
      }
      return isSuper(req) ? fn(req) : fail("Owner key required.", 401);
    });
}
