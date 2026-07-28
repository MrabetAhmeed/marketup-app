import { NextRequest } from "next/server";
import { requireOwner, requireMonetization } from "@/lib/auth-guards";
import { jsonOk, handleApiError } from "@/lib/api-response";
import { SponsoringCheckoutSchema } from "@/schemas/sponsoring.schema";
import { checkoutSponsoring } from "@/services/sponsoring.service";

export async function POST(req: NextRequest): Promise<Response> {
  try {
    requireMonetization();
    const session = await requireOwner();
    const body = await req.json();
    const parsed = SponsoringCheckoutSchema.parse(body);
    const result = await checkoutSponsoring(
      session.user.companyId!,
      parsed.sponsoringId,
      parsed.idempotencyKey,
    );
    return jsonOk(result, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
