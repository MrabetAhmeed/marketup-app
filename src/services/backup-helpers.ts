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

/**
 * Extract the database name from a MongoDB connection URI.
 *
 * Supports all standard forms:
 *   - Multi-host:  mongodb://user:pass@h1:27017,h2:27017,h3:27017/dbname?opts
 *   - Multi-host without db: mongodb://user:pass@h1:27017,h2:27017,h3:27017?opts
 *   - Single host: mongodb://user:pass@host:27017/dbname?opts
 *   - SRV:         mongodb+srv://user:pass@cluster.xxx.net/dbname?opts
 *   - Encoded password (%40 etc.) in userinfo — must not confuse the @ separator
 *
 * Returns "" if no database name is present (valid for BACKUP_MONGODB_URI).
 */
export function extractMongoDbName(uri: string): string {
  // Strip scheme
  let rest = uri.replace(/^mongodb(\+srv)?:\/\//, "");

  // Strip userinfo (user:pass@) — find the LAST @ before the first / or ?
  // This handles passwords with encoded @ (%40) since we look for literal @
  const authEnd = rest.lastIndexOf("@");
  if (authEnd !== -1) {
    rest = rest.slice(authEnd + 1);
  }

  // rest is now: host1:port,host2:port,.../dbname?opts
  //          or: host1:port,host2:port,...?opts
  //          or: host1:port,host2:port,...

  // Find the first / after the hosts — that starts the dbname
  const slashIdx = rest.indexOf("/");
  if (slashIdx === -1) {
    // No / at all → no database name
    return "";
  }

  // After the slash: dbname?opts or just dbname
  const afterSlash = rest.slice(slashIdx + 1);
  const qIdx = afterSlash.indexOf("?");
  const dbName = qIdx === -1 ? afterSlash : afterSlash.slice(0, qIdx);
  return dbName;
}

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



