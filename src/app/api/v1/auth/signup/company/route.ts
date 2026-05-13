import { jsonOk, handleApiError } from "@/lib/api-response";
import { getClientIp, signupIpLimit } from "@/lib/rate-limit";
import { SignupCompanySchema } from "@/schemas/auth.schema";
import { signupCompany } from "@/services/auth.service";
import type { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    // IP rate limit: 5 req / 5 min
    const ip = getClientIp(req.headers);
    const ipCheck = signupIpLimit.check(`signup-company:${ip}`);
    if (!ipCheck.allowed) {
      return jsonOk(
        { error: { code: "RATE_LIMITED", message: "Trop de tentatives. Réessayez plus tard." } },
        429,
      );
    }

    const body = await req.json();
    const parsed = SignupCompanySchema.parse(body);
    const result = await signupCompany(parsed);
    return jsonOk(result, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
