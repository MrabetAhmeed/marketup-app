import { mkdir, writeFile, unlink, access } from "fs/promises";
import path from "path";
import { StorageError } from "./types";
import type { StorageAdapter, UploadOptions, UploadResult } from "./types";

// ---------------------------------------------------------------------------
// Local filesystem storage adapter
// ---------------------------------------------------------------------------

export class LocalStorageAdapter implements StorageAdapter {
  private basePath: string;

  constructor() {
    this.basePath = path.join(process.cwd(), "public", "uploads");
  }

  async upload(file: Buffer, options: UploadOptions): Promise<UploadResult> {
    const key = this.buildKey(options);
    const filePath = path.join(this.basePath, key);
    const dir = path.dirname(filePath);

    try {
      await mkdir(dir, { recursive: true });
      await writeFile(filePath, file);
    } catch (err) {
      throw new StorageError("Failed to write file to disk", {
        key,
        originalError: String(err),
      });
    }

    return {
      key,
      url: this.getUrl(key),
      size: file.length,
    };
  }

  async delete(key: string, _resourceType?: string, _deliveryType?: string): Promise<void> {
    const filePath = path.join(this.basePath, key);
    try {
      await unlink(filePath);
    } catch (err: unknown) {
      // Idempotent: silently succeed if file doesn't exist
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        throw new StorageError("Failed to delete file", {
          key,
          originalError: String(err),
        });
      }
    }
  }

  getUrl(key: string): string {
    // Next.js serves public/ at /
    return `/uploads/${key}`;
  }

  getSignedUrl(key: string, _resourceType: string, _format: string, _expiresInSec: number): string {
    // Local adapter: no signing, return direct URL
    return this.getUrl(key);
  }

  async exists(key: string, _resourceType?: string, _deliveryType?: string): Promise<boolean> {
    const filePath = path.join(this.basePath, key);
    try {
      await access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private buildKey(options: UploadOptions): string {
    const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const slug = this.slugify(options.originalName);
    const ext = this.extractExtension(options.originalName, options.contentType);
    return `companies/${options.companyId}/${options.category}/${date}-${slug}.${ext}`;
  }

  private slugify(name: string): string {
    const withoutExt = name.replace(/\.[^.]+$/, "");
    return withoutExt
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50);
  }

  private extractExtension(originalName: string, contentType: string): string {
    // Prefer extension from original filename
    const extMatch = originalName.match(/\.([a-zA-Z0-9]+)$/);
    if (extMatch) return extMatch[1]!.toLowerCase();

    // Fallback: derive from content type
    const mapping: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "application/pdf": "pdf",
    };
    return mapping[contentType] ?? "bin";
  }
}
