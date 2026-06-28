/* eslint-disable @typescript-eslint/no-explicit-any */
import { connectDb } from "@/lib/db";
import { NotFoundError } from "@/lib/api-error";
import { Company } from "@/models/company.model";
import { User } from "@/models/user.model";
import { getMe } from "@/services/me.service";
import type { AccountLiveUpdateInput } from "@/schemas/account.schema";
import type { SupportedLang } from "@/lib/i18n";
import type { MeResponse } from "@/types/dashboard";

// Mongoose 9 strict types require casts for dynamic queries
const CompanyModel = Company as any;
const UserModel = User as any;

// ---------------------------------------------------------------------------
// syncOwnerFullName — recompute Company.ownerFullName from User names
// ---------------------------------------------------------------------------

export async function syncOwnerFullName(
  companyId: string,
  firstName: string,
  lastName: string,
): Promise<void> {
  const ownerFullName = `${firstName} ${lastName}`.trim();
  await CompanyModel.findByIdAndUpdate(companyId, { ownerFullName });
}

// ---------------------------------------------------------------------------
// updateMeAccount — apply LIVE field patch to Company.liveData + User identity
// ---------------------------------------------------------------------------

export async function updateMeAccount(
  userId: string,
  patch: AccountLiveUpdateInput,
  lang: SupportedLang = "fr",
): Promise<MeResponse> {
  await connectDb();

  // Resolve company from userId
  const user = await UserModel.findById(userId).lean();
  if (!user) throw new NotFoundError("User");

  const companyId = user.companyId?.toString();
  if (!companyId) throw new NotFoundError("Company");

  // --- Handle User identity fields (firstName / lastName) ---
  const hasIdentity = patch.firstName !== undefined || patch.lastName !== undefined;

  if (hasIdentity) {
    const userUpdate: Record<string, string> = {};
    if (patch.firstName !== undefined) userUpdate.firstName = patch.firstName;
    if (patch.lastName !== undefined) userUpdate.lastName = patch.lastName;

    await UserModel.findByIdAndUpdate(userId, { $set: userUpdate });

    // Recompute ownerFullName with merged values
    const newFirst = patch.firstName ?? (user.firstName || "");
    const newLast = patch.lastName ?? (user.lastName || "");

    try {
      await syncOwnerFullName(companyId, newFirst, newLast);
    } catch (err) {
      console.warn("[updateMeAccount] syncOwnerFullName failed, denormalization stale:", err);
    }
  }

  // --- Handle Company.liveData fields ---
  const setMap: Record<string, unknown> = {};
  if (patch.contactEmail !== undefined) setMap["liveData.contactEmail"] = patch.contactEmail;
  if (patch.phone !== undefined) setMap["liveData.phone"] = patch.phone;
  if (patch.whatsapp !== undefined) setMap["liveData.whatsapp"] = patch.whatsapp;
  if (patch.ville !== undefined) setMap["liveData.ville"] = patch.ville;
  if (patch.address !== undefined) setMap["liveData.address"] = patch.address;

  if (Object.keys(setMap).length > 0) {
    const updated = await CompanyModel.findByIdAndUpdate(
      companyId,
      { $set: setMap },
      { new: true },
    ).lean();

    if (!updated) throw new NotFoundError("Company");
  }

  // Nothing at all? (no identity, no liveData)
  if (!hasIdentity && Object.keys(setMap).length === 0) {
    const me = await getMe(userId, companyId, lang);
    if (!me) throw new NotFoundError("Company");
    return me;
  }

  // Return fresh MeResponse
  const me = await getMe(userId, companyId, lang);
  if (!me) throw new NotFoundError("Company");
  return me;
}
