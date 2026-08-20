/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from "mongoose";
import { connectDb } from "@/lib/db";
import { env } from "@/lib/env";
import { NotFoundError, BusinessRuleError, ConflictError } from "@/lib/api-error";
import { generateSlug, ensureUniqueSlug } from "@/lib/slug";
import { pickLocale } from "@/lib/i18n";
import { Company } from "@/models/company.model";
import { Profile } from "@/models/profile.model";
import { User } from "@/models/user.model";
import { Sector } from "@/models/sector.model";
import { Gouvernorat } from "@/models/gouvernorat.model";
import { Transaction } from "@/models/transaction.model";
import { Boost } from "@/models/boost.model";
import { Sponsoring } from "@/models/sponsoring.model";
import { RseReceipt } from "@/models/rse-receipt.model";
import { Notification } from "@/models/notification.model";
import { File } from "@/models/file.model";
import {
  sendCompanyValidatedEmail,
  sendCompanyRejectedEmail,
  sendCompanySuspendedEmail,
  sendCompanyReactivatedEmail,
  sendCompanyRestoredEmail,
  sendCompanyUpdatesApprovedEmail,
  sendCompanyUpdatesRejectedEmail,
} from "@/lib/email/sender";
import { createNotification } from "@/services/notifications.service";
import { storage } from "@/lib/storage";
import type { SupportedLang } from "@/lib/i18n";
import type { ProfileKind } from "@/types";

const CompanyModel = Company as any;
const ProfileModel = Profile as any;
const UserModel = User as any;
const SectorModel = Sector as any;
const GouvernoratModel = Gouvernorat as any;
const TransactionModel = Transaction as any;
const BoostModel = Boost as any;
const SponsoringModel = Sponsoring as any;
const RseReceiptModel = RseReceipt as any;
const NotificationModel = Notification as any;
const FileModel = File as any;

function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id);
}

// ---------------------------------------------------------------------------
// List pending companies
// ---------------------------------------------------------------------------

export interface PendingCompanyItem {
  id: string;
  displayName: string;
  slug: string;
  type: string;
  sector: string;
  gouvernorat: string;
  ville: string;
  accountEmail: string;
  registeredAt: string;
  hasLegalDoc: boolean;
}

export async function listPendingCompanies(
  lang: SupportedLang = "fr",
): Promise<PendingCompanyItem[]> {
  await connectDb();

  const companies = await CompanyModel.find({ status: "pending", deletedAt: null })
    .sort({ registeredAt: 1 })
    .lean();

  if (companies.length === 0) return [];

  const sectorSlugs = Array.from(new Set((companies as any[]).map((c) => c.liveData?.sectorId).filter(Boolean)));
  const govSlugs = Array.from(new Set((companies as any[]).map((c) => c.liveData?.gouvernorat).filter(Boolean)));

  const [sectors, gouvernorats] = await Promise.all([
    SectorModel.find({ slug: { $in: sectorSlugs } }).lean(),
    GouvernoratModel.find({ slug: { $in: govSlugs } }).lean(),
  ]);

  const sectorMap = new Map((sectors as any[]).map((s) => [s.slug, pickLocale(s.name, lang)]));
  const govMap = new Map((gouvernorats as any[]).map((g) => [g.slug, pickLocale(g.name, lang)]));

  return (companies as any[]).map((c) => ({
    id: c._id.toString(),
    displayName: pickLocale(c.data?.displayName, lang),
    slug: c.slug,
    type: c.type,
    sector: sectorMap.get(c.liveData?.sectorId) ?? c.liveData?.sectorId ?? "",
    gouvernorat: govMap.get(c.liveData?.gouvernorat) ?? c.liveData?.gouvernorat ?? "",
    ville: c.liveData?.ville ?? "",
    accountEmail: c.accountEmail,
    registeredAt: new Date(c.registeredAt).toISOString(),
    hasLegalDoc: !!c.identityDocumentUrl,
  }));
}

// ---------------------------------------------------------------------------
// Get company for admin review
// ---------------------------------------------------------------------------

export interface LinkedProfile {
  id: string;
  kind: ProfileKind;
  status: string;
}

export interface PendingUpdateField {
  key: string;
  label: string;
  currentValue: unknown;
  newValue: unknown;
}

