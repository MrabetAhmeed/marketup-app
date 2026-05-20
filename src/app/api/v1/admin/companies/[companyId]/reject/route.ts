import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth-guards";
import { jsonOk, handleApiError } from "@/lib/api-response";
import { rejectCompanyByAdmin } from "@/services/admin-company.service";
import { RejectCompanySchema } from "@/schemas/admin-company.schema";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> },
): Promise<Response> {
  try {
    const session = await requireAdmin();
    const { companyId } = await params;
    const body = await req.json();
    const { rejectionReason } = RejectCompanySchema.parse(body);
    await rejectCompanyByAdmin(companyId, session.user.id, rejectionReason);
    return jsonOk({ rejected: true });
  } catch (err) {
    return handleApiError(err);
  }
}
