import type { NextRequest } from "next/server";
import { getRid, json, route } from "@/lib/http";
import { deviceState } from "@/lib/state";

const POLL_ID = /^[a-z0-9-]{1,80}$/i;

/** This device's vote on ?poll=, upvotes and persona; never cached. */
export const GET = route(async (req: NextRequest) => {
  const poll = req.nextUrl.searchParams.get("poll");
  const pollId = poll && POLL_ID.test(poll) ? poll : null;
  return json(await deviceState(getRid(req), pollId));
});
