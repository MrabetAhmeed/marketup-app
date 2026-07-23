import { NextRequest } from "next/server";
import { requireOwner } from "@/lib/auth-guards";
import { jsonOk, handleApiError, jsonError } from "@/lib/api-response";
import { ChangePasswordSchema } from "@/schemas/settings.schema";
import { changePassword } from "@/services/auth.service";
import { changePasswordLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest): Promise<Response> {
  try {
    const session = await requireOwner();

    // Rate limit per userId
    const rl = changePasswordLimit.check(`change-pwd:${session.user.id}`);
    if (!rl.allowed) {
      return jsonError("RATE_LIMITED", "Trop de tentatives. Réessayez plus tard.", 429);
    }

    const body = await req.json();
    const parsed = ChangePasswordSchema.parse(body);

    await changePassword(session.user.id, {
      currentPassword: parsed.currentPassword,
      newPassword: parsed.newPassword,
    });

    return jsonOk({ message: "Mot de passe modifié avec succès." });
  } catch (err) {
    return handleApiError(err);
  }
}
