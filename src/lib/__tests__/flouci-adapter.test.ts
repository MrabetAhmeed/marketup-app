import { describe, it, expect, vi } from "vitest";
import { FlouciPaymentAdapter } from "@/lib/payment/flouci";

// ---------------------------------------------------------------------------
// V1.2 F3 — Flouci adapter. The HTTP client is a fake: no network call is made.
// Contract: https://docs.flouci.com/ (generate_payment, verify_payment).
// ---------------------------------------------------------------------------

const PUBLIC_KEY = "pk-value-that-must-not-leak";
const PRIVATE_KEY = "sk-value-that-must-not-leak";

const PARAMS = {
  orderId: "665f1f77bcf86cd799439011",
  amountMillimes: 1_072_000,
  successUrl: "https://app.test/api/v1/payments/return?order=665f1f77bcf86cd799439011&result=success",
  failUrl: "https://app.test/api/v1/payments/return?order=665f1f77bcf86cd799439011&result=fail",
  webhookUrl: "https://app.test/api/v1/webhooks/payment/secret/665f1f77bcf86cd799439011",
  acceptedMethods: ["card" as const],
  sessionTimeoutSeconds: 1200,
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function adapterWith(fetchImpl: typeof fetch, environment: "test" | "production" = "test"): FlouciPaymentAdapter {
  return new FlouciPaymentAdapter({
    publicKey: PUBLIC_KEY,
    privateKey: PRIVATE_KEY,
    baseUrl: "https://developers.flouci.com/",
    environment,
    fetchImpl,
  });
}

const GENERATED = {
  result: { success: true, payment_id: "AgCKuBm0S5uLPghBo571MQ", link: "https://checkout.flouci.com/shop/AgCKuBm0S5uLPghBo571MQ", developer_tracking_id: PARAMS.orderId },
  name: "developers",
  code: 0,
  version: "v2",
};

function verified(status: string, extra: Record<string, unknown> = {}): unknown {
  return {
    success: true,
    result: { type: "card", amount: 1_072_000, status, details: {}, developer_tracking_id: PARAMS.orderId, settlement_status: "PROCESSING", ...extra },
    status_code: 200,
  };
}

describe("FlouciPaymentAdapter.createPayment", () => {
  it("posts the documented request and returns the payment id and link", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json(GENERATED));
    const result = await adapterWith(fetchImpl).createPayment(PARAMS);

    expect(result).toEqual({ externalId: "AgCKuBm0S5uLPghBo571MQ", redirectUrl: GENERATED.result.link });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe("https://developers.flouci.com/api/v2/generate_payment");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe(`Bearer ${PUBLIC_KEY}:${PRIVATE_KEY}`);
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual({
      amount: "1072000",
      success_link: PARAMS.successUrl,
      fail_link: PARAMS.failUrl,
      webhook: PARAMS.webhookUrl,
      developer_tracking_id: PARAMS.orderId,
      session_timeout_secs: 1200,
      accept_card: true,
    });
  });

  it("configuration only drives accept_card", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json(GENERATED));
    await adapterWith(fetchImpl).createPayment({ ...PARAMS, acceptedMethods: ["wallet"] });
    expect(JSON.parse(fetchImpl.mock.calls[0]![1].body).accept_card).toBe(false);
  });

  it.each([0, -5, 10.5])("rejects a non-positive-integer amount (%s) before any call", async (amountMillimes) => {
    const fetchImpl = vi.fn();
    await expect(adapterWith(fetchImpl).createPayment({ ...PARAMS, amountMillimes })).rejects.toThrow();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("an HTTP error is an error, and never leaks a key", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json({ result: { status: 400, message: "Bad Request" } }, 400));
    const error = await adapterWith(fetchImpl).createPayment(PARAMS).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Error);
    expect(String(error)).toContain("Flouci generate_payment: HTTP 400");
    expect(String(error)).not.toContain(PUBLIC_KEY);
    expect(String(error)).not.toContain(PRIVATE_KEY);
  });

  it("a network failure is an error, and never leaks a key", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error(`connect ECONNREFUSED with header Bearer ${PUBLIC_KEY}:${PRIVATE_KEY}`));
    const error = await adapterWith(fetchImpl).createPayment(PARAMS).catch((e: unknown) => e);
    expect(String(error)).toContain("Flouci generate_payment: network error");
    expect(String(error)).not.toContain(PRIVATE_KEY);
  });

  it.each([
    ["success false", { result: { success: false } }],
    ["no payment id", { result: { success: true, link: "https://checkout.flouci.com/x" } }],
    ["no link", { result: { success: true, payment_id: "abc" } }],
    ["no result", { code: 0 }],
  ])("an unexpected response is an error (%s)", async (_label, body) => {
    const fetchImpl = vi.fn().mockResolvedValue(json(body));
    await expect(adapterWith(fetchImpl).createPayment(PARAMS)).rejects.toThrow("unexpected response");
  });

  it("a non-JSON response is an error", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("<html>gateway</html>", { status: 200 }));
    await expect(adapterWith(fetchImpl).createPayment(PARAMS)).rejects.toThrow("invalid JSON response");
  });
});

