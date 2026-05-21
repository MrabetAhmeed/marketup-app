import { NextRequest } from "next/server";
import { requireOwner } from "@/lib/auth-guards";
import { jsonOk, handleApiError } from "@/lib/api-response";
import { uploadImageFromRequest } from "@/lib/upload";
import { connectDb } from "@/lib/db";
import { User } from "@/models/user.model";
import { Company } from "@/models/company.model";
import { NotFoundError } from "@/lib/api-error";
import { storage } from "@/lib/storage";
export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */
const UserModel = User as any;
const CompanyModel = Company as any;

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
      category: "banners",
    });

    // Delete old banner if exists
    const company = await CompanyModel.findById(companyId).lean();
    if (company?.data?.bannerUrl) {
      try { await storage.delete(company.data.bannerUrl); } catch { /* ignore */ }
    }

    await CompanyModel.findByIdAndUpdate(companyId, {
      $set: { "data.bannerUrl": result.url },
    });

    return jsonOk({ url: result.url });
  } catch (err) {
    return handleApiError(err);
  }
}
