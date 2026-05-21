import { jsonOk, handleApiError } from "@/lib/api-response";
import { SignupUserSchema } from "@/schemas/auth.schema";
import { signupUser } from "@/services/auth.service";
import type { NextRequest } from "next/server";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = SignupUserSchema.parse(body);
    const result = await signupUser(parsed);
    return jsonOk(result);
  } catch (err) {
    return handleApiError(err);
  }
}