export interface CompanyForAdminReview {
  id: string;
  displayName: string;
  slug: string;
  type: string;
  legalId: string;
  vatNumber: string | null;
  accountEmail: string;
  contactEmail: string;
  phone: string | null;
  sector: string;
  gouvernorat: string;
  ville: string;
  postalCode: string | null;
  address: string | null;
  identityDocumentUrl: string | null;
  registeredAt: string;
  ownerName: string;
  ownerEmail: string;
  profiles: LinkedProfile[];
  pendingUpdates: {
    submittedAt: string;
    fields: PendingUpdateField[];
  } | null;
}

export async function getCompanyForAdminReview(
  companyId: string,
  lang: SupportedLang = "fr",
  options?: { withDeleted?: boolean },
): Promise<CompanyForAdminReview & { status: string; deletedAt?: string | null }> {
  if (!isValidObjectId(companyId)) {
    throw new BusinessRuleError("INVALID_ID", "Identifiant invalide.");
  }
  await connectDb();

  const includeDeleted = options?.withDeleted === true;
  let companyQuery = CompanyModel.findById(companyId);
  if (includeDeleted) companyQuery = companyQuery.setOptions({ withDeleted: true });
  const company = await companyQuery.lean();
  if (!company) throw new NotFoundError("Company");

  let profileQuery = ProfileModel.find({ companyId: company._id });
  if (includeDeleted) {
    profileQuery = profileQuery.setOptions({ withDeleted: true });
  } else {
    profileQuery = profileQuery.where({ deletedAt: null });
  }

  const [user, sector, gouvernorat, profiles] = await Promise.all([
    includeDeleted
      ? UserModel.findOne({ companyId: company._id }).setOptions({ withDeleted: true }).lean()
      : UserModel.findOne({ companyId: company._id }).lean(),
    SectorModel.findOne({ slug: company.liveData?.sectorId }).lean(),
    GouvernoratModel.findOne({ slug: company.liveData?.gouvernorat }).lean(),
    profileQuery.lean(),
  ]);

  const linkedProfiles: LinkedProfile[] = (profiles as any[]).map((p) => ({
    id: p._id.toString(),
    kind: p.kind as ProfileKind,
    status: p.status as string,
  }));

  return {
    id: company._id.toString(),
    status: company.status,
    displayName: pickLocale(company.data?.displayName, lang),
    slug: company.slug,
    type: company.type,
    legalId: company.legalId,
    vatNumber: company.vatNumber ?? null,
    accountEmail: company.accountEmail,
    contactEmail: company.liveData?.contactEmail ?? "",
    phone: company.liveData?.phone ?? null,
    sector: sector ? pickLocale(sector.name, lang) : company.liveData?.sectorId ?? "",
    gouvernorat: gouvernorat ? pickLocale(gouvernorat.name, lang) : company.liveData?.gouvernorat ?? "",
    ville: company.liveData?.ville ?? "",
    postalCode: company.liveData?.postalCode ?? null,
    address: company.liveData?.address ?? null,
    identityDocumentUrl: company.identityDocumentUrl ?? null,
    registeredAt: new Date(company.registeredAt).toISOString(),
    ownerName: company.liveData?.gerantFirstName || company.liveData?.gerantLastName
      ? `${company.liveData.gerantFirstName ?? ""} ${company.liveData.gerantLastName ?? ""}`.trim()
      : user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() : "",
    ownerEmail: user?.email ?? company.accountEmail,
    profiles: linkedProfiles,
    pendingUpdates: company.pendingUpdates
      ? {
          submittedAt: new Date(company.pendingUpdates.submittedAt).toISOString(),
          fields: (company.pendingUpdates.fields ?? []).map((f: { key: string; label: string; currentValue: unknown; newValue: unknown }) => ({
            key: f.key,
            label: f.label,
            currentValue: f.currentValue,
            newValue: f.newValue,
          })),
        }
      : null,
    deletedAt: company.deletedAt ? new Date(company.deletedAt).toISOString() : null,
  };
}

// ---------------------------------------------------------------------------
// Validate company
// ---------------------------------------------------------------------------

