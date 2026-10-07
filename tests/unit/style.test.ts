import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { parse } from "@typescript-eslint/typescript-estree";
import { describe, expect, it } from "vitest";

// Text files only; binary bytes could match the em dash sequence by chance.
const TEXT =
  /\.(ts|tsx|js|jsx|mjs|cjs|json|md|css|txt|java|csv|drawio|svg|ya?ml)$/;
const CODE = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
const PRAGMA = /^(eslint-|@ts-|prettier-ignore)/;
const EM_DASH = String.fromCharCode(0x2014);
const MAX_COMMENT = 80;

const files = execSync("git ls-files --cached --others --exclude-standard", {
  encoding: "utf8",
})
  .split("\n")
  .filter(
    (f) => f && TEXT.test(f) && f !== "package-lock.json" && existsSync(f),
  );

/** Returns rule breaks for one code file: long comments and long JSDoc. */
function commentProblems(file: string): string[] {
  const src = readFileSync(file, "utf8");
  const ast = parse(src, { comment: true, loc: true, jsx: /x$/.test(file) });
  const problems: string[] = [];
  for (const c of ast.comments ?? []) {
    const text = c.value.trim();
    if (PRAGMA.test(text)) continue;
    const where = `${file}:${c.loc.start.line}`;
    const lines = c.value.split("\n");
    if (c.type === "Line" || lines.length === 1) {
      if (text.replace(/^\*+/, "").trim().length > MAX_COMMENT) {
        problems.push(`${where} comment over ${MAX_COMMENT} chars`);
      }
    } else if (c.value.startsWith("*")) {
      const body = lines
        .map((l) => l.replace(/^\s*\*?\s?/, "").trim())
        .filter(Boolean);
      if (body.length > 2) problems.push(`${where} docstring over 2 lines`);
    }
  }
  return problems;
}

describe("house style", () => {
  it("has no em dash in any text file", () => {
    const bad = files.filter((f) => readFileSync(f, "utf8").includes(EM_DASH));
    expect(bad).toEqual([]);
  });

  it("keeps comments short and docstrings at most two lines", () => {
    const problems = files.filter((f) => CODE.test(f)).flatMap(commentProblems);
    expect(problems).toEqual([]);
  });
});
