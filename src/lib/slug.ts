/* eslint-disable @typescript-eslint/no-explicit-any */
import { Company } from "@/models/company.model";

/**
 * Generate a URL-safe slug from a display name.
 * Lowercase, ASCII, hyphenated, no special chars.
 */
export function generateSlug(displayName: string): string {
  return displayName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // remove non-alphanumeric
    .replace(/[\s_]+/g, "-") // spaces/underscores → hyphens
    .replace(/-+/g, "-") // collapse multiple hyphens
    .replace(/^-|-$/g, "") // trim leading/trailing hyphens
    || "company";
}

/**
 * Ensure slug uniqueness by appending a numeric suffix if needed.
 * e.g. "technofab-industries" → "technofab-industries-2"
 */
export async function ensureUniqueSlug(base: string): Promise<string> {
  let slug = base;
  let suffix = 2;

  while (await (Company as any).exists({ slug })) {
    slug = `${base}-${suffix}`;
    suffix++;
  }

  return slug;
}
