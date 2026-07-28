import { requireOwner, requireMonetization } from "@/lib/auth-guards";
import { jsonOk, handleApiError } from "@/lib/api-response";
import { getSponsoringDashboard } from "@/services/sponsoring.service";

export async function GET(): Promise<Response> {
  try {
    requireMonetization();
    const session = await requireOwner();
    const data = await getSponsoringDashboard(session.user.companyId!);
    return jsonOk(data);
  } catch (err) {
    return handleApiError(err);
  }
}
