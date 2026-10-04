import { handlePaymentWebhook, orderIdFromLegacyQuery } from "@/services/payment-webhook.service";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

interface LegacyWebhookContext {
  params: { secret: string };
}

/**
 * Legacy webhook form: /api/v1/webhooks/payment/<secret>?order=<orderId>
 *
 * New orders use /api/v1/webhooks/payment/<secret>/<orderId>. This route stays
 * for the orders created before F3.1, whose webhook URL is already registered
 * with the operator: it recovers the order id from the corrupted query value.
 */
function legacyOrderId(req: NextRequest): string {
  return orderIdFromLegacyQuery(new URL(req.url).searchParams.get("order") ?? undefined);
}

export async function GET(req: NextRequest, { params }: LegacyWebhookContext): Promise<Response> {
  return handlePaymentWebhook(req, params.secret, legacyOrderId(req));
}

export async function POST(req: NextRequest, { params }: LegacyWebhookContext): Promise<Response> {
  return handlePaymentWebhook(req, params.secret, legacyOrderId(req));
}
