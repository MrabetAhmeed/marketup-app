import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth-guards";
import { jsonOk, handleApiError } from "@/lib/api-response";
import { restoreCompanyByAdmin } from "@/services/admin-company.service";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> },
): Promise<Response> {
  try {
    const session = await requireAdmin();
    const { companyId } = await params;
    await restoreCompanyByAdmin(companyId, session.user.id);
    return jsonOk({ restored: true });
  } catch (err) {
    return handleApiError(err);
  }
}