export async function validateCompanyByAdmin(
  companyId: string,
  adminId: string,
  lang: SupportedLang = "fr",
): Promise<void> {
  if (!isValidObjectId(companyId)) {
    throw new BusinessRuleError("INVALID_ID", "Identifiant invalide.");
  }
  await connectDb();

  const company = await CompanyModel.findById(companyId).lean();
  if (!company) throw new NotFoundError("Company");
  if (company.status !== "pending") {
    throw new BusinessRuleError("NOT_PENDING", "Ce compte n'est pas en attente de validation.");
  }

  await CompanyModel.findByIdAndUpdate(companyId, {
    $set: {
      status: "active",
      validatedAt: new Date(),
      validatedBy: adminId,
      rejectedReason: null,
      rejectedAt: null,
    },
  });

  try {
    const user = await UserModel.findOne({ companyId: company._id }).lean();
    if (user) {
      await sendCompanyValidatedEmail({
        userEmail: user.email,
        companyName: pickLocale(company.data?.displayName, lang),
        dashboardUrl: `${env.NEXTAUTH_URL}/dashboard`,
      });
    }
  } catch (err) {
    console.warn("[validateCompany] Email failed (non-blocking):", err);
  }
}

// ---------------------------------------------------------------------------
// Reject company
// ---------------------------------------------------------------------------

export async function rejectCompanyByAdmin(
  companyId: string,
  adminId: string,
  rejectedReason: string,
  lang: SupportedLang = "fr",
): Promise<void> {
  if (!isValidObjectId(companyId)) {
    throw new BusinessRuleError("INVALID_ID", "Identifiant invalide.");
  }
  await connectDb();

  const company = await CompanyModel.findById(companyId).lean();
  if (!company) throw new NotFoundError("Company");
  if (company.status !== "pending") {
    throw new BusinessRuleError("NOT_PENDING", "Ce compte n'est pas en attente de validation.");
  }

  await CompanyModel.findByIdAndUpdate(companyId, {
    $set: {
      status: "rejected",
      rejectedReason,
      rejectedAt: new Date(),
    },
  });

  try {
    const user = await UserModel.findOne({ companyId: company._id }).lean();
    if (user) {
      await sendCompanyRejectedEmail({
        userEmail: user.email,
        companyName: pickLocale(company.data?.displayName, lang),
        rejectedReason,
      });
    }
  } catch (err) {
    console.warn("[rejectCompany] Email failed (non-blocking):", err);
  }
}

// ---------------------------------------------------------------------------
// Suspend company (admin action)
// ---------------------------------------------------------------------------

export async function suspendCompanyByAdmin(
  companyId: string,
  adminId: string,
  reason: string,
): Promise<void> {
  if (!isValidObjectId(companyId)) {
    throw new BusinessRuleError("INVALID_ID", "Identifiant invalide.");
  }
  await connectDb();

  const company = await CompanyModel.findById(companyId).lean();
  if (!company) throw new NotFoundError("Company");
  if (company.status === "suspended") {
    throw new BusinessRuleError("ALREADY_SUSPENDED", "Ce compte est déjà désactivé.");
  }

  const now = new Date();
  await CompanyModel.findByIdAndUpdate(companyId, {
    $set: { status: "suspended", suspendedAt: now, suspendedReason: reason },
    $push: {
      auditTrail: {
        at: now,
        by: new mongoose.Types.ObjectId(adminId),
        byRole: "SUPER_ADMIN",
        action: "suspended",
        details: { reason },
      },
    },
  });

  // Non-blocking email to owner
  try {
    const owner = await UserModel.findOne({ companyId: new mongoose.Types.ObjectId(companyId) }).lean();
    if (owner?.email) {
      const companyName = pickLocale(company.data?.displayName, "fr");
      await sendCompanySuspendedEmail({
        userEmail: owner.email,
        companyName,
        reason,
      });
    }
  } catch (err) {
    console.warn("[suspendCompany] Email failed (non-blocking):", err);
  }
}

// ---------------------------------------------------------------------------
// Reactivate company (admin action)
// ---------------------------------------------------------------------------

