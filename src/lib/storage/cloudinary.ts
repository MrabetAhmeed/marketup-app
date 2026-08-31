import { v2 as cloudinary } from "cloudinary";
import { env } from "@/lib/env";
import { StorageError } from "./types";
import type { StorageAdapter, UploadOptions, UploadResult } from "./types";

// ---------------------------------------------------------------------------
// Cloudinary storage adapter — signed uploads via Node.js SDK
// ---------------------------------------------------------------------------

let configured = false;

function ensureConfigured(): void {
  if (configured) return;
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    throw new StorageError("Cloudinary credentials not configured");
  }
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  configured = true;
}

export class CloudinaryStorageAdapter implements StorageAdapter {
  async upload(file: Buffer, options: UploadOptions): Promise<UploadResult> {
    ensureConfigured();

    const folder = `marketup/companies/${options.companyId}/${options.category}`;
    const resourceType = options.contentType === "application/pdf" ? "raw" : "image";

    try {
      const result = await new Promise<{ secure_url: string; public_id: string; bytes: number }>(
        (resolve, reject) => {
          cloudinary.uploader
            .upload_stream(
              {
                folder,
                resource_type: resourceType,
                public_id: this.buildPublicId(options),
                overwrite: true,
                ...(options.contentType === "application/pdf" && { format: "pdf" }),
                ...(options.isPrivate && { type: "private" }),
              },
              (error, result) => {
                if (error) return reject(error);
                resolve(result as { secure_url: string; public_id: string; bytes: number });
              },
            )
            .end(file);
        },
      );

      return {
        key: result.public_id,
        url: result.secure_url,
        size: result.bytes,
      };
    } catch (err) {
      throw new StorageError("Cloudinary upload failed", {
        originalError: String(err),
        folder,
      });
    }
  }

  async delete(key: string, resourceType?: string, deliveryType?: string): Promise<void> {
    ensureConfigured();
    try {
      const opts: Record<string, string> = {};
      if (resourceType) opts.resource_type = resourceType;
      if (deliveryType) opts.type = deliveryType;

      const res = await cloudinary.uploader.destroy(key, opts);

      // destroy returns { result: "ok" } on success, { result: "not found" } on miss — never throws
      if (res?.result !== "ok") {
        console.warn(
          `[cloudinary] destroy returned "${res?.result}" for key="${key}" resource_type="${resourceType ?? "image"}" type="${deliveryType ?? "upload"}"`,
        );
      }
    } catch (err) {
      // Network / auth errors — log but don't throw (non-blocking)
      console.warn("[cloudinary] Delete failed (non-blocking):", key, err);
    }
  }

  getUrl(key: string): string {
    ensureConfigured();
    return cloudinary.url(key, { secure: true });
  }

  getSignedUrl(key: string, resourceType: string, format: string, expiresInSec: number): string {
    ensureConfigured();
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSec;
    return cloudinary.utils.private_download_url(key, format, {
      resource_type: resourceType,
      type: "private",
      expires_at: expiresAt,
    });
  }

  async exists(key: string, resourceType?: string, deliveryType?: string): Promise<boolean> {
    ensureConfigured();
    try {
      await cloudinary.api.resource(key, {
        ...(resourceType ? { resource_type: resourceType } : {}),
        ...(deliveryType ? { type: deliveryType } : {}),
      });
      return true;
    } catch {
      return false;
    }
  }

  private buildPublicId(options: UploadOptions): string {
    const date = new Date().toISOString().slice(0, 10);
    const slug = options.originalName
      .replace(/\.[^.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50);
    // Add random suffix for signup-temp to prevent collision between concurrent signups
    if (options.companyId === "signup-temp") {
      const rand = Math.random().toString(36).slice(2, 8);
      return `${date}-${slug}-${rand}`;
    }
    return `${date}-${slug}`;
  }
}
