import { NextResponse, type NextRequest } from "next/server";

const YEAR_S = 60 * 60 * 24 * 365;

/** Gives every visitor an anonymous rid device cookie (random UUID, 1 year). */
export function proxy(req: NextRequest) {
  if (req.cookies.get("rid")) return NextResponse.next();
  const rid = crypto.randomUUID();
  // Set it on the request too, so the first API call already has a device id.
  req.cookies.set("rid", rid);
  const res = NextResponse.next({ request: { headers: req.headers } });
  res.cookies.set("rid", rid, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: YEAR_S,
    path: "/",
  });
  return res;
}

export const config = { matcher: ["/((?!_next/|spot/|favicon.ico).*)"] };
