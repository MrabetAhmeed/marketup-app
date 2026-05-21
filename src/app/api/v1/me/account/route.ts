import { NextRequest } from "next/server";
import { requireOwner } from "@/lib/auth-guards";
import { jsonOk, handleApiError } from "@/lib/api-response";
import { AccountLiveUpdateSchema } from "@/schemas/account.schema";
import { updateMeAccount } from "@/services/account.service";
import type { SupportedLang } from "@/lib/i18n";
export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest): Promise<Response> {
  try {
    const session = await requireOwner();
    const body = await req.json();
    const parsed = AccountLiveUpdateSchema.parse(body);

    const langParam = req.nextUrl.searchParams.get("lang");
    const lang: SupportedLang = langParam === "ar" || langParam === "en" ? langParam : "fr";

    const me = await updateMeAccount(session.user.id, parsed, lang);
    return jsonOk(me);
  } catch (err) {
    return handleApiError(err);
  }
}