export async function reactivateCompanyByAdmin(
  companyId: string,
  adminId: string,
): Promise<void> {
  if (!isValidObjectId(companyId)) {
    throw new BusinessRuleError("INVALID_ID", "Identifiant invalide.");
  }
  await connectDb();

  const company = await CompanyModel.findById(companyId).lean();
  if (!company) throw new NotFoundError("Company");
  if (company.status !== "suspended") {
    throw new BusinessRuleError("NOT_SUSPENDED", "Ce compte n'est pas désactivé.");
  }

  const now = new Date();
  await CompanyModel.findByIdAndUpdate(companyId, {
    $set: { status: "active", suspendedAt: null, suspendedReason: null },
    $push: {
      auditTrail: {
        at: now,
        by: new mongoose.Types.ObjectId(adminId),
        byRole: "SUPER_ADMIN",
        action: "reactivated",
      },
    },
  });

  // Non-blocking email to owner
  try {
    const owner = await UserModel.findOne({ companyId: new mongoose.Types.ObjectId(companyId) }).lean();
    if (owner?.email) {
      const companyName = pickLocale(company.data?.displayName, "fr");
      await sendCompanyReactivatedEmail({
        userEmail: owner.email,
        companyName,
      });
    }
  } catch (err) {
    console.warn("[reactivateCompany] Email failed (non-blocking):", err);
  }
}

// ---------------------------------------------------------------------------
// Approve pending updates on active company
// ---------------------------------------------------------------------------

export async function approvePendingUpdates(
  companyId: string,
  adminId: string,
): Promise<void> {
  if (!isValidObjectId(companyId)) {
    throw new BusinessRuleError("INVALID_ID", "Identifiant invalide.");
  }
  await connectDb();

  const company = await CompanyModel.findById(companyId).lean();
  if (!company) throw new NotFoundError("Company");
  if (!company.pendingUpdates || !company.pendingUpdates.fields?.length) {
    throw new BusinessRuleError("NO_PENDING", "Aucune modification en attente.");
  }

  // Merge each pending field into data
  const setMap: Record<string, unknown> = {};
  for (const field of company.pendingUpdates.fields) {
    setMap[field.key] = field.newValue;
  }

  // --- Slug γ: regenerate slug when displayName changes ---
  const displayNameField = company.pendingUpdates.fields.find(
    (f: { key: string }) => f.key === "data.displayName",
  );

  let newSlug: string | null = null;
  let slugChanged = false;

  if (displayNameField) {
    const newDisplayName: string =
      typeof displayNameField.newValue === "object" && displayNameField.newValue !== null
        ? (displayNameField.newValue as { fr?: string }).fr ?? ""
        : String(displayNameField.newValue);

    const candidateSlug = generateSlug(newDisplayName);
    const currentSlug: string = company.slug;

    // No-op guard: if generated slug === current slug, skip
    if (candidateSlug !== currentSlug) {
      newSlug = await ensureUniqueSlug(candidateSlug, companyId);
      slugChanged = true;
    }
  }

  // Build the update operations
  const updateOps: Record<string, unknown> = {
    $set: { ...setMap, pendingUpdates: null } as Record<string, unknown>,
    $push: {
      auditTrail: {
        at: new Date(),
        by: new mongoose.Types.ObjectId(adminId),
        byRole: "SUPER_ADMIN",
        action: "approve_pending_updates",
        details: {
          fields: company.pendingUpdates.fields.map((f: { key: string }) => f.key),
          ...(slugChanged ? { slugChange: { from: company.slug, to: newSlug } } : {}),
        },
      },
    },
  };

  if (slugChanged && newSlug) {
    const currentSlug: string = company.slug;
    const currentHistory: string[] = company.slugHistory ?? [];

    // Retour interne: if newSlug is in own slugHistory, remove it
    const isRetourInterne = currentHistory.includes(newSlug);

    // Compute new slugHistory: add old slug, remove newSlug if retour interne
    const updatedHistory = isRetourInterne
      ? currentHistory.filter((s: string) => s !== newSlug)
      : [...currentHistory];
    if (!updatedHistory.includes(currentSlug)) {
      updatedHistory.push(currentSlug);
    }

    (updateOps.$set as Record<string, unknown>).slug = newSlug;
    (updateOps.$set as Record<string, unknown>).slugHistory = updatedHistory;
  }

  await CompanyModel.findByIdAndUpdate(companyId, updateOps);

  // --- Fire-and-forget: sync-back User identity + ownerFullName ---
  try {
    const gerantFirstField = company.pendingUpdates.fields.find(
      (f: { key: string }) => f.key === "liveData.gerantFirstName",
    );
    const gerantLastField = company.pendingUpdates.fields.find(
      (f: { key: string }) => f.key === "liveData.gerantLastName",
    );

    if (gerantFirstField || gerantLastField) {
      // Sync User.firstName / User.lastName
      const userSetMap: Record<string, string> = {};
      if (gerantFirstField) userSetMap.firstName = gerantFirstField.newValue as string;
      if (gerantLastField) userSetMap.lastName = gerantLastField.newValue as string;
      await UserModel.findOneAndUpdate(
        { companyId: new mongoose.Types.ObjectId(companyId) },
        { $set: userSetMap },
      );

      // Recalculate ownerFullName for search haystack
      const mergedFirst = (gerantFirstField?.newValue as string) ?? company.liveData?.gerantFirstName ?? "";
      const mergedLast = (gerantLastField?.newValue as string) ?? company.liveData?.gerantLastName ?? "";
      const ownerFullName = `${mergedFirst} ${mergedLast}`.trim();
      await CompanyModel.findByIdAndUpdate(companyId, { ownerFullName });
    }
  } catch (err) {
    console.warn("[approvePendingUpdates] User sync-back failed (non-blocking):", err);
  }

  // --- Fire-and-forget: notification + email to owner ---
  try {
    const user = await UserModel.findOne({ companyId: new mongoose.Types.ObjectId(companyId) }).lean();
    if (user) {
      const fieldLabels = company.pendingUpdates.fields.map((f: { label: string }) => f.label);
      const companyName = pickLocale(company.data?.displayName, "fr");

      await createNotification({
        recipientType: "owner",
        recipientId: (user._id as mongoose.Types.ObjectId).toString(),
        kind: "account_updates_approved",
        icon: "check_circle",
        color: "success",
        title: { fr: "Modifications validées", ar: "", en: "" },
        body: { fr: `Vos modifications de compte (${fieldLabels.join(", ")}) ont été validées.`, ar: "", en: "" },
        actionUrl: "/dashboard/account",
      });

      await sendCompanyUpdatesApprovedEmail({
        userEmail: user.email,
        companyName,
        fieldLabels,
      });
    }
  } catch (err) {
    console.warn("[approvePendingUpdates] Notification/email failed (non-blocking):", err);
  }
}

