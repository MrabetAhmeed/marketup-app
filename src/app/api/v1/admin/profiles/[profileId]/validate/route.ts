import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth-guards";
import { jsonOk, handleApiError } from "@/lib/api-response";
import { validateProfileByAdmin } from "@/services/admin-profile.service";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ profileId: string }> },
): Promise<Response> {
  try {
    const session = await requireAdmin();
    const { profileId } = await params;
    await validateProfileByAdmin(profileId, session.user.id);
    return jsonOk({ validated: true });
  } catch (err) {
    return handleApiError(err);
  }
}
