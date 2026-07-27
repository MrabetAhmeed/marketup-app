import { NextRequest } from "next/server";
import { requireOwner, requireMonetization } from "@/lib/auth-guards";
import { jsonOk, handleApiError } from "@/lib/api-response";
import { BoostCheckoutSchema } from "@/schemas/boost.schema";
import { checkoutBoost } from "@/services/boost.service";

export async function POST(req: NextRequest): Promise<Response> {
  try {
    requireMonetization();
    const session = await requireOwner();
    const body = await req.json();
    const parsed = BoostCheckoutSchema.parse(body);
    const result = await checkoutBoost(
      // requireOwner() guarantees companyId is non-null
      session.user.companyId!,
      parsed.profileKind,
      parsed.idempotencyKey,
    );
    return jsonOk(result, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
