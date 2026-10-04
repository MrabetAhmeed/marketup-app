import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as ownerTransactions } from "@/app/api/v1/me/billing/transactions/route";
import { POST as boostCheckout } from "@/app/api/v1/me/boost/checkout/route";
import { GET as boostHistory } from "@/app/api/v1/me/boost/history/route";
import { POST as cancelCampaign } from "@/app/api/v1/me/sponsoring/[id]/cancel/route";
import { POST as sponsoringCheckout } from "@/app/api/v1/me/sponsoring/checkout/route";
import { GET as ownerCampaigns } from "@/app/api/v1/me/sponsoring/route";
import { GET as paymentReturn } from "@/app/api/v1/payments/return/route";
import { GET as webhookGet, POST as webhookPost } from "@/app/api/v1/webhooks/payment/[secret]/route";

// ---------------------------------------------------------------------------
// V1.2 F3 — payment routes: webhook secret, return route, monetization flag.
// Services are faked: these tests are about what each route lets through.
// ---------------------------------------------------------------------------

const WEBHOOK_SECRET = "w".repeat(32);
const ORDER_ID = "665f1f77bcf86cd799439011";

const { envMock, confirmOrder, services } = vi.hoisted(() => ({
  envMock: {
    NEXTAUTH_URL: "https://app.test",
    MONETIZATION_ENABLED: true,
    PAYMENT_WEBHOOK_SECRET: "w".repeat(32) as string | undefined,
  },
  confirmOrder: vi.fn(),
  services: {
    checkoutBoost: vi.fn(),
    checkoutSponsoring: vi.fn(),
    getBoostHistory: vi.fn(),
    getSponsoringDashboard: vi.fn(),
    cancelSponsoring: vi.fn(),
    getOwnerTransactions: vi.fn(),
  },
}));

vi.mock("@/lib/env", () => ({ env: envMock }));
vi.mock("@/lib/auth-guards", async () => {
  const { AppError } = await import("@/lib/api-error");
  return {
    requireOwner: vi.fn().mockResolvedValue({ user: { id: "user-1", companyId: "company-1", role: "OWNER" } }),
    // Same rule as the real guard, read from the faked configuration
    requireMonetization: (): void => {
      if (!envMock.MONETIZATION_ENABLED) {
        throw new AppError("MONETIZATION_DISABLED", "Cette fonctionnalité n'est pas encore disponible.", 403);
      }
    },
  };
});
vi.mock("@/services/order.service", () => ({
  confirmOrder,
  orderResultUrl: (orderId: string) => `https://app.test/dashboard/commandes?commande=${orderId}`,
}));
vi.mock("@/services/boost.service", () => ({
  checkoutBoost: services.checkoutBoost,
  getBoostHistory: services.getBoostHistory,
}));
vi.mock("@/services/sponsoring.service", () => ({
  checkoutSponsoring: services.checkoutSponsoring,
  getSponsoringDashboard: services.getSponsoringDashboard,
  cancelSponsoring: services.cancelSponsoring,
}));
vi.mock("@/services/billing.service", () => ({ getOwnerTransactions: services.getOwnerTransactions }));

function webhookRequest(method: "GET" | "POST", query = `?order=${ORDER_ID}`, body?: string): NextRequest {
  return new NextRequest(`https://app.test/api/v1/webhooks/payment/x${query}`, {
    method,
    body,
    headers: body ? { "Content-Type": "application/json" } : undefined,
  });
}

