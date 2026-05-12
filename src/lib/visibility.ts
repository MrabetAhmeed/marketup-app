import type { CompanyStatus, ProfileStatus } from "@/types";

/**
 * Computes whether a profile is publicly visible.
 *
 * Visibility is NEVER persisted in the database — it is derived
 * from the company status, profile status, isPublic flag, and
 * presence of pending modifications.
 *
 * A profile is visible iff:
 *   - The owning company is active (not suspended/deleted)
 *   - The profile itself is active (not pending/rejected/disabled)
 *   - The owner has not toggled it off (isPublic)
 *   - There are no pending modifications awaiting admin review
 *
 * @see CLAUDE.md §6.2
 */
export function isProfileVisible(
  profile: { status: ProfileStatus; isPublic: boolean; pendingData?: unknown | null },
  company: { status: CompanyStatus },
): boolean {
  return (
    company.status === "active" &&
    profile.status === "active" &&
    profile.isPublic === true &&
    profile.pendingData == null
  );
}
