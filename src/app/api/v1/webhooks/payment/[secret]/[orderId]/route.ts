import { handlePaymentWebhook } from "@/services/payment-webhook.service";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

interface WebhookContext {
  params: { secret: string; orderId: string };
}

/**
 * Payment operator webhook: /api/v1/webhooks/payment/<secret>/<orderId>
 * The order id is in the path, so whatever the operator appends as a query
 * string cannot corrupt it. See payment-webhook.service.ts.
 */
export async function GET(req: NextRequest, { params }: WebhookContext): Promise<Response> {
  return handlePaymentWebhook(req, params.secret, params.orderId);
}

export async function POST(req: NextRequest, { params }: WebhookContext): Promise<Response> {
  return handlePaymentWebhook(req, params.secret, params.orderId);
}
