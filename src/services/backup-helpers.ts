import type { Document } from "mongodb";

// Re-export storage helpers used by backup.service purgeOrphans guard
export { isSafeToDeleteUrl } from "@/lib/storage/helpers";

// ---------------------------------------------------------------------------
// Pure helper functions for backup (no env or DB dependencies)
// Extracted so tests can import without triggering env.ts validation.
// ---------------------------------------------------------------------------

/** Rétention : nombre de jours de backups conservés. */
export const BACKUP_RETENTION_DAYS = 7;

/** Au-delà de ce seuil (documents par collection), lecture par curseur batché. */
export const BATCH_THRESHOLD_DOCS = 10_000;

/** Taille des batchs pour l'insertion par curseur. */
export const BATCH_SIZE = 1_000;

/** Regex stricte pour identifier les bases de backup dans la purge de rétention. */
export const BACKUP_DB_REGEX = /^backup_\d{8}$/;

/** Build the backup database name for a given date (UTC). */
export function buildBackupDbName(date: Date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `backup_${y}${m}${d}`;
}

/** Format a date as YYYY-MM-DD UTC for display. */
export function formatDateUTC(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Check if a backup database name is older than retentionDays from now. */
export function isBackupExpired(dbName: string, now: Date, retentionDays: number): boolean {
  const match = dbName.match(/^backup_(\d{4})(\d{2})(\d{2})$/);
  if (!match) return false;
  const backupDate = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  const cutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1_000);
  return backupDate < cutoff;
}



/**
 * Select orphan users for a given purge palier.
 * Palier 1: passwordHash absent, createdAt > 7 days.
 * Palier 2: passwordHash present, emailVerifiedAt absent, createdAt > 30 days.
 */
export function buildOrphanQuery(palier: 1 | 2, now: Date): Document {
  if (palier === 1) {
    const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1_000);
    return {
      passwordHash: null,
      deletedAt: null,
      createdAt: { $lt: cutoff },
    };
  }
  const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1_000);
  return {
    passwordHash: { $ne: null },
    emailVerifiedAt: null,
    deletedAt: null,
    createdAt: { $lt: cutoff },
  };
}

// Re-export from uri-utils (single source of truth — no env/DB dependencies)
export { extractMongoDbName } from "@/lib/uri-utils";

/**
 * Compute counter keys from a list of invoice numbers.
 *
 * Given invoiceNumbers like ["2025-00003", "2026-00001", "2025-00007", "2026-00012"],
 * returns a Map: { 2025 → 7, 2026 → 12 } (max seq per year).
 */
export function computeCountersFromInvoiceNumbers(invoiceNumbers: string[]): Map<number, number> {
  const maxByYear = new Map<number, number>();
  for (const num of invoiceNumbers) {
    if (!num) continue;
    const match = num.match(/^(\d{4})-(\d{5})$/);
    if (!match) continue;
    const year = Number(match[1]);
    const seq = Number(match[2]);
    const current = maxByYear.get(year) ?? 0;
    if (seq > current) {
      maxByYear.set(year, seq);
    }
  }
  return maxByYear;
}



