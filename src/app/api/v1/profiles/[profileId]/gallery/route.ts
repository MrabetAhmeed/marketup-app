import crypto from "crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { requireOwner } from "@/lib/auth-guards";
import { jsonOk, handleApiError } from "@/lib/api-response";
import { connectDb } from "@/lib/db";
import { Profile } from "@/models/profile.model";
import { BrandUp } from "@/models/profile-brandup.model";
import { User } from "@/models/user.model";
import { AppError, NotFoundError } from "@/lib/api-error";

/* eslint-disable @typescript-eslint/no-explicit-any */
const ProfileModel = Profile as any;
const BrandUpModel = BrandUp as any;
const UserModel = User as any;

const MAX_GALLERY = 9;

const GalleryAddSchema = z.object({
  url: z.string().url("URL image invalide."),
  title: z.string().trim().min(1, "Le titre est obligatoire.").max(80, "80 caractères maximum."),
}).strict();

/**
 * Add a pre-uploaded image to the BrandUP gallery.
 * Accepts JSON { url, title } — the image must already be uploaded via /api/v1/uploads/image.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ profileId: string }> },
): Promise<Response> {
  try {
    const session = await requireOwner();
    const { profileId } = await params;
    await connectDb();

    // Load profile + cross-tenant guard
    const profile = await ProfileModel.findById(profileId).lean();
    if (!profile) throw new NotFoundError("Profile");

    const user = await UserModel.findById(session.user.id).lean();
    if (!user) throw new NotFoundError("User");
    if (profile.companyId.toString() !== user.companyId?.toString()) {
      throw new AppError("FORBIDDEN", "Vous ne pouvez pas modifier ce profil.", 403);
    }

    if (profile.kind !== "brandup") {
      throw new AppError("VALIDATION_FAILED", "La galerie n'est disponible que pour les profils BrandUP.", 400);
    }

    // Check gallery limit
    const currentGallery: unknown[] = profile.data?.gallery ?? [];
    if (currentGallery.length >= MAX_GALLERY) {
      throw new AppError(
        "VALIDATION_FAILED",
        `La galerie est pleine (${MAX_GALLERY} images maximum).`,
        400,
      );
    }

    // Parse + validate JSON body
    const body = await req.json();
    const parsed = GalleryAddSchema.parse(body);

    // Create gallery item
    const newItem = {
      id: crypto.randomUUID(),
      url: parsed.url,
      caption: { fr: parsed.title, ar: "", en: "" },
      order: currentGallery.length,
    };

    // Push to gallery via BrandUp discriminator model
    await BrandUpModel.findByIdAndUpdate(profileId, {
      $push: { "data.gallery": newItem },
    });

    return jsonOk({ id: newItem.id, url: newItem.url, caption: parsed.title, order: newItem.order }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
