import { NextRequest } from "next/server";
import { requireOwner } from "@/lib/auth-guards";
import { jsonOk, handleApiError } from "@/lib/api-response";
import { cancelPendingSubmission } from "@/services/profile-hard.service";
import type { SupportedLang } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ profileId: string }> },
): Promise<Response> {
  try {
    const session = await requireOwner();
    const { profileId } = await params;

    const langParam = req.nextUrl.searchParams.get("lang");
    const lang: SupportedLang = langParam === "ar" || langParam === "en" ? langParam : "fr";

    const result = await cancelPendingSubmission(profileId, session.user.id, lang);
    return jsonOk(result);
  } catch (err) {
    return handleApiError(err);
  }
}
