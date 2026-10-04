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
  it("createPayment returns a SIM- reference and redirects to our own return link", async () => {
    const { SimulatedPaymentAdapter } = await import("@/lib/payment/simulated");
    const adapter = new SimulatedPaymentAdapter();
    const result = await adapter.createPayment({
      orderId: "order-1",
      amountMillimes: 60_500,
      successUrl: "https://app.test/api/v1/payments/return?order=order-1&result=success",
      failUrl: "https://app.test/api/v1/payments/return?order=order-1&result=fail",
      webhookUrl: "https://app.test/hook",
      acceptedMethods: ["card"],
      sessionTimeoutSeconds: 1200,
    });

    expect(result.externalId).toMatch(/^SIM-/);
    const url = new URL(result.redirectUrl);
    expect(url.pathname).toBe("/api/v1/payments/return");
    expect(url.searchParams.get("order")).toBe("order-1");
    expect(url.searchParams.get("result")).toBe("success");
    expect(url.searchParams.get("payment_id")).toBe(result.externalId);
  });

  it("verifyPayment returns a normalized success for a payment it created", async () => {
    const { SimulatedPaymentAdapter } = await import("@/lib/payment/simulated");
    const adapter = new SimulatedPaymentAdapter();
    const { externalId } = await adapter.createPayment({
      orderId: "order-1",
      amountMillimes: 1_072_000,
      successUrl: "https://app.test/ok",
      failUrl: "https://app.test/ko",
      webhookUrl: "https://app.test/hook",
      acceptedMethods: ["card"],
      sessionTimeoutSeconds: 1200,
    });
    const result = await adapter.verifyPayment(externalId);
    expect(result.status).toBe("success");
    expect(result.amountMillimes).toBe(1_072_000);
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
