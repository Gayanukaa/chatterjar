import { NextResponse, type NextRequest } from "next/server";
import { RID_PATTERN } from "@/lib/domain";

const YEAR_S = 60 * 60 * 24 * 365;

/** Gives every visitor an anonymous rid device cookie (random UUID, 1 year). */
export function proxy(req: NextRequest) {
  if (RID_PATTERN.test(req.cookies.get("rid")?.value ?? "")) {
    return NextResponse.next();
  }
  const rid = crypto.randomUUID();
  // Set it on the request too, so the first API call already has a device id.
  req.cookies.set("rid", rid);
  const res = NextResponse.next({ request: { headers: req.headers } });
  res.cookies.set("rid", rid, {
    httpOnly: true,
    sameSite: "lax",
    // Secure only over HTTPS, so plain-HTTP self-hosts still get a device id.
    secure:
      req.nextUrl.protocol === "https:" ||
      req.headers.get("x-forwarded-proto") === "https",
    maxAge: YEAR_S,
    path: "/",
  });
  return res;
}

// /api/room is CDN-cached, so it must never carry a Set-Cookie header.
export const config = {
  matcher: ["/((?!_next/|favicon.ico|api/room).*)"],
};
