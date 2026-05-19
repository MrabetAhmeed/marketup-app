import { NextRequest } from "next/server";
import { requireOwner } from "@/lib/auth-guards";
import { jsonOk, handleApiError } from "@/lib/api-response";
import { uploadImageFromRequest } from "@/lib/upload";
import { connectDb } from "@/lib/db";
import { User } from "@/models/user.model";
import { NotFoundError } from "@/lib/api-error";

/* eslint-disable @typescript-eslint/no-explicit-any */
const UserModel = User as any;

/**
 * Upload an image to storage without persisting to any DB document.
 * Returns { url, publicId } for the caller to use in a subsequent save.
 */
export async function POST(req: NextRequest): Promise<Response> {
  try {
    const session = await requireOwner();
    await connectDb();

    const user = await UserModel.findById(session.user.id).lean();
    if (!user) throw new NotFoundError("User");
    const companyId = user.companyId?.toString();
    if (!companyId) throw new NotFoundError("Company");

    const result = await uploadImageFromRequest(req, "file", {
      companyId,
      category: "gallery",
    });

    return jsonOk({ url: result.url, publicId: result.key });
  } catch (err) {
    return handleApiError(err);
  }
}
