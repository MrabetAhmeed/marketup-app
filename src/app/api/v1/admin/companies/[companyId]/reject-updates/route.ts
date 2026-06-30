import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth-guards";
import { jsonOk, handleApiError } from "@/lib/api-response";
import { rejectPendingUpdates } from "@/services/admin-company.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> },
): Promise<Response> {
  try {
    const session = await requireAdmin();
    const { companyId } = await params;
    const body = await req.json().catch(() => ({}));
    const note = typeof body.note === "string" ? body.note : undefined;
    await rejectPendingUpdates(companyId, session.user.id, note);
    return jsonOk({ rejected: true });
  } catch (err) {
    return handleApiError(err);
  }
}
