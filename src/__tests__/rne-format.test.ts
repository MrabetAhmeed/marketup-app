import { describe, it, expect } from "vitest";
import { SignupCompanySchema } from "@/schemas/auth.schema";

const VALID_BASE = {
  type: "B2B" as const,
  displayName: "Test Co",
  vatNumber: null,
  accountEmail: "a@b.tn",
  sectorId: "mecanique",
  gouvernorat: "sousse",
  ville: "Sousse",
  postalCode: "4000",
  address: "Rue test",
  identityDocumentUrl: "https://cdn.test.com/doc.pdf",
};

describe("RNE legalId format", () => {
  it("accepts valid format 1234567A", () => {
    const result = SignupCompanySchema.safeParse({ ...VALID_BASE, legalId: "1234567A" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.legalId).toBe("1234567A");
  });

  it("normalizes lowercase to uppercase", () => {
    const result = SignupCompanySchema.safeParse({ ...VALID_BASE, legalId: "1234567a" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.legalId).toBe("1234567A");
  });

  it("trims whitespace", () => {
    const result = SignupCompanySchema.safeParse({ ...VALID_BASE, legalId: " 1234567A " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.legalId).toBe("1234567A");
  });

  it("rejects old format B12345", () => {
    const result = SignupCompanySchema.safeParse({ ...VALID_BASE, legalId: "B12345" });
    expect(result.success).toBe(false);
  });

  it("rejects 8 digits without letter (12345678)", () => {
    const result = SignupCompanySchema.safeParse({ ...VALID_BASE, legalId: "12345678" });
    expect(result.success).toBe(false);
  });

  it("rejects 7 digits + 2 letters (1234567AB)", () => {
    const result = SignupCompanySchema.safeParse({ ...VALID_BASE, legalId: "1234567AB" });
    expect(result.success).toBe(false);
  });

  it("rejects empty string", () => {
    const result = SignupCompanySchema.safeParse({ ...VALID_BASE, legalId: "" });
    expect(result.success).toBe(false);
  });
});
