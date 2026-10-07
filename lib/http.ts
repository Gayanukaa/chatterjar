import { NextResponse, type NextRequest } from "next/server";

/** JSON response that is never cached. */
export function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export const fail = (error: string, status: number) => json({ error }, status);

/** Device id from the rid cookie set in proxy.ts, or null if missing or malformed. */
export function getRid(req: NextRequest): string | null {
  const rid = req.cookies.get("rid")?.value;
  return rid && /^[0-9a-f-]{36}$/i.test(rid) ? rid : null;
}

export function isAdmin(req: NextRequest): boolean {
  const key =
    req.headers.get("x-admin-key") ?? req.nextUrl.searchParams.get("key");
  const expected = process.env.ADMIN_KEY;
  return Boolean(expected) && key === expected;
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

/** Wraps a route so unexpected errors become a JSON 500 without a stack trace. */
export function route(fn: Handler): Handler {
  return async (req) => {
    try {
      return await fn(req);
    } catch (err) {
      console.error(err);
      return fail("Something went wrong. Try again.", 500);
    }
  };
}

/** Wraps an admin route: 401 unless ADMIN_KEY matches. */
export function adminRoute(fn: Handler): Handler {
  return route(async (req) =>
    isAdmin(req) ? fn(req) : fail("Admin key required.", 401),
  );
}
