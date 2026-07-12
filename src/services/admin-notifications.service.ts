/* eslint-disable @typescript-eslint/no-explicit-any */
import { connectDb } from "@/lib/db";
import { Profile } from "@/models/profile.model";
import { Company } from "@/models/company.model";
import { RseReceipt } from "@/models/rse-receipt.model";

const ProfileModel = Profile as any;
const CompanyModel = Company as any;
const RseReceiptModel = RseReceipt as any;

export interface AdminPendingCounts {
  profiles: number;
  companies: number;
  companyUpdates: number;
  rse: number;
}

export async function getPendingCountsForAdmin(): Promise<AdminPendingCounts> {
  await connectDb();

  const [profiles, companies, companyUpdates, rse] = await Promise.all([
    ProfileModel.countDocuments({ status: "pending", deletedAt: null }),
    CompanyModel.countDocuments({ status: "pending", deletedAt: null }),
    CompanyModel.countDocuments({ pendingUpdates: { $ne: null }, status: "active", deletedAt: null }),
    RseReceiptModel.countDocuments({ status: "pending", deletedAt: null }),
  ]);

  return { profiles, companies, companyUpdates, rse };
}
