import { jsonOk, handleApiError } from "@/lib/api-response";
import { getClientIp, forgotPasswordIpLimit } from "@/lib/rate-limit";
import { ForgotPasswordSchema } from "@/schemas/auth.schema";
import { forgotPassword } from "@/services/auth.service";
import type { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    // IP rate limit: 10 req / 5 min
    const ip = getClientIp(req.headers);
    const ipCheck = forgotPasswordIpLimit.check(`forgot:${ip}`);
    if (!ipCheck.allowed) {
      // Anti-enumeration: still return 200 with same message
      return jsonOk({
        message: "Si un compte existe pour cet email, un lien de réinitialisation a été envoyé.",
      });
    }

    const body = await req.json();
    const parsed = ForgotPasswordSchema.parse(body);

    // forgotPassword is anti-enumeration internally (always succeeds silently)
    try {
      await forgotPassword(parsed.email);
    } catch {
      // Swallow internal errors (e.g. email service down) — anti-enumeration
      console.error("[auth/password/forgot] internal error (swallowed for anti-enumeration)");
    }

    // Always return 200 with same message
    return jsonOk({
      message: "Si un compte existe pour cet email, un lien de réinitialisation a été envoyé.",
    });
  } catch (err) {
    return handleApiError(err);
  }
}