// ---------------------------------------------------------------------------
// Reject pending updates on active company
// ---------------------------------------------------------------------------

export async function rejectPendingUpdates(
  companyId: string,
  adminId: string,
  rejectionNote: string,
): Promise<void> {
  if (!isValidObjectId(companyId)) {
    throw new BusinessRuleError("INVALID_ID", "Identifiant invalide.");
  }
  if (!rejectionNote || rejectionNote.trim().length < 3) {
    throw new BusinessRuleError("REJECTION_NOTE_REQUIRED", "Le motif du refus est obligatoire (3 caractères minimum).");
  }
  await connectDb();

  const company = await CompanyModel.findById(companyId).lean();
  if (!company) throw new NotFoundError("Company");
  if (!company.pendingUpdates || !company.pendingUpdates.fields?.length) {
    throw new BusinessRuleError("NO_PENDING", "Aucune modification en attente.");
  }

  const now = new Date();
  const trimmedNote = rejectionNote.trim();

  await CompanyModel.findByIdAndUpdate(companyId, {
    $set: {
      pendingUpdates: null,
      lastPendingRejection: { note: trimmedNote, rejectedAt: now },
    },
    $push: {
      auditTrail: {
        at: now,
        by: new mongoose.Types.ObjectId(adminId),
        byRole: "SUPER_ADMIN",
        action: "reject_pending_updates",
        details: {
          fields: company.pendingUpdates.fields.map((f: { key: string }) => f.key),
          note: trimmedNote,
        },
      },
    },
  });

  // --- Fire-and-forget: notification + email to owner ---
  try {
    const user = await UserModel.findOne({ companyId: new mongoose.Types.ObjectId(companyId) }).lean();
    if (user) {
      const fieldLabels = company.pendingUpdates.fields.map((f: { label: string }) => f.label);
      const companyName = pickLocale(company.data?.displayName, "fr");

      await createNotification({
        recipientType: "owner",
        recipientId: (user._id as mongoose.Types.ObjectId).toString(),
        kind: "account_updates_rejected",
        icon: "block",
        color: "danger",
        title: { fr: "Modifications refusées", ar: "", en: "" },
        body: { fr: `Vos modifications de compte ont été refusées. Motif : ${trimmedNote}`, ar: "", en: "" },
        actionUrl: "/dashboard/account",
      });

      await sendCompanyUpdatesRejectedEmail({
        userEmail: user.email,
        companyName,
        fieldLabels,
        rejectionNote: trimmedNote,
      });
    }
  } catch (err) {
    console.warn("[rejectPendingUpdates] Notification/email failed (non-blocking):", err);
  }

  // --- Best-effort: delete rejected identity document from storage ---
  try {
    const docField = company.pendingUpdates.fields.find(
      (f: { key: string }) => f.key === "identityDocumentUrl",
    );
    if (docField && typeof docField.newValue === "string") {
      await storage.delete(docField.newValue);
    }
  } catch (err) {
    console.warn("[rejectPendingUpdates] Storage cleanup failed (non-blocking):", err);
  }
}

