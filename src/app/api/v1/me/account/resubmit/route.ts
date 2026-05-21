import { NextRequest } from "next/server";
import { requireOwner } from "@/lib/auth-guards";
import { jsonOk, handleApiError } from "@/lib/api-response";
import { CompanyResubmitSchema } from "@/schemas/account-resubmit.schema";
import { resubmitCompany } from "@/services/account-resubmit.service";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const session = await requireOwner();
    const body = await req.json();
    const parsed = CompanyResubmitSchema.parse(body);
    await resubmitCompany(session.user.id, parsed);
    return jsonOk({ resubmitted: true });
  } catch (err) {
    return handleApiError(err);
  }
}
