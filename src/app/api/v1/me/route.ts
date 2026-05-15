import { NextRequest } from "next/server";
import { requireOwner } from "@/lib/auth-guards";
import { jsonOk, handleApiError } from "@/lib/api-response";
import { getMe } from "@/services/me.service";
import type { SupportedLang } from "@/lib/i18n";

export async function GET(req: NextRequest): Promise<Response> {
  try {
    const session = await requireOwner();
    const langParam = req.nextUrl.searchParams.get("lang");
    const lang: SupportedLang = langParam === "ar" || langParam === "en" ? langParam : "fr";
    // requireOwner() guarantees companyId is non-null for OWNER role
    const me = await getMe(session.user.id, session.user.companyId!, lang);
    return jsonOk(me);
  } catch (err) {
    return handleApiError(err);
  }
}
