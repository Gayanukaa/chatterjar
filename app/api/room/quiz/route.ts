import { route, sharedJson } from "@/lib/http";
import { QUIZ_KEY, roomQuiz } from "@/lib/quiz";
import { db, k } from "@/lib/redis";

/** Room quiz questions; phones add ?v= so a new version skips the CDN copy. */
export const GET = route(async () => {
  const { v, quiz } = roomQuiz(await db().get(k(QUIZ_KEY)));
  return sharedJson({ v, quiz });
});
