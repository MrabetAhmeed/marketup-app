import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/env", () => ({
  env: {},
}));

import { buildAndRegex } from "@/services/public-search.service";

describe("escapeRegex — SEC-1 ReDoS fix", () => {
  it("metacharacters are treated as literals (no crash, no wildcard match)", () => {
    // Before fix: new RegExp(".*") would match everything
    // After fix: escapeRegex(".*") → "\\.\\*" → matches literal ".*" only
    const regexes = buildAndRegex(".*");
    const matchesAll = regexes.every((r) => r.test("technofab industries"));
    expect(matchesAll).toBe(false);

    // Literal ".*" should only match a string containing literal ".*"
    const matchesLiteral = regexes.every((r) => r.test("version 1.* beta"));
    expect(matchesLiteral).toBe(true);
  });

  it("invalid regex chars do not crash (parentheses, brackets)", () => {
    // Before fix: new RegExp("(") throws SyntaxError
    // After fix: escapeRegex("(") → "\\(" → valid regex, no crash
    expect(() => buildAndRegex("(")).not.toThrow();
    expect(() => buildAndRegex("(a+)+b")).not.toThrow();
    expect(() => buildAndRegex("[test")).not.toThrow();

    const regexes = buildAndRegex("(a+)+b");
    // Should match the literal string "(a+)+b"
    const matchesLiteral = regexes.every((r) => r.test("pattern (a+)+b here"));
    expect(matchesLiteral).toBe(true);
    // Should NOT match normal text
    const matchesNormal = regexes.every((r) => r.test("aaaaaab"));
    expect(matchesNormal).toBe(false);
  });
});
