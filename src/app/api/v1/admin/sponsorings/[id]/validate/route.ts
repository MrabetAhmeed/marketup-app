import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth-guards";
import { jsonOk, handleApiError } from "@/lib/api-response";
import { validateSponsoring } from "@/services/sponsoring.service";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    await requireAdmin();
    const { id } = await params;
    await validateSponsoring(id);
    return jsonOk({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
