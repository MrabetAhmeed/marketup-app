import { jsonOk, handleApiError } from "@/lib/api-response";
import { getClientIp, loginIpLimit } from "@/lib/rate-limit";
import { LoginSchema } from "@/schemas/auth.schema";
import { login } from "@/services/auth.service";
import type { NextRequest } from "next/server";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // IP rate limit: 20 req / 5 min
    const ip = getClientIp(req.headers);
    const ipCheck = loginIpLimit.check(`login:${ip}`);
    if (!ipCheck.allowed) {
      return jsonOk(
        { error: { code: "RATE_LIMITED", message: "Trop de tentatives. Réessayez plus tard." } },
        429,
      );
    }

    const body = await req.json();
    const parsed = LoginSchema.parse(body);
    const result = await login(parsed.email, parsed.password);
    return jsonOk(result);
  } catch (err) {
    return handleApiError(err);
  }
}
