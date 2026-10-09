import { describe, expect, it } from "vitest";
import { parsePollMs } from "@/lib/poll-interval";
import { pickTheme } from "@/lib/screen-theme";

describe("parsePollMs", () => {
  it("defaults to 3000 when unset or not a number", () => {
    expect(parsePollMs(undefined)).toBe(3000);
    expect(parsePollMs("")).toBe(3000);
    expect(parsePollMs("  ")).toBe(3000);
    expect(parsePollMs("fast")).toBe(3000);
  });
  it("keeps values inside the range and rounds them", () => {
    expect(parsePollMs("5000")).toBe(5000);
    expect(parsePollMs("2500.6")).toBe(2501);
  });
  it("clamps to 2000..15000", () => {
    expect(parsePollMs("500")).toBe(2000);
    expect(parsePollMs("-1")).toBe(2000);
    expect(parsePollMs("60000")).toBe(15000);
  });
});

describe("pickTheme", () => {
  it("prefers the URL, then the saved choice, then light", () => {
    expect(pickTheme("dark", "light")).toBe("dark");
    expect(pickTheme("light", "dark")).toBe("light");
    expect(pickTheme(null, "dark")).toBe("dark");
    expect(pickTheme("blue", null)).toBe("light");
    expect(pickTheme(null, "nope")).toBe("light");
  });
});
