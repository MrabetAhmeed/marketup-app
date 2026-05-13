import { jsonOk, handleApiError } from "@/lib/api-response";
import { getClientIp, resendValidationIpLimit } from "@/lib/rate-limit";
import { ResendValidationSchema } from "@/schemas/auth.schema";
import { resendValidationEmail } from "@/services/auth.service";
import type { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    // IP rate limit: 10 req / 5 min
    const ip = getClientIp(req.headers);
    const ipCheck = resendValidationIpLimit.check(`resend-validation:${ip}`);
    if (!ipCheck.allowed) {
      // Anti-enumeration: still return 200 with same message
      return jsonOk({
        message: "Si une inscription est en cours pour cet email, un nouveau code a été envoyé.",
      });
    }

    const body = await req.json();
    const parsed = ResendValidationSchema.parse(body);

    // resendValidationEmail is anti-enumeration internally (always succeeds silently)
    try {
      await resendValidationEmail(parsed.email);
    } catch {
      // Swallow internal errors — anti-enumeration
      console.error("[auth/email/resend-validation] internal error (swallowed for anti-enumeration)");
    }

    // Always return 200 with same message
    return jsonOk({
      message: "Si une inscription est en cours pour cet email, un nouveau code a été envoyé.",
    });
  } catch (err) {
    return handleApiError(err);
  }
}
