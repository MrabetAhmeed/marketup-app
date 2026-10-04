import { timingSafeEqual } from "node:crypto";
import { jsonError, jsonOk } from "@/lib/api-response";
import { env } from "@/lib/env";
import { confirmOrder } from "@/services/order.service";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

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
 * Payment operator webhook. The secret is part of the URL we gave the operator.
 *
 * The webhook decides nothing: it only triggers the server-side verification
 * (confirmOrder), so a leaked secret can at worst cause a verification.
 * Not subject to the monetization flag.
 */
async function handle(req: NextRequest, secret: string): Promise<Response> {
  if (!secretMatches(secret)) {
    return jsonError("UNAUTHORIZED", "Invalid webhook secret", 401);
  }

  const query = Object.fromEntries(new URL(req.url).searchParams);
  const body = req.method === "GET" ? "" : await req.text().catch(() => "");
  // Establishes at the smoke test what the operator actually sends. The secret
  // is in the path, which is never logged here.
  console.info(
    `[payment-webhook] received method=${req.method} content-type=${req.headers.get("content-type") ?? "-"} query=${JSON.stringify(query)} body=${body.slice(0, MAX_LOGGED_BODY)}`,
  );

  const orderId = query.order ?? "";
  if (!OBJECTID_RE.test(orderId)) {
    return jsonError("VALIDATION_FAILED", "Missing or invalid order", 400);
  }

  try {
    const { outcome } = await confirmOrder(orderId, { trigger: "webhook" });
    console.info(`[payment-webhook] order ${orderId} outcome=${outcome}`);
    return jsonOk({ received: true });
  } catch (err) {
    console.error(`[payment-webhook] verification failed for order ${orderId}:`, err instanceof Error ? err.message : err);
    return jsonError("PAYMENT_VERIFICATION_UNAVAILABLE", "Verification failed", 502);
  }
}

export async function POST(req: NextRequest, { params }: { params: { secret: string } }): Promise<Response> {
  return handle(req, params.secret);
}

// The operator's documentation does not state the method it uses: accept both.
export async function GET(req: NextRequest, { params }: { params: { secret: string } }): Promise<Response> {
  return handle(req, params.secret);
}
