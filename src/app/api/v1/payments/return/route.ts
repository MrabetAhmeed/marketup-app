import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { confirmOrder, orderResultUrl } from "@/services/order.service";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const OBJECTID_RE = /^[a-f\d]{24}$/i;

/**
 * Where the payment operator sends the buyer back (success and fail links).
 *
 * The redirect proves nothing: it only triggers the server-side verification
 * (confirmOrder). It confirms even without a session or from another device —
 * ownership only decides what the dashboard page displays afterwards.
 * Not subject to the monetization flag: a payment cashed just before the flag
 * goes off must still be confirmed.
 */
export async function GET(req: NextRequest): Promise<Response> {
  const params = Object.fromEntries(new URL(req.url).searchParams);
  // Establishes at the smoke test what the operator actually appends to our links.
  // Query parameters only: no key and no secret ever travels in them.
  console.info("[payment-return] received query:", JSON.stringify(params));

  const orderId = params.order ?? "";
  const dashboard = `${env.NEXTAUTH_URL.replace(/\/+$/, "")}/dashboard/commandes`;
  if (!OBJECTID_RE.test(orderId)) {
    return NextResponse.redirect(dashboard);
  }

  try {
    const { outcome } = await confirmOrder(orderId, { trigger: "return" });
    console.info(`[payment-return] order ${orderId} outcome=${outcome}`);
  } catch (err) {
    // Operator unreachable: the order stays as it is, the page will show it as pending.
    console.error(`[payment-return] verification failed for order ${orderId}:`, err instanceof Error ? err.message : err);
  }

  return NextResponse.redirect(orderResultUrl(orderId));
}
