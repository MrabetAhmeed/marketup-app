import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth-guards";
import { jsonOk, handleApiError } from "@/lib/api-response";
import { rejectProfileByAdmin } from "@/services/admin-profile.service";
import { RejectProfileSchema } from "@/schemas/admin-profile.schema";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ profileId: string }> },
): Promise<Response> {
  try {
    const session = await requireAdmin();
    const { profileId } = await params;
    const body = await req.json();
    const { rejectionReason } = RejectProfileSchema.parse(body);
    await rejectProfileByAdmin(profileId, session.user.id, rejectionReason);
    return jsonOk({ rejected: true });
  } catch (err) {
    return handleApiError(err);
  }
}
