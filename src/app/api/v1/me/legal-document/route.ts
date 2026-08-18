import { NextRequest } from "next/server";
import { requireOwner } from "@/lib/auth-guards";
import { jsonOk, handleApiError } from "@/lib/api-response";
import { uploadLegalDocFromRequest } from "@/lib/upload";
import { connectDb } from "@/lib/db";
import { User } from "@/models/user.model";
import { NotFoundError } from "@/lib/api-error";
export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */
const UserModel = User as any;

/**
 * Upload a replacement legal identity document.
 * The URL is returned for the client to include in the next account PATCH (pendingUpdates).
 * Auth: requireOwner.
 */
export async function POST(req: NextRequest): Promise<Response> {
  try {
    const session = await requireOwner();
    await connectDb();

    const user = await UserModel.findById(session.user.id).lean();
    if (!user) throw new NotFoundError("User");
    const companyId = user.companyId?.toString();
    if (!companyId) throw new NotFoundError("Company");

    const result = await uploadLegalDocFromRequest(req, "file", companyId);

    return jsonOk({ url: result.url, publicId: result.key });
  } catch (err) {
    return handleApiError(err);
  }
}
