import { NextRequest } from "next/server";
import { requireOwner } from "@/lib/auth-guards";
import { jsonOk, handleApiError } from "@/lib/api-response";
import { markNotificationRead } from "@/services/notifications.service";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: { id: string } },
): Promise<Response> {
  try {
    const session = await requireOwner();
    await markNotificationRead(session.user.id, params.id);
    return jsonOk({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
