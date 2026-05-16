import { AppError } from "@/lib/api-error";

// ---------------------------------------------------------------------------
// Storage adapter interface
// ---------------------------------------------------------------------------

export type UploadCategory = "logos" | "banners" | "legal-docs" | "thumbnails";

export interface UploadOptions {
  companyId: string;
  category: UploadCategory;
  originalName: string;
  contentType: string;
}

export interface UploadResult {
  /** Storage key (e.g., "companies/abc/logos/2026-05-16-logo.jpg") */
  key: string;
  /** Public URL for serving the file */
  url: string;
  /** File size in bytes */
  size: number;
}

export interface StorageAdapter {
  upload(file: Buffer, options: UploadOptions): Promise<UploadResult>;
  delete(key: string): Promise<void>;
  getUrl(key: string): string;
  exists(key: string): Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Storage error
// ---------------------------------------------------------------------------

export class StorageError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("STORAGE_ERROR", message, 500, details);
  }
}
