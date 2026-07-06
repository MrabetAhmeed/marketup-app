import type { CompanyStatus, ProfileStatus } from "@/types";

/**
 * Computes whether a profile is publicly visible.
 *
 * Visibility is NEVER persisted in the database — it is derived
 * from company status, profile status, isPublic flag, and publishedAt.
 *
 * Matrice 4 cas (PP-11.5, retour client 30 juin 2026) :
 *
 *   Pré-condition : company.status === "active"
 *
 *   Cas 1 : profile.status === "disabled"                     → CACHÉ
 *   Cas 2 : profile.status === "incomplete"                   → CACHÉ
 *   Cas 3 : publishedAt renseigné (déjà validé au moins 1x)
 *           + isPublic === true
 *           + status ∈ ["active", "pending", "rejected"]      → VISIBLE (avec data, jamais pendingData)
 *   Cas 4 : publishedAt null (jamais validé)
 *           + status === "active" + isPublic === true          → VISIBLE
 *
 * Rationale : un profil déjà validé reste visible avec son ancienne
 * data pendant la review admin (QR codes, SEO, liens partagés).
 *
 * @see CLAUDE.md §6.2
 */
export function isProfileVisible(
  profile: {
    status: ProfileStatus;
    isPublic: boolean;
    publishedAt?: Date | string | null;
    pendingData?: unknown | null;
  },
  company: { status: CompanyStatus },
): boolean {
  // Pré-condition : company must be active
  if (company.status !== "active") return false;

  // Cas 1 & 2 : disabled / incomplete → always hidden
  if (profile.status === "disabled" || profile.status === "incomplete") {
    return false;
  }

  // isPublic must be true for any visibility
  if (!profile.isPublic) return false;

  // Cas 3 : already published at least once → visible even if pending/rejected
  if (profile.publishedAt != null) {
    return (
      profile.status === "active" ||
      profile.status === "pending" ||
      profile.status === "rejected"
    );
  }

  // Cas 4 : never published → only visible if active
  return profile.status === "active";
}
