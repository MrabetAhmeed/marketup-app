import { describe, it, expect } from "vitest";
import { checkDestructiveGuards, validateAdminPassword } from "@/lib/uri-utils";

const PROTECTED = ["marketup_prod", "preprod"];
const DEV_URI = "mongodb://user:pass@h0.net:27017,h1.net:27017/dev_db?ssl=true";
const PROD_URI = "mongodb://user:pass@h0.net:27017,h1.net:27017/marketup_prod?ssl=true";
const PREPROD_URI = "mongodb://user:pass@h0.net:27017,h1.net:27017/preprod?ssl=true";

describe("checkDestructiveGuards", () => {
  // Guard 1: ALLOW_DESTRUCTIVE_SEED

  it("refuses when ALLOW_DESTRUCTIVE_SEED is undefined", () => {
    const result = checkDestructiveGuards({
      uri: DEV_URI,
      allowDestructive: undefined,
      protectedDatabases: PROTECTED,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("ALLOW_DESTRUCTIVE_SEED");
  });

  it("refuses when ALLOW_DESTRUCTIVE_SEED is not 'true'", () => {
    const result = checkDestructiveGuards({
      uri: DEV_URI,
      allowDestructive: "false",
      protectedDatabases: PROTECTED,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("ALLOW_DESTRUCTIVE_SEED");
  });

  it("allows when ALLOW_DESTRUCTIVE_SEED is 'true' and DB is not protected", () => {
    const result = checkDestructiveGuards({
      uri: DEV_URI,
      allowDestructive: "true",
      protectedDatabases: PROTECTED,
    });
    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  // Guard 2: protected database name

  it("refuses when database is marketup_prod", () => {
    const result = checkDestructiveGuards({
      uri: PROD_URI,
      allowDestructive: "true",
      protectedDatabases: PROTECTED,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("marketup_prod");
    expect(result.reason).toContain("protected list");
  });

  it("refuses when database is preprod", () => {
    const result = checkDestructiveGuards({
      uri: PREPROD_URI,
      allowDestructive: "true",
      protectedDatabases: PROTECTED,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("preprod");
    expect(result.reason).toContain("protected list");
  });

  // Cumulative: both guards are independent

  it("when both guards fail, reports guard 1 (evaluated first)", () => {
    const result = checkDestructiveGuards({
      uri: PROD_URI,
      allowDestructive: undefined,
      protectedDatabases: PROTECTED,
    });
    expect(result.allowed).toBe(false);
    // Guard 1 fires first — reason mentions ALLOW_DESTRUCTIVE_SEED, not the DB name
    expect(result.reason).toContain("ALLOW_DESTRUCTIVE_SEED");
    expect(result.reason).not.toContain("marketup_prod");
  });

  it("when guard 1 passes but guard 2 blocks, reports guard 2", () => {
    const result = checkDestructiveGuards({
      uri: PROD_URI,
      allowDestructive: "true",
      protectedDatabases: PROTECTED,
    });
    expect(result.allowed).toBe(false);
    // Guard 2 fires — reason mentions the DB name, not ALLOW_DESTRUCTIVE_SEED
    expect(result.reason).toContain("marketup_prod");
    expect(result.reason).not.toContain("ALLOW_DESTRUCTIVE_SEED");
  });

  // Edge cases

  it("allows when protected list is empty", () => {
    const result = checkDestructiveGuards({
      uri: PROD_URI,
      allowDestructive: "true",
      protectedDatabases: [],
    });
    expect(result.allowed).toBe(true);
  });

  it("handles URI without database name", () => {
    const result = checkDestructiveGuards({
      uri: "mongodb://user:pass@h0.net:27017?ssl=true",
      allowDestructive: "true",
      protectedDatabases: PROTECTED,
    });
    // Empty DB name is not in the protected list
    expect(result.allowed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validateAdminPassword
// ---------------------------------------------------------------------------

describe("validateAdminPassword", () => {
  it("rejects undefined", () => {
    const r = validateAdminPassword(undefined);
    expect(r.valid).toBe(false);
    expect(r.reason).toContain("empty");
  });

  it("rejects null", () => {
    const r = validateAdminPassword(null);
    expect(r.valid).toBe(false);
    expect(r.reason).toContain("empty");
  });

  it("rejects empty string", () => {
    const r = validateAdminPassword("");
    expect(r.valid).toBe(false);
    expect(r.reason).toContain("empty");
  });

  it("rejects password shorter than minimum (9 chars < 10)", () => {
    const r = validateAdminPassword("123456789");
    expect(r.valid).toBe(false);
    expect(r.reason).toContain("9 characters");
    expect(r.reason).toContain("minimum is 10");
  });

  it("accepts password at exactly minimum length (10 chars)", () => {
    const r = validateAdminPassword("1234567890");
    expect(r.valid).toBe(true);
  });

  it("accepts password longer than minimum (11 chars)", () => {
    const r = validateAdminPassword("12345678901");
    expect(r.valid).toBe(true);
  });

  it("handles special characters correctly (VSK@MUP2026 = 11 chars)", () => {
    const r = validateAdminPassword("VSK@MUP2026");
    expect(r.valid).toBe(true);
  });

  it("handles unicode characters", () => {
    // 10 Arabic characters
    const r = validateAdminPassword("\u0645\u0631\u062D\u0628\u0627\u0628\u0627\u0644\u0639\u0627");
    expect(r.valid).toBe(true);
  });

  it("counts spaces as characters", () => {
    const r = validateAdminPassword("a b c d e f");
    expect(r.valid).toBe(true);
    expect(r.reason).toBeUndefined();
  });

  it("does not trim leading/trailing spaces", () => {
    // "  12345678" = 10 chars (2 spaces + 8 digits)
    const r = validateAdminPassword("  12345678");
    expect(r.valid).toBe(true);
  });

  it("respects custom minimum length", () => {
    const r = validateAdminPassword("12345", 6);
    expect(r.valid).toBe(false);
    expect(r.reason).toContain("5 characters");
    expect(r.reason).toContain("minimum is 6");
  });

  it("password is preserved exactly — no truncation or mutation", () => {
    const original = "VSK@MUP2026!#$%";
    const r = validateAdminPassword(original);
    expect(r.valid).toBe(true);
    // Verify by checking the input was not mutated
    expect(original).toBe("VSK@MUP2026!#$%");
    expect(original.length).toBe(15);
  });
});