// ---------------------------------------------------------------------------
// List all companies (active + suspended) for admin entreprises page
// ---------------------------------------------------------------------------

export interface CompanyListItem {
  id: string;
  displayName: string;
  slug: string;
  type: string;
  status: string;
  sector: string;
  ville: string;
  registeredAt: string;
}

export async function listAllCompanies(
  lang: SupportedLang = "fr",
): Promise<CompanyListItem[]> {
  await connectDb();

  const companies = await CompanyModel.find({
    status: { $in: ["active", "suspended"] },
    deletedAt: null,
  }).sort({ registeredAt: -1 }).lean();

  const sectorSlugs = Array.from(new Set((companies as any[]).map((c) => c.liveData?.sectorId).filter(Boolean)));
  const sectors = await SectorModel.find({ slug: { $in: sectorSlugs } }).lean();
  const sectorMap = new Map((sectors as any[]).map((s) => [s.slug, pickLocale(s.name, lang)]));

  return (companies as any[]).map((c) => ({
    id: c._id.toString(),
    displayName: pickLocale(c.data?.displayName, lang),
    slug: c.slug,
    type: c.type,
    status: c.status,
    sector: sectorMap.get(c.liveData?.sectorId) ?? c.liveData?.sectorId ?? "",
    ville: c.liveData?.ville ?? "",
    registeredAt: new Date(c.registeredAt).toISOString(),
    suspendedReason: c.suspendedReason ?? null,
    suspendedAt: c.suspendedAt ? new Date(c.suspendedAt).toISOString() : null,
  }));
}

// ---------------------------------------------------------------------------
// List active companies with pendingUpdates (for admin hub "Modifications")
// ---------------------------------------------------------------------------

export interface PendingUpdateCompanyItem {
  id: string;
  displayName: string;
  slug: string;
  fieldsCount: number;
  submittedAt: string;
}

export async function listCompaniesWithPendingUpdates(
  lang: SupportedLang = "fr",
): Promise<PendingUpdateCompanyItem[]> {
  await connectDb();

  const companies = await CompanyModel.find({
    pendingUpdates: { $ne: null },
    status: "active",
    deletedAt: null,
  }).sort({ "pendingUpdates.submittedAt": 1 }).lean();

  return (companies as any[]).map((c) => ({
    id: c._id.toString(),
    displayName: pickLocale(c.data?.displayName, lang),
    slug: c.slug,
    fieldsCount: c.pendingUpdates?.fields?.length ?? 0,
    submittedAt: c.pendingUpdates?.submittedAt
      ? new Date(c.pendingUpdates.submittedAt).toISOString()
      : "",
  }));
}

// ---------------------------------------------------------------------------
// Restore deleted company (admin action — symmetric cascade inverse of PP-14)
// ---------------------------------------------------------------------------

