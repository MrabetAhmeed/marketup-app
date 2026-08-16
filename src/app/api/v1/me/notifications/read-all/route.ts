import { requireOwner } from "@/lib/auth-guards";
import { jsonOk, handleApiError } from "@/lib/api-response";
import { markAllNotificationsRead } from "@/services/notifications.service";

export async function PATCH(): Promise<Response> {
  try {
    const session = await requireOwner();
    const count = await markAllNotificationsRead(session.user.id);
    return jsonOk({ markedRead: count });
  } catch (err) {
    return handleApiError(err);
  }
}