describe("FlouciPaymentAdapter.verifyPayment", () => {
  it("gets the documented URL and normalizes a successful card payment", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json(verified("SUCCESS")));
    const result = await adapterWith(fetchImpl).verifyPayment("AgCKuBm0S5uLPghBo571MQ");

    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe("https://developers.flouci.com/api/v2/verify_payment/AgCKuBm0S5uLPghBo571MQ");
    expect(init.method).toBe("GET");
    expect(init.headers.Authorization).toBe(`Bearer ${PUBLIC_KEY}:${PRIVATE_KEY}`);
    expect(init.body).toBeUndefined();
    expect(result).toMatchObject({ status: "success", amountMillimes: 1_072_000, method: "card" });
    expect(result.raw).toEqual(verified("SUCCESS"));
  });

  it.each([
    ["SUCCESS", "success"],
    ["PENDING", "pending"],
    ["EXPIRED", "expired"],
    ["FAILURE", "failure"],
    ["PREAUTH_SUCCESS", "preauth_success"],
    ["SYSTEM_FAILURE", "system_failure"],
  ])("maps %s to %s", async (flouciStatus, normalized) => {
    const fetchImpl = vi.fn().mockResolvedValue(json(verified(flouciStatus)));
    expect((await adapterWith(fetchImpl).verifyPayment("id")).status).toBe(normalized);
  });

  it("never invents a status: an unknown one is an error", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json(verified("REFUNDED")));
    await expect(adapterWith(fetchImpl).verifyPayment("id")).rejects.toThrow("unknown payment status");
  });

  it("requires success: true before reading the payload", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json({ success: false, result: { status: "SUCCESS", amount: 1 } }));
    await expect(adapterWith(fetchImpl).verifyPayment("id")).rejects.toThrow("unexpected response");
  });

  it("payment not found (test environment forgets after 20 minutes) is an error", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json({ result: { status: 404, message: "Payment not found" } }, 404));
    await expect(adapterWith(fetchImpl).verifyPayment("id")).rejects.toThrow("Flouci verify_payment: HTTP 404");
  });

  it.each([
    ["card", "card"],
    ["wallet", "wallet"],
    ["mpayment", null],
    ["NA", null],
    ["something-new", null],
    [undefined, null],
    [42, null],
  ])("payment type %s: still a success, method reported as %s", async (type, expected) => {
    const fetchImpl = vi.fn().mockResolvedValue(json(verified("SUCCESS", { type })));
    const result = await adapterWith(fetchImpl).verifyPayment("id");
    expect(result.status).toBe("success");
    expect(result.amountMillimes).toBe(1_072_000);
    expect(result.method).toBe(expected);
  });

  it("a missing or non-integer amount is reported as unknown, not guessed", async () => {
    const missing = vi.fn().mockResolvedValue(json(verified("SUCCESS", { amount: undefined })));
    expect((await adapterWith(missing).verifyPayment("id")).amountMillimes).toBeNull();
    const text = vi.fn().mockResolvedValue(json(verified("SUCCESS", { amount: "1072000" })));
    expect((await adapterWith(text).verifyPayment("id")).amountMillimes).toBeNull();
  });

  it("escapes the payment id in the URL", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json(verified("PENDING")));
    await adapterWith(fetchImpl).verifyPayment("a/b?c");
    expect(fetchImpl.mock.calls[0]![0]).toBe("https://developers.flouci.com/api/v2/verify_payment/a%2Fb%3Fc");
  });
});

describe("FlouciPaymentAdapter.describe", () => {
  it("reports the declared environment", () => {
    expect(adapterWith(vi.fn(), "production").describe()).toEqual({ name: "flouci", environment: "production" });
    expect(adapterWith(vi.fn(), "test").describe()).toEqual({ name: "flouci", environment: "test" });
  });
});
