import { describe, expect, it } from "vitest";
import { needsReview } from "@/lib/moderation";

describe("needsReview", () => {
  it("passes clean questions", () => {
    for (const text of [
      "How do you test agents?",
      "Is Hancock in Scunthorpe?",
      "What did Dickens think of classes?",
      "Can I pass 3 arguments to $PATH?",
      "Is the cockpit demo on GitHub?",
      "Was the speaker too cocky?",
    ])
      expect(needsReview(text), text).toBeNull();
  });

  it("flags profanity in any case and with suffixes", () => {
    for (const text of [
      "This is shit",
      "What the FUCK",
      "fucking slow build",
      "Shitty wifi here",
    ])
      expect(needsReview(text), text).toBe("language");
  });

  it("flags common compounds", () => {
    for (const text of [
      "That is bullshit",
      "what a motherfucker",
      "Motherfucking bugs",
      "pure horseshit",
      "some dipshit wrote this",
      "Shithead move",
      "dumbass question",
      "Jackasses everywhere",
    ])
      expect(needsReview(text), text).toBe("language");
  });

  it("flags common character swaps", () => {
    for (const text of ["sh1t demo", "$hit", "b1tch", "@sshole", "5lut"])
      expect(needsReview(text), text).toBe("language");
  });

  it("flags links", () => {
    for (const text of [
      "See http://example.com",
      "Look at HTTPS://evil.test/x",
      "go to www.example.com",
    ])
      expect(needsReview(text), text).toBe("link");
  });

  it("does not flag words that only look like links", () => {
    expect(needsReview("Is the www standard still relevant?")).toBeNull();
    expect(needsReview("What about https support?")).toBeNull();
  });
});
