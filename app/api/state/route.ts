import { getRid, json, route } from "@/lib/http";
import { getState } from "@/lib/state";

export const GET = route(async (req) => json(await getState(getRid(req))));
