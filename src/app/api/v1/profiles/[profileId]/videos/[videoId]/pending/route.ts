import { NextRequest } from "next/server";
import { requireOwner } from "@/lib/auth-guards";
import { jsonOk, handleApiError } from "@/lib/api-response";
import { removeVideoFromPending } from "@/services/profile-video.service";
import type { SupportedLang } from "@/lib/i18n";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ profileId: string; videoId: string }> },
): Promise<Response> {
  try {
    const session = await requireOwner();
    const { profileId, videoId } = await params;

    const langParam = req.nextUrl.searchParams.get("lang");
    const lang: SupportedLang = langParam === "ar" || langParam === "en" ? langParam : "fr";

    const result = await removeVideoFromPending(profileId, session.user.id, videoId, lang);
    return jsonOk(result);
  } catch (err) {
    return handleApiError(err);
  }
}
