import { NextRequest } from "next/server";
import { requireOwner } from "@/lib/auth-guards";
import { jsonOk, handleApiError } from "@/lib/api-response";
import { uploadImageFromRequest } from "@/lib/upload";
import { connectDb } from "@/lib/db";
import { User } from "@/models/user.model";
import { Company } from "@/models/company.model";
import { NotFoundError } from "@/lib/api-error";
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

    // Write to pendingUpdates instead of data.bannerUrl (hard change PP-10)
    const company = await CompanyModel.findById(companyId).lean();
    if (!company) throw new NotFoundError("Company");

    const currentBannerUrl = company.data?.bannerUrl ?? null;
    const existing = company.pendingUpdates?.fields ?? [];
    const filtered = existing.filter((f: { key: string }) => f.key !== "data.bannerUrl");
    filtered.push({
      key: "data.bannerUrl",
      label: "Bannière",
      currentValue: currentBannerUrl,
      newValue: result.url,
    });

    await CompanyModel.findByIdAndUpdate(companyId, {
      pendingUpdates: {
        submittedAt: new Date(),
        fields: filtered,
        note: null,
      },
    });

    return jsonOk({ url: result.url, pending: true });
  } catch (err) {
    return handleApiError(err);
  }
}
