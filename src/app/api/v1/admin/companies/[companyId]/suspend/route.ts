import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-guards";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { suspendCompanyByAdmin } from "@/services/admin-company.service";

const SuspendBodySchema = z.object({
  reason: z.string().min(3, "La raison doit comporter au moins 3 caractères.").max(500),
}).strict();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> },
): Promise<Response> {
  try {
    const session = await requireAdmin();
    const { companyId } = await params;

    const body = await req.json();
    const parsed = SuspendBodySchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("VALIDATION_FAILED", parsed.error.errors[0]?.message || "Données invalides.", 400);
    }

    await suspendCompanyByAdmin(companyId, session.user.id, parsed.data.reason);
    return jsonOk({ suspended: true });
  } catch (err) {
    return handleApiError(err);
  }
}
