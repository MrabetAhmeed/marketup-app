import { NextRequest } from "next/server";
import { jsonOk, handleApiError } from "@/lib/api-response";
import { getPublicProfileBySlug } from "@/services/public-profile.service";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  try {
    const { slug } = await params;
    const lang = (req.nextUrl.searchParams.get("lang") as "fr" | "ar" | "en") || "fr";
    const result = await getPublicProfileBySlug("brandup", slug, lang);
    return jsonOk(result);
  } catch (err) {
    return handleApiError(err);
  }
}
