import { describe, expect, it } from "vitest";
import { pickTheme } from "@/lib/screen-theme";

describe("pickTheme", () => {
  it("prefers the URL, then the saved choice, then light", () => {
    expect(pickTheme("dark", "light")).toBe("dark");
    expect(pickTheme("light", "dark")).toBe("light");
    expect(pickTheme(null, "dark")).toBe("dark");
    expect(pickTheme("blue", null)).toBe("light");
    expect(pickTheme(null, "nope")).toBe("light");
  });
});
