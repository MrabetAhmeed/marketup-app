// ---------------------------------------------------------------------------
// Storage helper functions — pure, no env/DB dependencies.
// Domain: Cloudinary URL parsing, resource_type, URL safety.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Single source of truth for parsing Cloudinary URLs.
//
// Cloudinary URLs come in two delivery types:
//   PUBLIC:  https://res.cloudinary.com/{cloud}/{resource_type}/upload/v{ver}/{public_id}.{ext}
//   PRIVATE: https://res.cloudinary.com/{cloud}/{resource_type}/private/s--{sig}--/v{ver}/{public_id}.{ext}
//   PRIVATE (unsigned): https://res.cloudinary.com/{cloud}/{resource_type}/private/v{ver}/{public_id}.{ext}
//
// This regex captures both forms. All downstream functions use parseCloudinaryUrl().
// ---------------------------------------------------------------------------

interface CloudinaryUrlParts {
  resourceType: string;   // "image" or "raw"
  deliveryType: string;   // "upload" or "private"
  publicId: string;       // full path after version, with or without extension
  extension: string;      // file extension (without dot), e.g. "pdf", "jpg"
}

/**
 * Parse a Cloudinary URL into its components.
 * Returns null for non-Cloudinary URLs (including /shared/ paths, local paths, etc.).
 */
export function parseCloudinaryUrl(url: string): CloudinaryUrlParts | null {
  // Must be a full Cloudinary CDN URL
  if (!url.includes("res.cloudinary.com")) return null;

  // Match: /{resourceType}/{deliveryType}/[s--xxx--/]v{digits}/{path}
  const match = url.match(
    /\/(image|raw)\/(upload|private)\/(?:s--[^/]+--\/)?v\d+\/(.+)$/,
  );
  if (!match) return null;

  const resourceType = match[1]!;
  const deliveryType = match[2]!;
  const fullPath = match[3]!;

  // Extract extension
  const extMatch = fullPath.match(/\.([a-zA-Z0-9]+)$/);
  const extension = extMatch ? extMatch[1]!.toLowerCase() : "";

  return { resourceType, deliveryType, publicId: fullPath, extension };
}

/**
 * Determine the Cloudinary resource_type from a URL.
 * Detects both /raw/upload/ and /raw/private/ patterns.
 * Defaults to "image" for non-Cloudinary or image URLs.
 */
export function deduceResourceType(url: string): string {
  const parts = parseCloudinaryUrl(url);
  return parts?.resourceType === "raw" ? "raw" : "image";
}

/**
 * Check if a URL is safe to delete from remote storage.
 * Must be non-null, non-empty, not a /shared/ seed asset, and point to a remote host.
 */
export function isSafeToDeleteUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  if (url.includes("/shared/")) return false;
  return url.startsWith("https://") || url.startsWith("http://");
}

/**
 * Extract the Cloudinary public_id from a full Cloudinary URL.
 *
 * Supports public (/upload/) and private (/private/, /private/s--xxx--/) URLs.
 * Returns null for non-Cloudinary URLs (including /shared/ paths).
 * For images, strips the file extension (Cloudinary API expects no extension).
 * For raw files (PDF), keeps the extension.
 */
export function extractPublicIdFromUrl(url: string): string | null {
  const parts = parseCloudinaryUrl(url);
  if (!parts) return null;
  if (parts.resourceType === "raw") {
    return parts.publicId;
  }
  // Images: strip extension
  return parts.publicId.replace(/\.[^.]+$/, "");
}

/**
 * Deduce the file format from a Cloudinary URL's extension.
 * Used by getSignedUrl to pass the correct format to private_download_url.
 * Returns "" if no extension is found.
 */
export function deduceFormatFromUrl(url: string): string {
  const parts = parseCloudinaryUrl(url);
  return parts?.extension ?? "";
}

/** Signed URL expiration for identity documents (10 minutes). */
export const IDENTITY_DOC_SIGNED_URL_EXPIRES_SEC = 10 * 60;

/**
 * Generate a signed URL for an identity document.
 * Returns the original URL unchanged if:
 *   - URL is null/empty
 *   - URL is a /shared/ seed path
 *   - URL is not a Cloudinary URL (no public_id extractable)
 *   - Signing fails (returns original URL + logs warning)
 */
export function signIdentityDocUrl(
  storage: { getSignedUrl: (key: string, resourceType: string, format: string, expiresInSec: number) => string },
  url: string | null | undefined,
): string | null {
  if (!url) return null;
  if (url.includes("/shared/") || (!url.startsWith("https://") && !url.startsWith("http://"))) return url;
  const publicId = extractPublicIdFromUrl(url);
  if (!publicId) return url;
  try {
    const resourceType = deduceResourceType(url);
    const format = deduceFormatFromUrl(url);
    return storage.getSignedUrl(publicId, resourceType, format, IDENTITY_DOC_SIGNED_URL_EXPIRES_SEC);
  } catch (err) {
    console.warn("[storage] Failed to generate signed URL, returning original:", err);
    return url;
  }
}

/**
 * Convenience: safely delete a file from storage given its full URL.
 * Handles all guards: null/empty, /shared/, non-Cloudinary, resource_type deduction.
 * Returns true if deletion was attempted, false if skipped.
 */
export async function safeDeleteByUrl(
  storage: { delete: (key: string, resourceType?: string, deliveryType?: string) => Promise<void> },
  url: string | null | undefined,
): Promise<boolean> {
  if (!isSafeToDeleteUrl(url)) return false;
  const parts = parseCloudinaryUrl(url!);
  if (!parts) return false;
  const publicId = parts.resourceType === "raw"
    ? parts.publicId
    : parts.publicId.replace(/\.[^.]+$/, "");
  await storage.delete(publicId, parts.resourceType, parts.deliveryType);
  return true;
}

/**
 * Check if a Cloudinary raw URL is a PDF that needs .pdf extension appended
 * for browser inline viewing. Supports both /raw/upload/ and /raw/private/ URLs.
 */
export function isCloudinaryRawWithoutExtension(url: string): boolean {
  const parts = parseCloudinaryUrl(url);
  if (!parts) return false;
  if (parts.resourceType !== "raw") return false;
  if (parts.extension) return false; // already has extension
  return true;
}
