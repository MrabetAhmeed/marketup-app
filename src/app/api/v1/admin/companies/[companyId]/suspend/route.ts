import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth-guards";
import { jsonOk, handleApiError } from "@/lib/api-response";
import { suspendCompanyByAdmin } from "@/services/admin-company.service";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> },
): Promise<Response> {
  try {
    await requireAdmin();
    const { companyId } = await params;
    await suspendCompanyByAdmin(companyId);
    return jsonOk({ suspended: true });
  } catch (err) {
    return handleApiError(err);
  }
}
