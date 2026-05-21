import { NextRequest } from "next/server";
import { jsonOk, handleApiError } from "@/lib/api-response";
import { searchTraceUp } from "@/services/public-search.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<Response> {
  try {
    const sp = req.nextUrl.searchParams;
    const result = await searchTraceUp({
      type: (sp.get("type") as "B2B" | "B2C") || undefined,
      q: sp.get("q") || undefined,
      gouvernorat: sp.get("gouvernorat") || undefined,
      sectorId: sp.get("sectorId") || undefined,
      page: sp.get("page") ? Number(sp.get("page")) : undefined,
      limit: sp.get("limit") ? Number(sp.get("limit")) : undefined,
    }, (sp.get("lang") as "fr" | "ar" | "en") || "fr");
    return jsonOk(result);
  } catch (err) {
    return handleApiError(err);
  }
}
