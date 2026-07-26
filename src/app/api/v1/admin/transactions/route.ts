import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth-guards";
import { jsonOk, handleApiError } from "@/lib/api-response";
import { getAdminTransactions } from "@/services/billing.service";

export async function GET(req: NextRequest): Promise<Response> {
  try {
    await requireAdmin();

    const url = new URL(req.url);
    const status = url.searchParams.get("status") || undefined;
    const type = url.searchParams.get("type") || undefined;

    const transactions = await getAdminTransactions({ status, type });
    return jsonOk({ items: transactions });
  } catch (err) {
    return handleApiError(err);
  }
}
