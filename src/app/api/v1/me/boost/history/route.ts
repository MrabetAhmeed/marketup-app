import { requireOwner, requireMonetization } from "@/lib/auth-guards";
import { jsonOk, handleApiError } from "@/lib/api-response";
import { getBoostHistory } from "@/services/boost.service";

export async function GET(): Promise<Response> {
  try {
    requireMonetization();
    const session = await requireOwner();
    const items = await getBoostHistory(session.user.companyId!);
    return jsonOk({ items });
  } catch (err) {
    return handleApiError(err);
  }
}