export async function restoreCompanyByAdmin(
  companyId: string,
  adminId: string,
): Promise<void> {
  if (!isValidObjectId(companyId)) {
    throw new BusinessRuleError("INVALID_ID", "Identifiant invalide.");
  }
  await connectDb();

  // Must use withDeleted to find the deleted company
  const company = await CompanyModel.findById(companyId).setOptions({ withDeleted: true }).lean();
  if (!company) throw new NotFoundError("Company");
  if (company.status !== "deleted") {
    throw new ConflictError("NOT_DELETED", "Ce compte n'est pas supprimé.");
  }

  const cascadeTimestamp = company.deletedAt as Date;

  // Find user (also deleted — use withDeleted)
  const user = await UserModel.findOne({
    companyId: new mongoose.Types.ObjectId(companyId),
  }).setOptions({ withDeleted: true }).lean();

  // E1: company never validated by admin → restore to "pending"
  const restoredStatus = company.validatedAt != null ? "active" : "pending";

  const now = new Date();
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // 1. Company → restore (use updateOne to bypass pre-find soft-delete filter)
    await CompanyModel.updateOne(
      { _id: new mongoose.Types.ObjectId(companyId) },
      {
        $set: { status: restoredStatus, deletedAt: null },
        $push: {
          auditTrail: {
            at: now,
            by: new mongoose.Types.ObjectId(adminId),
            byRole: "SUPER_ADMIN",
            action: "restored",
          },
        },
      },
      { session },
    );

    // 2. User — match exact cascade timestamp
    if (user) {
      await UserModel.updateMany(
        { _id: user._id, deletedAt: cascadeTimestamp },
        { $set: { deletedAt: null } },
        { session },
      );
    }

    const companyOid = new mongoose.Types.ObjectId(companyId);

    // 3. Profiles — match exact cascade timestamp (status untouched)
    await ProfileModel.updateMany(
      { companyId: companyOid, deletedAt: cascadeTimestamp },
      { $set: { deletedAt: null } },
      { session },
    );

    // 4. Transactions
    await TransactionModel.updateMany(
      { companyId: companyOid, deletedAt: cascadeTimestamp },
      { $set: { deletedAt: null } },
      { session },
    );

    // 5. Boosts
    await BoostModel.updateMany(
      { companyId: companyOid, deletedAt: cascadeTimestamp },
      { $set: { deletedAt: null } },
      { session },
    );

    // 6. Sponsorings
    await SponsoringModel.updateMany(
      { companyId: companyOid, deletedAt: cascadeTimestamp },
      { $set: { deletedAt: null } },
      { session },
    );

    // 7. RSE Receipts
    await RseReceiptModel.updateMany(
      { companyId: companyOid, deletedAt: cascadeTimestamp },
      { $set: { deletedAt: null } },
      { session },
    );

    // 8. Notifications (by recipientId = userId)
    if (user) {
      await NotificationModel.updateMany(
        { recipientId: user._id, deletedAt: cascadeTimestamp },
        { $set: { deletedAt: null } },
        { session },
      );
    }

    // 9. Files (by ownerUserId = userId)
    if (user) {
      await FileModel.updateMany(
        { ownerUserId: user._id, deletedAt: cascadeTimestamp },
        { $set: { deletedAt: null } },
        { session },
      );
    }

    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }

  // Non-blocking email to owner
  try {
    if (user?.email) {
      const companyName = pickLocale(company.data?.displayName, "fr");
      await sendCompanyRestoredEmail({
        userEmail: user.email,
        companyName,
      });
    }
  } catch (err) {
    console.warn("[restoreCompany] Email failed (non-blocking):", err);
  }
}

// ---------------------------------------------------------------------------
// List deleted companies (admin corbeille)
// ---------------------------------------------------------------------------

export interface DeletedCompanyItem {
  id: string;
  displayName: string;
  slug: string;
  type: string;
  deletedAt: string;
  registeredAt: string;
}

export async function listDeletedCompanies(
  lang: SupportedLang = "fr",
): Promise<DeletedCompanyItem[]> {
  await connectDb();

  const companies = await CompanyModel.find({ status: "deleted" })
    .setOptions({ withDeleted: true })
    .sort({ deletedAt: -1 })
    .lean();

  return (companies as any[]).map((c) => ({
    id: c._id.toString(),
    displayName: pickLocale(c.data?.displayName, lang),
    slug: c.slug,
    type: c.type,
    deletedAt: c.deletedAt ? new Date(c.deletedAt).toISOString() : "",
    registeredAt: new Date(c.registeredAt).toISOString(),
  }));
}
