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
// syncOwnerFullName — recompute Company.ownerFullName from gerant names
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
// HARD_FIELD_DEFS — all fields that go through pendingUpdates
// Keys prefixed "liveData." are written to Company.liveData on approval.
// ---------------------------------------------------------------------------

interface HardFieldDef {
  patchKey: keyof AccountLiveUpdateInput;
  dbKey: string;
  label: string;
  readCurrent: (company: any) => unknown;
  transformNew?: (value: unknown) => unknown;
}

const HARD_FIELD_DEFS: HardFieldDef[] = [
  {
    patchKey: "displayName",
    dbKey: "data.displayName",
    label: "Nom de l'entreprise",
    readCurrent: (c) => ({ fr: c.data?.displayName?.fr ?? "", ar: "", en: "" }),
    transformNew: (v) => ({ fr: v as string, ar: "", en: "" }),
  },
  {
    patchKey: "gouvernorat",
    dbKey: "liveData.gouvernorat",
    label: "Gouvernorat",
    readCurrent: (c) => c.liveData?.gouvernorat ?? "",
  },
  {
    patchKey: "ville",
    dbKey: "liveData.ville",
    label: "Ville",
    readCurrent: (c) => c.liveData?.ville ?? "",
  },
  {
    patchKey: "address",
    dbKey: "liveData.address",
    label: "Adresse",
    readCurrent: (c) => c.liveData?.address ?? null,
  },
  {
    patchKey: "firstName",
    dbKey: "liveData.gerantFirstName",
    label: "Prénom du gérant",
    readCurrent: (c) => c.liveData?.gerantFirstName ?? null,
  },
  {
    patchKey: "lastName",
    dbKey: "liveData.gerantLastName",
    label: "Nom du gérant",
    readCurrent: (c) => c.liveData?.gerantLastName ?? null,
  },
  {
    patchKey: "contactEmail",
    dbKey: "liveData.contactEmail",
    label: "Email de contact public",
    readCurrent: (c) => c.liveData?.contactEmail ?? "",
  },
  {
    patchKey: "phone",
    dbKey: "liveData.phone",
    label: "Téléphone",
    readCurrent: (c) => c.liveData?.phone ?? null,
  },
  {
    patchKey: "whatsapp",
    dbKey: "liveData.whatsapp",
    label: "WhatsApp",
    readCurrent: (c) => c.liveData?.whatsapp ?? null,
  },
  {
    patchKey: "postalCode",
    dbKey: "liveData.postalCode",
    label: "Code postal",
    readCurrent: (c) => c.liveData?.postalCode ?? null,
  },
  {
    patchKey: "identityDocumentUrl",
    dbKey: "identityDocumentUrl",
    label: "Document légal",
    readCurrent: (c) => c.identityDocumentUrl ?? null,
  },
];

// ---------------------------------------------------------------------------
// updateMeAccount — all editable fields go to pendingUpdates except gpsPosition
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

  // --- Handle hard fields → pendingUpdates ---
  const touchedDefs = HARD_FIELD_DEFS.filter((d) => (patch as any)[d.patchKey] !== undefined);

  if (touchedDefs.length > 0) {
    const company = await CompanyModel.findById(companyId).lean();
    if (!company) throw new NotFoundError("Company");

    let fields: Array<{ key: string; label: string; currentValue: unknown; newValue: unknown }> =
      [...(company.pendingUpdates?.fields ?? [])];
    let changed = false;

    for (const def of touchedDefs) {
      const rawValue = (patch as any)[def.patchKey];
      const currentValue = def.readCurrent(company);
      const newValue = def.transformNew ? def.transformNew(rawValue) : rawValue;

      // displayName: compare fr strings
      const currentCmp = def.patchKey === "displayName"
        ? (currentValue as { fr: string }).fr
        : currentValue;
      const newCmp = def.patchKey === "displayName"
        ? (newValue as { fr: string }).fr
        : newValue;

      // address: normalize "" → null for comparison
      const normalizedNew = def.patchKey === "address" && newCmp === "" ? null : newCmp;
      const normalizedCurrent = def.patchKey === "address" && currentCmp === "" ? null : currentCmp;

      if (normalizedNew !== normalizedCurrent) {
        fields = fields.filter((f) => f.key !== def.dbKey);
        fields.push({
          key: def.dbKey,
          label: def.label,
          currentValue,
          newValue: def.patchKey === "address" ? (rawValue === "" ? null : rawValue) : newValue,
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
        lastPendingRejection: null, // Clear rejection banner on new submission
      });
    }
  }

  // --- Handle live fields (only gpsPosition remains instant) ---
  if (patch.gpsPosition !== undefined) {
    await CompanyModel.findByIdAndUpdate(
      companyId,
      { $set: { "liveData.gpsPosition": patch.gpsPosition } },
      { new: true },
    );
  }

  // Return fresh MeResponse
  const me = await getMe(userId, companyId, lang);
  if (!me) throw new NotFoundError("Company");
  return me;
}
