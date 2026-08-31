import type { StorageAdapter, UploadOptions, UploadResult } from "./types";

// ---------------------------------------------------------------------------
// Cloudflare R2 storage adapter — STUB for V1.1
//
// TODO (V1.1): Implement using @aws-sdk/client-s3 with R2-compatible endpoint.
// R2 is S3-compatible, so the implementation uses PutObjectCommand, DeleteObjectCommand, etc.
// Env vars needed: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
//                  R2_BUCKET_NAME, R2_ENDPOINT, R2_PUBLIC_URL
// ---------------------------------------------------------------------------

export class R2StorageAdapter implements StorageAdapter {
  async upload(_file: Buffer, _options: UploadOptions): Promise<UploadResult> {
    // TODO (V1.1): PutObjectCommand to R2 bucket
    throw new Error("[R2StorageAdapter] Not implemented — use STORAGE_ADAPTER=local for V1");
  }

  async delete(_key: string, _resourceType?: string, _deliveryType?: string): Promise<void> {
    // TODO (V1.1): DeleteObjectCommand
    throw new Error("[R2StorageAdapter] Not implemented — use STORAGE_ADAPTER=local for V1");
  }

  getUrl(_key: string): string {
    // TODO (V1.1): return `${env.R2_PUBLIC_URL}/${key}`
    throw new Error("[R2StorageAdapter] Not implemented — use STORAGE_ADAPTER=local for V1");
  }

  getSignedUrl(_key: string, _resourceType: string, _format: string, _expiresInSec: number): string {
    throw new Error("[R2StorageAdapter] Not implemented — use STORAGE_ADAPTER=local for V1");
  }

  async exists(_key: string, _resourceType?: string, _deliveryType?: string): Promise<boolean> {
    // TODO (V1.1): HeadObjectCommand
    throw new Error("[R2StorageAdapter] Not implemented — use STORAGE_ADAPTER=local for V1");
  }
}