function post(url: string, body: unknown): NextRequest {
  return new NextRequest(url, { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
}

beforeEach(() => {
  envMock.MONETIZATION_ENABLED = true;
  envMock.PAYMENT_WEBHOOK_SECRET = WEBHOOK_SECRET;
  confirmOrder.mockReset().mockResolvedValue({ outcome: "paid", changed: true });
  for (const fn of Object.values(services)) fn.mockReset();
  services.checkoutBoost.mockResolvedValue({ orderId: ORDER_ID, redirectUrl: "https://checkout.flouci.test/pay/1" });
  services.checkoutSponsoring.mockResolvedValue({ orderId: ORDER_ID, redirectUrl: "https://checkout.flouci.test/pay/2" });
  services.getBoostHistory.mockResolvedValue([]);
  services.getSponsoringDashboard.mockResolvedValue({ cards: [], history: [] });
  services.getOwnerTransactions.mockResolvedValue([]);
  services.cancelSponsoring.mockResolvedValue(undefined);
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("webhook route", () => {
  it("correct secret: confirms the order named in the URL, without throttling", async () => {
    const res = await webhookPost(webhookRequest("POST", `?order=${ORDER_ID}`, '{"payment_id":"abc"}'), { params: { secret: WEBHOOK_SECRET } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(confirmOrder).toHaveBeenCalledWith(ORDER_ID, { trigger: "webhook" });
  });

  it("accepts a GET as well: the operator's method is not documented", async () => {
    const res = await webhookGet(webhookRequest("GET"), { params: { secret: WEBHOOK_SECRET } });
    expect(res.status).toBe(200);
    expect(confirmOrder).toHaveBeenCalledWith(ORDER_ID, { trigger: "webhook" });
  });

  it.each([
    ["wrong secret", "x".repeat(32)],
    ["wrong length", "short"],
    ["empty", ""],
  ])("%s: refused, nothing is processed", async (_label, secret) => {
    const res = await webhookPost(webhookRequest("POST"), { params: { secret } });
    expect(res.status).toBe(401);
    expect(confirmOrder).not.toHaveBeenCalled();
  });

  it("no secret configured: every call is refused, even with the placeholder", async () => {
    envMock.PAYMENT_WEBHOOK_SECRET = undefined;
    for (const secret of ["unset", "undefined", ""]) {
      const res = await webhookPost(webhookRequest("POST"), { params: { secret } });
      expect(res.status).toBe(401);
    }
    expect(confirmOrder).not.toHaveBeenCalled();
  });

  it("correct secret but no valid order: refused, nothing is processed", async () => {
    for (const query of ["", "?order=not-an-id"]) {
      const res = await webhookPost(webhookRequest("POST", query), { params: { secret: WEBHOOK_SECRET } });
      expect(res.status).toBe(400);
    }
    expect(confirmOrder).not.toHaveBeenCalled();
  });

  it("operator unreachable: answers an error, so nothing is taken for confirmed", async () => {
    confirmOrder.mockRejectedValue(new Error("Flouci verify_payment: network error"));
    const res = await webhookPost(webhookRequest("POST"), { params: { secret: WEBHOOK_SECRET } });
    expect(res.status).toBe(502);
  });

  it("logs what was received, never the secret", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    await webhookPost(webhookRequest("POST", `?order=${ORDER_ID}&extra=1`, '{"payment_id":"abc"}'), { params: { secret: WEBHOOK_SECRET } });
    const logged = JSON.stringify(info.mock.calls);
    expect(logged).toContain("payment_id");
    expect(logged).toContain("extra");
    expect(logged).not.toContain(WEBHOOK_SECRET);
  });
});

describe("return route", () => {
  it("confirms the order and redirects to its result page — no session needed", async () => {
    const res = await paymentReturn(new NextRequest(`https://app.test/api/v1/payments/return?order=${ORDER_ID}&result=success&payment_id=abc`));
    expect(confirmOrder).toHaveBeenCalledWith(ORDER_ID, { trigger: "return" });
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(`https://app.test/dashboard/commandes?commande=${ORDER_ID}`);
  });

  it("confirms on the fail link too: the link proves nothing", async () => {
    await paymentReturn(new NextRequest(`https://app.test/api/v1/payments/return?order=${ORDER_ID}&result=fail`));
    expect(confirmOrder).toHaveBeenCalledWith(ORDER_ID, { trigger: "return" });
  });

  it("operator unreachable: still redirects, the page shows the order as it is", async () => {
    confirmOrder.mockRejectedValue(new Error("Flouci verify_payment: network error"));
    const res = await paymentReturn(new NextRequest(`https://app.test/api/v1/payments/return?order=${ORDER_ID}&result=success`));
    expect(res.headers.get("location")).toBe(`https://app.test/dashboard/commandes?commande=${ORDER_ID}`);
  });

  it("no valid order: redirects to the orders page without confirming anything", async () => {
    const res = await paymentReturn(new NextRequest("https://app.test/api/v1/payments/return?order=nope"));
    expect(confirmOrder).not.toHaveBeenCalled();
    expect(res.headers.get("location")).toBe("https://app.test/dashboard/commandes");
  });

  it("logs the query actually received", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    await paymentReturn(new NextRequest(`https://app.test/api/v1/payments/return?order=${ORDER_ID}&result=success&payment_id=abc`));
    expect(JSON.stringify(info.mock.calls)).toContain("payment_id");
  });
});

describe("checkout routes", () => {
  it("return the redirect URL of the order", async () => {
    const boost = await boostCheckout(post("https://app.test/api/v1/me/boost/checkout", { profileKind: "brandup", idempotencyKey: "k" }));
    expect(boost.status).toBe(201);
    expect(await boost.json()).toEqual({ orderId: ORDER_ID, redirectUrl: "https://checkout.flouci.test/pay/1" });

    const sponsoring = await sponsoringCheckout(post("https://app.test/api/v1/me/sponsoring/checkout", { sponsoringId: ORDER_ID, idempotencyKey: "k" }));
    expect(await sponsoring.json()).toEqual({ orderId: ORDER_ID, redirectUrl: "https://checkout.flouci.test/pay/2" });
  });
});

describe("monetization flag off", () => {
  beforeEach(() => {
    envMock.MONETIZATION_ENABLED = false;
  });

  it("purchase is refused", async () => {
    const boost = await boostCheckout(post("https://app.test/api/v1/me/boost/checkout", { profileKind: "brandup", idempotencyKey: "k" }));
    expect(boost.status).toBe(403);
    expect((await boost.json()).error.code).toBe("MONETIZATION_DISABLED");
    const sponsoring = await sponsoringCheckout(post("https://app.test/api/v1/me/sponsoring/checkout", { sponsoringId: ORDER_ID, idempotencyKey: "k" }));
    expect(sponsoring.status).toBe(403);
    expect(services.checkoutBoost).not.toHaveBeenCalled();
    expect(services.checkoutSponsoring).not.toHaveBeenCalled();
  });

  it("return and webhook still confirm: a payment cashed just before must not be lost", async () => {
    const back = await paymentReturn(new NextRequest(`https://app.test/api/v1/payments/return?order=${ORDER_ID}&result=success`));
    expect(back.status).toBe(307);
    const hook = await webhookPost(webhookRequest("POST"), { params: { secret: WEBHOOK_SECRET } });
    expect(hook.status).toBe(200);
    expect(confirmOrder).toHaveBeenCalledTimes(2);
  });

  it("consultation still works: orders, boost history, campaigns", async () => {
    expect((await ownerTransactions()).status).toBe(200);
    expect((await boostHistory()).status).toBe(200);
    expect((await ownerCampaigns()).status).toBe(200);
    expect(services.getOwnerTransactions).toHaveBeenCalledWith("company-1");
    expect(services.getBoostHistory).toHaveBeenCalledWith("company-1");
    expect(services.getSponsoringDashboard).toHaveBeenCalledWith("company-1");
  });

  it("campaign cancellation is not subject to the flag", async () => {
    const res = await cancelCampaign(post(`https://app.test/api/v1/me/sponsoring/${ORDER_ID}/cancel`, {}), {
      params: Promise.resolve({ id: ORDER_ID }),
    });
    expect(res.status).toBe(200);
    expect(services.cancelSponsoring).toHaveBeenCalledWith("company-1", ORDER_ID);
  });
});
