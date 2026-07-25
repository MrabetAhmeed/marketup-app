import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth-guards";
import { jsonOk, handleApiError } from "@/lib/api-response";
import { listAllCompanies, listDeletedCompanies } from "@/services/admin-company.service";
import type { SupportedLang } from "@/lib/i18n";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<Response> {
  try {
    await requireAdmin();
    const langParam = req.nextUrl.searchParams.get("lang");
    const lang: SupportedLang = langParam === "ar" || langParam === "en" ? langParam : "fr";
    const deleted = req.nextUrl.searchParams.get("deleted") === "true";
    const companies = deleted
      ? await listDeletedCompanies(lang)
      : await listAllCompanies(lang);
    return jsonOk(companies);
  } catch (err) {
    return handleApiError(err);
  }
}
