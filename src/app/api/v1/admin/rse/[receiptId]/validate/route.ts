import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth-guards";
import { jsonOk, handleApiError } from "@/lib/api-response";
import { validateRseReceipt } from "@/services/admin-rse.service";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ receiptId: string }> },
): Promise<Response> {
  try {
    const session = await requireAdmin();
    const { receiptId } = await params;
    await validateRseReceipt(receiptId, session.user.id);
    return jsonOk({ validated: true });
  } catch (err) {
    return handleApiError(err);
  }
}
