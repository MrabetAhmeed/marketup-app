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

  // --- Handle hard fields → pendingUpdates ---
  const hasHardChange =
    patch.displayName !== undefined ||
    patch.gouvernorat !== undefined ||
    patch.ville !== undefined ||
    patch.address !== undefined;

  if (hasHardChange) {
    const company = await CompanyModel.findById(companyId).lean();
    if (!company) throw new NotFoundError("Company");

    let fields: Array<{ key: string; label: string; currentValue: unknown; newValue: unknown }> =
      [...(company.pendingUpdates?.fields ?? [])];
    let changed = false;

    // displayName hard change
    if (patch.displayName !== undefined) {
      const currentFr: string = company.data?.displayName?.fr ?? "";
      if (patch.displayName !== currentFr) {
        fields = fields.filter((f) => f.key !== "data.displayName");
        fields.push({
          key: "data.displayName",
          label: "Nom de l'entreprise",
          currentValue: { fr: currentFr, ar: "", en: "" },
          newValue: { fr: patch.displayName, ar: "", en: "" },
        });
        changed = true;
      }
    }

    // gouvernorat hard change
    if (patch.gouvernorat !== undefined) {
      const currentGouv: string = company.liveData?.gouvernorat ?? "";
      if (patch.gouvernorat !== currentGouv) {
        fields = fields.filter((f) => f.key !== "liveData.gouvernorat");
        fields.push({
          key: "liveData.gouvernorat",
          label: "Gouvernorat",
          currentValue: currentGouv,
          newValue: patch.gouvernorat,
        });
        changed = true;
      }
    }

    // ville hard change
    if (patch.ville !== undefined) {
      const currentVille: string = company.liveData?.ville ?? "";
      if (patch.ville !== currentVille) {
        fields = fields.filter((f) => f.key !== "liveData.ville");
        fields.push({
          key: "liveData.ville",
          label: "Ville",
          currentValue: currentVille,
          newValue: patch.ville,
        });
        changed = true;
      }
    }

    // address hard change
    if (patch.address !== undefined) {
      const currentAddress: string | null = company.liveData?.address ?? null;
      const newAddress = patch.address === "" ? null : patch.address;
      if (newAddress !== currentAddress) {
        fields = fields.filter((f) => f.key !== "liveData.address");
        fields.push({
          key: "liveData.address",
          label: "Adresse",
          currentValue: currentAddress,
          newValue: newAddress,
        });
        changed = true;
      }
    }

    if (changed) {
      await CompanyModel.findByIdAndUpdate(companyId, {
        pendingUpdates: {
          submittedAt: new Date(),
          fields,
          note: null,
        },
      });
    }
  }

  // --- Handle Company.liveData fields ---
  const setMap: Record<string, unknown> = {};
  if (patch.contactEmail !== undefined) setMap["liveData.contactEmail"] = patch.contactEmail;
  if (patch.phone !== undefined) setMap["liveData.phone"] = patch.phone;
  if (patch.whatsapp !== undefined) setMap["liveData.whatsapp"] = patch.whatsapp;
  if (patch.gpsPosition !== undefined) setMap["liveData.gpsPosition"] = patch.gpsPosition;

  if (Object.keys(setMap).length > 0) {
    const updated = await CompanyModel.findByIdAndUpdate(
      companyId,
      { $set: setMap },
      { new: true },
    ).lean();

    if (!updated) throw new NotFoundError("Company");
  }

  // Nothing at all? (no identity, no liveData, no hard change)
  if (!hasIdentity && !hasHardChange && Object.keys(setMap).length === 0) {
    const me = await getMe(userId, companyId, lang);
    if (!me) throw new NotFoundError("Company");
    return me;
  }

  // Return fresh MeResponse
  const me = await getMe(userId, companyId, lang);
  if (!me) throw new NotFoundError("Company");
  return me;
}
