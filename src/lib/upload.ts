import { AppError } from "@/lib/api-error";
import { env } from "@/lib/env";
import { storage } from "@/lib/storage";
import type { UploadCategory, UploadResult } from "@/lib/storage";

// ---------------------------------------------------------------------------
// Upload validation + storage
// ---------------------------------------------------------------------------

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_RECEIPT_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const ALLOWED_DOC_TYPES = new Set(["application/pdf"]);

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

/**
 * Upload a receipt file (PDF, JPG, PNG, WebP) from multipart form data.
 */
export async function uploadReceiptFromFile(
  file: File,
  companyId: string,
): Promise<UploadResult> {
  if (!ALLOWED_RECEIPT_TYPES.has(file.type)) {
    throw new AppError(
      "VALIDATION_FAILED",
      "Format non accepté. Formats autorisés : PDF, JPG, PNG, WebP.",
      400,
      { fields: { receipt: ["Format non accepté."] } },
    );
  }

  const maxBytes = env.UPLOAD_MAX_SIZE_MB * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new AppError(
      "VALIDATION_FAILED",
      `Fichier trop volumineux (${env.UPLOAD_MAX_SIZE_MB} Mo maximum).`,
      400,
      { fields: { receipt: [`Taille maximum : ${env.UPLOAD_MAX_SIZE_MB} Mo.`] } },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  return storage.upload(buffer, {
    companyId,
    category: "legal-docs",
    originalName: file.name,
    contentType: file.type,
  });
}

/**
 * Parse a legal identity document from a Request (multipart/form-data).
 * Accepts PDF, JPG, PNG — 2 MB max. Category: identity-docs.
 */
export async function uploadLegalDocFromRequest(
  req: Request,
  fieldName: string,
  companyId: string,
): Promise<UploadResult> {
  const formData = await req.formData();
  const file = formData.get(fieldName);

  if (!file || !(file instanceof File)) {
    throw new AppError("VALIDATION_FAILED", "Aucun fichier fourni.", 400);
  }

  const ALLOWED = new Set(["application/pdf", "image/jpeg", "image/png"]);
  if (!ALLOWED.has(file.type)) {
    throw new AppError(
      "VALIDATION_FAILED",
      "Format non accepté. Formats autorisés : PDF, JPG, PNG.",
      400,
      { fields: { [fieldName]: ["Format non accepté (PDF, JPG, PNG uniquement)."] } },
    );
  }

  const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
  if (file.size > MAX_BYTES) {
    throw new AppError(
      "VALIDATION_FAILED",
      "Fichier trop volumineux (2 Mo maximum).",
      400,
      { fields: { [fieldName]: ["Taille maximum : 2 Mo."] } },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  return storage.upload(buffer, {
    companyId,
    category: "identity-docs",
    originalName: file.name,
    contentType: file.type,
  });
}

/**
 * Upload a document file (PDF only) from a File object.
 */
export async function uploadDocumentFromFile(
  file: File,
  companyId: string,
): Promise<UploadResult> {
  if (!ALLOWED_DOC_TYPES.has(file.type)) {
    throw new AppError(
      "VALIDATION_FAILED",
      "Format non accepté. Seuls les fichiers PDF sont autorisés.",
      400,
    );
  }

  const maxBytes = 10 * 1024 * 1024; // 10 MB for documents
  if (file.size > maxBytes) {
    throw new AppError(
      "VALIDATION_FAILED",
      "Fichier trop volumineux (10 Mo maximum).",
      400,
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  return storage.upload(buffer, {
    companyId,
    category: "legal-docs",
    originalName: file.name,
    contentType: file.type,
  });
}

/**
 * Ensure a Cloudinary raw PDF URL has .pdf extension for browser inline viewing.
 * Cloudinary raw uploads without format option produce URLs without extension,
 * causing browsers to download instead of display inline.
 */
export function ensurePdfExtension(url: string | null): string | null {
  if (!url) return null;
  if (url.endsWith(".pdf")) return url;
  if (url.match(/\.(jpg|jpeg|png|webp|gif)$/i)) return url;
  if (url.includes("res.cloudinary.com") && url.includes("/raw/upload/")) {
    return `${url}.pdf`;
  }
  return url;
}
