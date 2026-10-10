// Short on purpose: it only routes a question to the review queue.
const WORDS = [
  "fuck",
  "shit",
  "bitch",
  "cunt",
  "asshole",
  "bastard",
  "dick",
  "cock",
  "pussy",
  "whore",
  "slut",
  "fag",
  "faggot",
  "nigger",
  "nigga",
  "retard",
  "bullshit",
  "horseshit",
  "dipshit",
  "shithead",
  "motherfuck",
  "dumbass",
  "jackass",
];
const SWAPS: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
  $: "s",
};
const ENDS = "s|es|ed|er|ers|ing|in|ty";
// No "y" after short roots: "cocky" is a real word, "shitty" still matches.
const short = WORDS.filter((w) => w.length <= 4).join("|");
const long = WORDS.filter((w) => w.length > 4).join("|");
const BAD = new RegExp(
  `\\b(?:(?:${short})(?:${ENDS})?|(?:${long})(?:${ENDS}|y)?)\\b`,
);
const LINK = /\bhttps?:\/\/|\bwww\./i;

type ReviewReason = "language" | "link";

/** Why a question needs the host's review, or null when it looks clean. */
export function needsReview(text: string): ReviewReason | null {
  const plain = text.toLowerCase().replace(/[013457@$]/g, (c) => SWAPS[c]);
  if (BAD.test(plain)) return "language";
  if (LINK.test(text)) return "link";
  return null;
}
