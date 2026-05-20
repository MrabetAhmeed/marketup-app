import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth-guards";
import { jsonOk, handleApiError } from "@/lib/api-response";
import { reactivateCompanyByAdmin } from "@/services/admin-company.service";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> },
): Promise<Response> {
  try {
    await requireAdmin();
    const { companyId } = await params;
    await reactivateCompanyByAdmin(companyId);
    return jsonOk({ reactivated: true });
  } catch (err) {
    return handleApiError(err);
  }
}
