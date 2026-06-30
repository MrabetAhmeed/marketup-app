/* eslint-disable @typescript-eslint/no-explicit-any */
import { connectDb } from "@/lib/db";
import { AppError, NotFoundError, BusinessRuleError } from "@/lib/api-error";
import { env } from "@/lib/env";
import { pickLocale } from "@/lib/i18n";
import { Profile } from "@/models/profile.model";
import { BrandUp } from "@/models/profile-brandup.model";
import { TraceUp } from "@/models/profile-traceup.model";
import { LinkUp } from "@/models/profile-linkup.model";
import { User } from "@/models/user.model";
import { Company } from "@/models/company.model";
import { getProfileForEditor } from "@/services/profile-editor.service";
import { sendProfileSubmittedEmail } from "@/lib/email/sender";
import {
  BrandupHardSubmitSchema,
  TraceupHardSubmitSchema,
  LinkupHardSubmitSchema,
} from "@/schemas/profile-hard.schema";
import type { BrandupHardSubmitInput, LinkupHardSubmitInput } from "@/schemas/profile-hard.schema";
import type { SupportedLang } from "@/lib/i18n";
import type { ProfileEditorData } from "@/types/profile-editor";
import type { ProfileKind } from "@/types";

// Mongoose 9 strict types — discriminator models for data.* updates
const ProfileModel = Profile as any;
const BrandUpModel = BrandUp as any;
const TraceUpModel = TraceUp as any;
const LinkUpModel = LinkUp as any;
const UserModel = User as any;
const CompanyModel = Company as any;

// Map kind → discriminator model
function getModelForKind(kind: ProfileKind): any {
  switch (kind) {
    case "brandup": return BrandUpModel;
    case "traceup": return TraceUpModel;
    case "linkup": return LinkUpModel;
  }
}

// ---------------------------------------------------------------------------
// submitProfile — HARD submit → pendingData + status=pending + admin email
// ---------------------------------------------------------------------------

export async function submitProfile(
  profileId: string,
  userId: string,
  rawBody: unknown,
  lang: SupportedLang = "fr",
): Promise<ProfileEditorData> {
  await connectDb();

  // Load profile
  const profile = await ProfileModel.findById(profileId).lean();
  if (!profile) throw new NotFoundError("Profile");

  // Cross-tenant guard
  const user = await UserModel.findById(userId).lean();
  if (!user) throw new NotFoundError("User");
  if (profile.companyId.toString() !== user.companyId?.toString()) {
    throw new AppError("FORBIDDEN", "Vous ne pouvez pas modifier ce profil.", 403);
  }

  // Block re-submit on pending
  if (profile.status === "pending") {
    throw new BusinessRuleError(
      "ALREADY_PENDING",
      "Ce profil est déjà en attente de validation.",
    );
  }

  // Block submit on disabled
  if (profile.status === "disabled") {
    throw new BusinessRuleError(
      "PROFILE_DISABLED",
      "Un profil désactivé ne peut pas être soumis.",
    );
  }

  const kind: ProfileKind = profile.kind;
  const previousStatus = profile.status;
  const now = new Date();

  // Validate body per kind + build pendingData fields
  const pendingFields = buildPendingFields(kind, profile, rawBody);

  // Build update
  const update: Record<string, unknown> = {
    status: "pending",
    submittedAt: now,
    "pendingData": pendingFields.length > 0 ? {
      submittedAt: now,
      fields: pendingFields,
      note: null,
      previousStatus,
    } : null,
  };

  // Clear rejection data if re-submitting from rejected
  if (previousStatus === "rejected") {
    update.rejectionReason = null;
    update.rejectedAt = null;
    update.rejectedBy = null;
  }

  // Use discriminator model for the update
  const Model = getModelForKind(kind);
  await Model.findByIdAndUpdate(profileId, { $set: update });

  // Send admin email (non-blocking)
  try {
    const company = await CompanyModel.findById(profile.companyId).lean();
    const companyName = company ? pickLocale(company.data?.displayName, lang) : "Entreprise inconnue";
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL ?? "mrabet.ahmeed@gmail.com";

    await sendProfileSubmittedEmail({
      adminEmail,
      companyName,
      profileKind: kind,
      previousStatus,
      submittedAt: now,
      adminUrl: `${env.NEXTAUTH_URL}/admin/validation/profils`,
    });
  } catch (emailErr) {
    console.warn("[submitProfile] Admin email failed (non-blocking):", emailErr);
  }

  // Return fresh editor data
  const updated = await getProfileForEditor(profile.companyId.toString(), kind, lang);
  if (!updated) throw new NotFoundError("Profile");
  return updated;
}

// ---------------------------------------------------------------------------
// Cancel pending submission — reset pendingData, status back to previous
// ---------------------------------------------------------------------------

