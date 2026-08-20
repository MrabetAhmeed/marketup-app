import { describe, it, expect } from "vitest";
import { normalizeTunisianPhone, tunisianPhoneSchema } from "@/lib/phone";
import { SignupUserSchema } from "@/schemas/auth.schema";
import { AccountLiveUpdateSchema } from "@/schemas/account.schema";
import { CompanyResubmitSchema } from "@/schemas/account-resubmit.schema";

describe("normalizeTunisianPhone", () => {
  it("normalizes 8 digits to +216XXXXXXXX", () => {
    expect(normalizeTunisianPhone("22335544")).toBe("+21622335544");
  });

  it("normalizes 216+8 without plus to +216XXXXXXXX", () => {
    expect(normalizeTunisianPhone("21622335544")).toBe("+21622335544");
  });

  it("accepts +216XXXXXXXX unchanged", () => {
    expect(normalizeTunisianPhone("+21622335544")).toBe("+21622335544");
  });

  it("strips spaces before normalizing", () => {
    expect(normalizeTunisianPhone("+216 22 33 55 44")).toBe("+21622335544");
  });

  it("strips hyphens before normalizing", () => {
    expect(normalizeTunisianPhone("22-33-55-44")).toBe("+21622335544");
  });

  it("strips dots and parentheses before normalizing", () => {
    expect(normalizeTunisianPhone("(22) 33.55.44")).toBe("+21622335544");
  });

  it("rejects non-Tunisian prefix +33", () => {
    expect(() => normalizeTunisianPhone("+33612345678")).toThrow("Seuls les numéros tunisiens");
  });

  it("rejects too short +216 number (only 7 digits)", () => {
    expect(() => normalizeTunisianPhone("+21612345")).toThrow();
  });

  it("rejects empty string", () => {
    expect(() => normalizeTunisianPhone("")).toThrow();
  });
});

describe("tunisianPhoneSchema (Zod)", () => {
  it("accepts and normalizes 8 digits", () => {
    const result = tunisianPhoneSchema.parse("22335544");
    expect(result).toBe("+21622335544");
  });

  it("rejects +33 number", () => {
    const result = tunisianPhoneSchema.safeParse("+33612345678");
    expect(result.success).toBe(false);
  });
});

describe("schemas apply tunisianPhoneSchema", () => {
  it("SignupUserSchema normalizes phone", () => {
    const result = SignupUserSchema.safeParse({
      userId: "u1",
      firstName: "A",
      lastName: "B",
      phone: "22335544",
      whatsapp: "22335544",
      languages: ["fr"],
      password: "Test1234!",
      passwordConfirm: "Test1234!",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBe("+21622335544");
      expect(result.data.whatsapp).toBe("+21622335544");
    }
  });

  it("AccountLiveUpdateSchema normalizes phone", () => {
    const result = AccountLiveUpdateSchema.safeParse({ phone: "98 765 432" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBe("+21698765432");
    }
  });

  it("CompanyResubmitSchema normalizes whatsapp", () => {
    const result = CompanyResubmitSchema.safeParse({
      displayName: "Test",
      sectorId: "x",
      gouvernorat: "sousse",
      ville: "Sousse",
      whatsapp: "21655443322",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.whatsapp).toBe("+21655443322");
    }
  });

  it("All 3 schemas reject +33 numbers", () => {
    const r1 = SignupUserSchema.safeParse({
      userId: "u1", firstName: "A", lastName: "B",
      phone: "+33612345678", whatsapp: "22335544",
      languages: ["fr"], password: "Test1234!", passwordConfirm: "Test1234!",
    });
    expect(r1.success).toBe(false);

    const r2 = AccountLiveUpdateSchema.safeParse({ phone: "+33612345678" });
    expect(r2.success).toBe(false);

    const r3 = CompanyResubmitSchema.safeParse({
      displayName: "Test", sectorId: "x", gouvernorat: "sousse", ville: "Sousse",
      phone: "+33612345678",
    });
    expect(r3.success).toBe(false);
  });
});
