/* eslint-disable @typescript-eslint/no-explicit-any */
import { connectDb } from "@/lib/db";
import { AppError, NotFoundError } from "@/lib/api-error";
import { Profile } from "@/models/profile.model";
import { BrandUp } from "@/models/profile-brandup.model";
import { TraceUp } from "@/models/profile-traceup.model";
import { LinkUp } from "@/models/profile-linkup.model";
import { User } from "@/models/user.model";
import { getProfileForEditor } from "@/services/profile-editor.service";
import {
  BrandupSoftSchema,
  TraceupSoftSchema,
  LinkupSoftSchema,
} from "@/schemas/profile-soft.schema";
import type { BrandupSoftInput, LinkupSoftInput } from "@/schemas/profile-soft.schema";
import type { SupportedLang } from "@/lib/i18n";
import type { ProfileEditorData } from "@/types/profile-editor";
import type { ProfileKind } from "@/types";

// Mongoose 9 strict types — use discriminator models for data.* updates
const ProfileModel = Profile as any;
const BrandUpModel = BrandUp as any;
const TraceUpModel = TraceUp as any;
const LinkUpModel = LinkUp as any;
const UserModel = User as any;

// ---------------------------------------------------------------------------
// updateProfileSoft — apply SOFT field patch to a Profile
// ---------------------------------------------------------------------------

export async function updateProfileSoft(
  profileId: string,
  userId: string,
  rawPatch: unknown,
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

  const kind: ProfileKind = profile.kind;

  // Dispatch validation + apply by kind
  switch (kind) {
    case "brandup":
      await applyBrandupSoft(profileId, profile, rawPatch);
      break;
    case "traceup":
      await applyTraceupSoft(profileId, rawPatch);
      break;
    case "linkup":
      await applyLinkupSoft(profileId, rawPatch);
      break;
  }

  // Return fresh editor data
  const updated = await getProfileForEditor(profile.companyId.toString(), kind, lang);
  if (!updated) throw new NotFoundError("Profile");
  return updated;
}

// ---------------------------------------------------------------------------
// BrandUP soft: isPublic only (gallery is now HARD — Sprint 7C)
// ---------------------------------------------------------------------------

async function applyBrandupSoft(
  profileId: string,
  _profile: any,
  rawPatch: unknown,
): Promise<void> {
  const patch: BrandupSoftInput = BrandupSoftSchema.parse(rawPatch);

  if (patch.isPublic !== undefined) {
    await BrandUpModel.findByIdAndUpdate(profileId, { $set: { isPublic: patch.isPublic } });
  }
}

// ---------------------------------------------------------------------------
// TraceUP soft: isPublic only
// ---------------------------------------------------------------------------

async function applyTraceupSoft(
  profileId: string,
  rawPatch: unknown,
): Promise<void> {
  const patch = TraceupSoftSchema.parse(rawPatch);

  if (patch.isPublic !== undefined) {
    // isPublic is on the base schema, but use discriminator for consistency
    await TraceUpModel.findByIdAndUpdate(profileId, { $set: { isPublic: patch.isPublic } });
  }
}

// ---------------------------------------------------------------------------
// LinkUP soft: isPublic only (socials moved to hard submit in PP-9)
// ---------------------------------------------------------------------------

async function applyLinkupSoft(
  profileId: string,
  rawPatch: unknown,
): Promise<void> {
  const patch: LinkupSoftInput = LinkupSoftSchema.parse(rawPatch);

  if (patch.isPublic !== undefined) {
    await LinkUpModel.findByIdAndUpdate(profileId, { $set: { isPublic: patch.isPublic } });
  }
}
