import { NextRequest } from "next/server";
import { jsonOk, handleApiError } from "@/lib/api-response";
import { AppError } from "@/lib/api-error";
import { storage } from "@/lib/storage";
import { signupDocUploadIpLimit, getClientIp } from "@/lib/rate-limit";
export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Public endpoint for uploading a legal document during signup.
 * No auth required — rate limited by IP.
 */
export async function POST(req: NextRequest): Promise<Response> {
  try {
    // Rate limit by IP
    const ip = getClientIp(req.headers);
    const limit = signupDocUploadIpLimit.check(ip);
    if (!limit.allowed) {
      throw new AppError(
        "RATE_LIMITED",
        "Trop de tentatives. Veuillez réessayer dans quelques minutes.",
        429,
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      throw new AppError("VALIDATION_FAILED", "Aucun fichier fourni.", 400);
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      throw new AppError(
        "VALIDATION_FAILED",
        "Format non accepté. Formats autorisés : PDF, JPG, PNG, WebP.",
        400,
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      throw new AppError(
        "VALIDATION_FAILED",
        "Fichier trop volumineux (10 Mo maximum).",
        400,
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await storage.upload(buffer, {
      companyId: "signup-temp",
      category: "legal-docs",
      originalName: file.name,
      contentType: file.type,
    });

    return jsonOk({ url: result.url, publicId: result.key });
  } catch (err) {
    return handleApiError(err);
  }
}
