import { timingSafeEqual } from "node:crypto";
import { jsonError, jsonOk } from "@/lib/api-response";
import { env } from "@/lib/env";
import { confirmOrder } from "@/services/order.service";
import type { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Payment operator webhook — shared by the two route forms.
//
//   current : /api/v1/webhooks/payment/<secret>/<orderId>
//   legacy  : /api/v1/webhooks/payment/<secret>?order=<orderId>
//
// Observed with Flouci (smoke test, V1.2 F3.1): the webhook is a GET with an
// empty body, and Flouci appends "?payment_id=…&success=…" to the URL we gave
// it — even when that URL already has a query string, which corrupted the
// legacy form. The order id now travels in the path.
//
// The webhook decides nothing: it only triggers the server-side verification
// (confirmOrder), which asks the operator with the payment id stored on the
// order. `payment_id` and `success` received here are logged, never used.
// Not subject to the monetization flag.
// ---------------------------------------------------------------------------

const OBJECTID_RE = /^[a-f\d]{24}$/i;
const MAX_LOGGED_BODY = 2000;

function secretMatches(received: string): boolean {
  const expected = env.PAYMENT_WEBHOOK_SECRET;
  if (!expected) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Legacy form only: Flouci turned "?order=<id>" into "?order=<id>?payment_id=…".
 * Everything from the first "?" is what the operator appended, not our id.
 */
export function orderIdFromLegacyQuery(order: string | undefined): string {
  return (order ?? "").split("?")[0] ?? "";
}

export async function handlePaymentWebhook(req: NextRequest, secret: string, orderId: string): Promise<Response> {
  if (!secretMatches(secret)) {
    return jsonError("UNAUTHORIZED", "Invalid webhook secret", 401);
  }

  const query = Object.fromEntries(new URL(req.url).searchParams);
  // Never depends on a body; read only to log what the operator sends.
  const body = req.method === "GET" ? "" : await req.text().catch(() => "");
  // The secret is in the path, which is never logged here.
  console.info(
    `[payment-webhook] received method=${req.method} content-type=${req.headers.get("content-type") ?? "-"} order=${orderId} query=${JSON.stringify(query)} body=${body.slice(0, MAX_LOGGED_BODY)}`,
  );

  if (!OBJECTID_RE.test(orderId)) {
    return jsonError("VALIDATION_FAILED", "Missing or invalid order", 400);
  }

  try {
    const { outcome } = await confirmOrder(orderId, { trigger: "webhook" });
    if (outcome === "not_found") {
      // Nothing to replay: answering an error would only make the operator retry.
      console.warn(`[payment-webhook] order ${orderId} not found — nothing to confirm`);
    } else {
      console.info(`[payment-webhook] order ${orderId} outcome=${outcome}`);
    }
    return jsonOk({ received: true });
  } catch (err) {
    // The operator could not be asked: no outcome. An error answer lets it call again.
    console.error(`[payment-webhook] verification failed for order ${orderId}:`, err instanceof Error ? err.message : err);
    return jsonError("PAYMENT_VERIFICATION_UNAVAILABLE", "Verification failed", 502);
  }
}
