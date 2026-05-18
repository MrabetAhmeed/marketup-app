import { NextRequest } from "next/server";
import { requireOwner } from "@/lib/auth-guards";
import { jsonOk, handleApiError } from "@/lib/api-response";
import { updateProfileSoft } from "@/services/profile-soft.service";
import type { SupportedLang } from "@/lib/i18n";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ profileId: string }> },
): Promise<Response> {
  try {
    const session = await requireOwner();
    const { profileId } = await params;
    const body = await req.json();

    const langParam = req.nextUrl.searchParams.get("lang");
    const lang: SupportedLang = langParam === "ar" || langParam === "en" ? langParam : "fr";

    const result = await updateProfileSoft(profileId, session.user.id, body, lang);
    return jsonOk(result);
  } catch (err) {
    return handleApiError(err);
  }
}
