import { jsonOk, handleApiError } from "@/lib/api-response";
import { VerifyOtpSchema } from "@/schemas/auth.schema";
import { verifyOtp } from "@/services/auth.service";
import type { NextRequest } from "next/server";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = VerifyOtpSchema.parse(body);
    const result = await verifyOtp(parsed);
    return jsonOk(result, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
