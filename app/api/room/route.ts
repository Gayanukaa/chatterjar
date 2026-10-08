import { route, sharedJson } from "@/lib/http";
import { sharedState } from "@/lib/state";

/** Shared room state, CDN-cached for 1 s so most phone polls skip the function. */
export const GET = route(async () => sharedJson(await sharedState()));
