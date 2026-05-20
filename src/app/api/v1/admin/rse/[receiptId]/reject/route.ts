import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth-guards";
import { jsonOk, handleApiError } from "@/lib/api-response";
import { rejectRseReceipt } from "@/services/admin-rse.service";
import { RejectRseReceiptSchema } from "@/schemas/admin-rse.schema";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ receiptId: string }> },
): Promise<Response> {
  try {
    const session = await requireAdmin();
    const { receiptId } = await params;
    const body = await req.json();
    const { rejectionReason } = RejectRseReceiptSchema.parse(body);
    await rejectRseReceipt(receiptId, session.user.id, rejectionReason);
    return jsonOk({ rejected: true });
  } catch (err) {
    return handleApiError(err);
  }
}
