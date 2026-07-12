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
 * Checks both active slugs and slugHistory (reserved for 301 redirects).
 *
 * @param base - The candidate slug to check
 * @param excludeCompanyId - Optional company ID to exclude from the check
 *   (used during slug regeneration so the company's own slugHistory
 *   doesn't block a "retour interne" to a previous name)
 */
export async function ensureUniqueSlug(
  base: string,
  excludeCompanyId?: string,
): Promise<string> {
  let slug = base;
  let suffix = 2;

  const buildQuery = (candidate: string): Record<string, unknown> => {
    const filter: Record<string, unknown> = {
      $or: [{ slug: candidate }, { slugHistory: candidate }],
    };
    if (excludeCompanyId) {
      filter._id = { $ne: excludeCompanyId };
    }
    return filter;
  };

  while (await (Company as any).exists(buildQuery(slug))) {
    slug = `${base}-${suffix}`;
    suffix++;
  }

  return slug;
}
