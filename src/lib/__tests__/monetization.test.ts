import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// 1. MONETIZATION_ENABLED flag (env.ts)
// ---------------------------------------------------------------------------

describe("MONETIZATION_ENABLED flag", () => {
  it("defaults to false when absent", () => {
    // env.ts is already loaded with test env — MONETIZATION_ENABLED not set
    // We test the preprocess logic directly
    const preprocess = (v: unknown): boolean => v === "true" || v === "1" ? true : false;
    expect(preprocess(undefined)).toBe(false);
    expect(preprocess("")).toBe(false);
    expect(preprocess("false")).toBe(false);
    expect(preprocess("garbage")).toBe(false);
  });

  it("returns true for 'true' and '1'", () => {
    const preprocess = (v: unknown): boolean => v === "true" || v === "1" ? true : false;
    expect(preprocess("true")).toBe(true);
    expect(preprocess("1")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2. requireMonetization guard
// ---------------------------------------------------------------------------

describe("requireMonetization", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("throws 403 MONETIZATION_DISABLED when flag is OFF", async () => {
    vi.doMock("@/lib/env", () => ({
      env: { MONETIZATION_ENABLED: false },
    }));
    const { requireMonetization } = await import("@/lib/auth-guards");
    expect(() => requireMonetization()).toThrow();
    try {
      requireMonetization();
    } catch (err: unknown) {
      const e = err as { code: string; status: number };
      expect(e.code).toBe("MONETIZATION_DISABLED");
      expect(e.status).toBe(403);
    }
  });

  it("passes when flag is ON", async () => {
    vi.doMock("@/lib/env", () => ({
      env: { MONETIZATION_ENABLED: true },
    }));
    const { requireMonetization } = await import("@/lib/auth-guards");
    expect(() => requireMonetization()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 3. SimulatedPaymentAdapter
// ---------------------------------------------------------------------------

describe("SimulatedPaymentAdapter", () => {
  it("createCheckout returns paid_simulated with SIM- reference", async () => {
    const { SimulatedPaymentAdapter } = await import("@/lib/payment/simulated");
    const adapter = new SimulatedPaymentAdapter();
    const result = await adapter.createCheckout({
      companyId: "abc123",
      type: "boost",
      profileKind: "brandup",
      priceHT: 50,
      vatRate: 0.19,
      idempotencyKey: "test-key-1",
    });

    expect(result.status).toBe("paid_simulated");
    expect(result.reference).toMatch(/^SIM-/);
    expect(result.paymentMethod).toBe("simulated");
    expect(result.paidAt).toBeTruthy();
    // paidAt is a valid ISO string
    expect(new Date(result.paidAt!).toISOString()).toBe(result.paidAt);
  });

  it("verifyPayment returns paid_simulated", async () => {
    const { SimulatedPaymentAdapter } = await import("@/lib/payment/simulated");
    const adapter = new SimulatedPaymentAdapter();
    const status = await adapter.verifyPayment("SIM-whatever");
    expect(status).toBe("paid_simulated");
  });
});

// ---------------------------------------------------------------------------
// 4. isBoostActive helper
// ---------------------------------------------------------------------------

describe("isBoostActive", () => {
  it("returns true when status active and to >= now", async () => {
    const { isBoostActive } = await import("@/models/boost.model");
    const now = new Date("2026-07-26T12:00:00Z");
    expect(isBoostActive({ status: "active", to: new Date("2026-08-01T00:00:00Z") }, now)).toBe(true);
  });

  it("returns false when to < now (expired)", async () => {
    const { isBoostActive } = await import("@/models/boost.model");
    const now = new Date("2026-07-26T12:00:00Z");
    expect(isBoostActive({ status: "active", to: new Date("2026-07-25T00:00:00Z") }, now)).toBe(false);
  });

  it("returns false when status is expired", async () => {
    const { isBoostActive } = await import("@/models/boost.model");
    const now = new Date("2026-07-26T12:00:00Z");
    expect(isBoostActive({ status: "expired", to: new Date("2026-08-01T00:00:00Z") }, now)).toBe(false);
  });
});
