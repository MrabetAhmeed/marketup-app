import { NextRequest } from "next/server";
import { requireOwner, requireMonetization } from "@/lib/auth-guards";
import { jsonOk, handleApiError } from "@/lib/api-response";
import { SponsoringRequestSchema } from "@/schemas/sponsoring.schema";
import { requestSponsoring } from "@/services/sponsoring.service";

export async function POST(req: NextRequest): Promise<Response> {
  try {
    requireMonetization();
    const session = await requireOwner();
    const body = await req.json();
    const parsed = SponsoringRequestSchema.parse(body);
    const result = await requestSponsoring(
      session.user.companyId!,
      parsed.profileKind,
      parsed.bannerUrl,
      parsed.linkUrl,
    );
    return jsonOk(result, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
