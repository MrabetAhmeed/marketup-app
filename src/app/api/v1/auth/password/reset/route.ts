import { jsonOk, handleApiError } from "@/lib/api-response";
import { ResetPasswordSchema } from "@/schemas/auth.schema";
import { resetPassword } from "@/services/auth.service";
import type { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = ResetPasswordSchema.parse(body);
    await resetPassword(parsed.resetToken, parsed.newPassword);
    return jsonOk({ message: "Mot de passe mis à jour. Vous pouvez maintenant vous connecter." });
  } catch (err) {
    return handleApiError(err);
  }
}
