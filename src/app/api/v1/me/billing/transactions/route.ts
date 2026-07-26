import { requireOwner, requireMonetization } from "@/lib/auth-guards";
import { jsonOk, handleApiError } from "@/lib/api-response";
import { getOwnerTransactions } from "@/services/billing.service";

export async function GET(): Promise<Response> {
  try {
    requireMonetization();
    const session = await requireOwner();
    // requireOwner() guarantees companyId is non-null
    const transactions = await getOwnerTransactions(session.user.companyId!);
    return jsonOk({ items: transactions });
  } catch (err) {
    return handleApiError(err);
  }
}
