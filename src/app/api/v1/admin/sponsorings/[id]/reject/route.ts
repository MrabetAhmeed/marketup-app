import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth-guards";
import { jsonOk, handleApiError } from "@/lib/api-response";
import { SponsoringRejectSchema } from "@/schemas/sponsoring.schema";
import { rejectSponsoring } from "@/services/sponsoring.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const parsed = SponsoringRejectSchema.parse(body);
    await rejectSponsoring(id, parsed.reason);
    return jsonOk({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
