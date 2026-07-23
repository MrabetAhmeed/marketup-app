/**
 * Session validity checks — extracted for testability.
 *
 * Called from the NextAuth jwt() callback on every authenticated request.
 * Returns true if the session should be INVALIDATED.
 *
 * Two independent checks:
 * 1. Password changed after token was issued → invalidate (all other sessions die)
 * 2. Company suspended or deleted → invalidate (S8 fix)
 */

import type { CompanyStatus } from "@/types";

/**
 * Check if a session should be invalidated based on passwordChangedAt vs token iat.
 *
 * @param passwordChangedAt - Date the password was last changed (null = never changed)
 * @param tokenIat - JWT `iat` claim in seconds since epoch (set by NextAuth v4)
 * @returns true if the session should be killed
 */
export function isSessionInvalidatedByPasswordChange(
  passwordChangedAt: Date | null | undefined,
  tokenIat: number | undefined,
): boolean {
  if (!passwordChangedAt || tokenIat == null) return false;
  // passwordChangedAt is ms, iat is seconds — convert to same unit
  // Strict >: if changed in the same second as token issue, keep the session
  // (the device that just changed the password gets a fresh token via signIn)
  const changedAtSeconds = Math.floor(passwordChangedAt.getTime() / 1000);
  return changedAtSeconds > tokenIat;
}

/**
 * Check if a session should be invalidated based on company status (S8).
 *
 * @param companyStatus - Current company status from DB
 * @returns true if the session should be killed
 */
export function isSessionInvalidatedByCompanyStatus(
  companyStatus: CompanyStatus | null | undefined,
): boolean {
  if (!companyStatus) return false;
  return companyStatus === "suspended" || companyStatus === "deleted";
}
