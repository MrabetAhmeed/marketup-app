import { NextRequest } from "next/server";
import { requireOwner, requireMonetization } from "@/lib/auth-guards";
import { jsonOk, handleApiError } from "@/lib/api-response";
import { cancelSponsoring } from "@/services/sponsoring.service";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    requireMonetization();
    const session = await requireOwner();
    const { id } = await params;
    await cancelSponsoring(session.user.companyId!, id);
    return jsonOk({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
