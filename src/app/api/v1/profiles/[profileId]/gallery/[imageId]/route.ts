import { NextRequest } from "next/server";
import { requireOwner } from "@/lib/auth-guards";
import { jsonOk, handleApiError } from "@/lib/api-response";
import { connectDb } from "@/lib/db";
import { Profile } from "@/models/profile.model";
import { BrandUp } from "@/models/profile-brandup.model";
import { User } from "@/models/user.model";
import { AppError, NotFoundError } from "@/lib/api-error";
import { storage } from "@/lib/storage";

/* eslint-disable @typescript-eslint/no-explicit-any */
const ProfileModel = Profile as any;
const BrandUpModel = BrandUp as any;
const UserModel = User as any;

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ profileId: string; imageId: string }> },
): Promise<Response> {
  try {
    const session = await requireOwner();
    const { profileId, imageId } = await params;
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

    // Find the image in gallery
    const gallery: any[] = profile.data?.gallery ?? [];
    const image = gallery.find((g: any) => g.id === imageId);
    if (!image) throw new NotFoundError("Image");

    // Delete from storage (best-effort)
    if (image.url) {
      try { await storage.delete(image.url); } catch { /* ignore */ }
    }

    // Remove from gallery + re-index order values
    await BrandUpModel.findByIdAndUpdate(profileId, {
      $pull: { "data.gallery": { id: imageId } },
    });

    // Re-index order values after deletion
    const updated = await BrandUpModel.findById(profileId).lean();
    if (updated?.data?.gallery) {
      const reindexed = (updated.data.gallery as any[])
        .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
        .map((item: any, idx: number) => ({ ...item, order: idx }));
      await BrandUpModel.findByIdAndUpdate(profileId, {
        $set: { "data.gallery": reindexed },
      });
    }

    return jsonOk({ deleted: imageId });
  } catch (err) {
    return handleApiError(err);
  }
}