export async function cancelPendingSubmission(
  profileId: string,
  userId: string,
  lang: SupportedLang = "fr",
): Promise<ProfileEditorData> {
  await connectDb();

  const profile = await ProfileModel.findById(profileId).lean();
  if (!profile) throw new NotFoundError("Profile");

  const user = await UserModel.findById(userId).lean();
  if (!user) throw new NotFoundError("User");
  if (profile.companyId.toString() !== user.companyId?.toString()) {
    throw new AppError("FORBIDDEN", "Vous ne pouvez pas modifier ce profil.", 403);
  }

  if (profile.status !== "pending") {
    throw new BusinessRuleError(
      "NOT_PENDING",
      "Ce profil n'est pas en attente de validation.",
    );
  }

  const kind: ProfileKind = profile.kind;
  const Model = getModelForKind(kind);

  // Restore the status captured at submit time (fallback: publishedAt heuristic for legacy data)
  const previousStatus = profile.pendingData?.previousStatus
    ?? (profile.publishedAt ? "active" : "incomplete");

  await Model.findByIdAndUpdate(profileId, {
    $set: {
      status: previousStatus,
      pendingData: null,
      submittedAt: null,
    },
  });

  const updated = await getProfileForEditor(profile.companyId.toString(), kind, lang);
  if (!updated) throw new NotFoundError("Profile");
  return updated;
}

// ---------------------------------------------------------------------------
// Build pendingData.fields per kind
// ---------------------------------------------------------------------------

function buildPendingFields(
  kind: ProfileKind,
  profile: any,
  rawBody: unknown,
): Array<{ key: string; label: string; currentValue: unknown; newValue: unknown }> {
  switch (kind) {
    case "brandup":
      return buildBrandupPendingFields(profile, rawBody);
    case "traceup":
      return buildTraceupPendingFields(profile, rawBody);
    case "linkup":
      return buildLinkupPendingFields(profile, rawBody);
  }
}

function buildBrandupPendingFields(
  profile: any,
  rawBody: unknown,
): Array<{ key: string; label: string; currentValue: unknown; newValue: unknown }> {
  const parsed: BrandupHardSubmitInput = BrandupHardSubmitSchema.parse(rawBody);
  const data = profile.data ?? {};
  const fields: Array<{ key: string; label: string; currentValue: unknown; newValue: unknown }> = [];

  fields.push({
    key: "pitch",
    label: "Description courte",
    currentValue: data.pitch ?? { fr: "", ar: "", en: "" },
    newValue: { fr: parsed.pitch, ar: "", en: "" },
  });

  fields.push({
    key: "about",
    label: "À propos",
    currentValue: data.about ?? { fr: "", ar: "", en: "" },
    newValue: { fr: parsed.about, ar: "", en: "" },
  });

  // Gallery snapshot (Approach C) — full array replacement
  // Use client-sent currentGallery (pre-edit state) instead of data.gallery
  // because gallery POST in Phase 1 already added new images to data.gallery
  if (parsed.gallery !== undefined) {
    const currentGallery = parsed.currentGallery
      ? parsed.currentGallery.map((item, idx) => ({
          id: item.id,
          url: item.url,
          caption: { fr: item.caption, ar: "", en: "" },
          order: item.order ?? idx,
        }))
      : (data.gallery ?? []);
    const newGallery = parsed.gallery.map((item, idx) => ({
      id: item.id,
      url: item.url,
      caption: { fr: item.caption, ar: "", en: "" },
      order: item.order ?? idx,
    }));
    fields.push({
      key: "gallery",
      label: "Galerie",
      currentValue: currentGallery,
      newValue: newGallery,
    });
  }

  return fields;
}

function buildTraceupPendingFields(
  _profile: any,
  rawBody: unknown,
): Array<{ key: string; label: string; currentValue: unknown; newValue: unknown }> {
  // TraceUP has no hard fields — validate that body is empty
  TraceupHardSubmitSchema.parse(rawBody);
  return [];
}

function buildLinkupPendingFields(
  profile: any,
  rawBody: unknown,
): Array<{ key: string; label: string; currentValue: unknown; newValue: unknown }> {
  const parsed: LinkupHardSubmitInput = LinkupHardSubmitSchema.parse(rawBody);
  const data = profile.data ?? {};
  const fields: Array<{ key: string; label: string; currentValue: unknown; newValue: unknown }> = [];

  const currentSocials = (data.socials ?? []).map((s: any) => ({
    platform: s.platform,
    url: s.url ?? "",
  }));

  const newSocials = parsed.socials.map((s) => ({
    platform: s.platform,
    url: s.url || "",
  }));

  fields.push({
    key: "socials",
    label: "Réseaux sociaux",
    currentValue: currentSocials,
    newValue: newSocials,
  });

  return fields;
}
