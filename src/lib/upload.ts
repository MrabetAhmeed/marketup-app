import { AppError } from "@/lib/api-error";
import { env } from "@/lib/env";
import { storage } from "@/lib/storage";
import type { UploadCategory, UploadResult } from "@/lib/storage";

// ---------------------------------------------------------------------------
// Image upload validation + storage
// ---------------------------------------------------------------------------

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export interface UploadImageOptions {
  companyId: string;
  category: UploadCategory;
}

/**
 * Parse a single file from a Request (multipart/form-data),
 * validate type + size, upload to storage adapter.
 */
export async function uploadImageFromRequest(
  req: Request,
  fieldName: string,
  options: UploadImageOptions,
): Promise<UploadResult> {
  const formData = await req.formData();
  const file = formData.get(fieldName);

  if (!file || !(file instanceof File)) {
    throw new AppError("VALIDATION_FAILED", "Aucun fichier fourni.", 400);
  }

  // Validate content type
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new AppError(
      "VALIDATION_FAILED",
      "Format non accepté. Formats autorisés : JPG, PNG, WebP.",
      400,
      { fields: { [fieldName]: ["Format non accepté (JPG, PNG, WebP uniquement)."] } },
    );
  }

  // Validate size
  const maxBytes = env.UPLOAD_MAX_SIZE_MB * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new AppError(
      "VALIDATION_FAILED",
      `Fichier trop volumineux (${env.UPLOAD_MAX_SIZE_MB} Mo maximum).`,
      400,
      { fields: { [fieldName]: [`Taille maximum : ${env.UPLOAD_MAX_SIZE_MB} Mo.`] } },
    );
  }

  // Upload
  const buffer = Buffer.from(await file.arrayBuffer());
  return storage.upload(buffer, {
    companyId: options.companyId,
    category: options.category,
    originalName: file.name,
    contentType: file.type,
  });
}
