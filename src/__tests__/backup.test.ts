import { describe, it, expect } from "vitest";
import {
  buildBackupDbName,
  formatDateUTC,
  isBackupExpired,
  deduceResourceType,
  isSafeToDeleteUrl,
  buildOrphanQuery,
  extractPublicIdFromUrl,
  extractMongoDbName,
  computeCountersFromInvoiceNumbers,
  BACKUP_DB_REGEX,
} from "@/services/backup-helpers";

// ---------------------------------------------------------------------------
// buildBackupDbName
// ---------------------------------------------------------------------------

describe("buildBackupDbName", () => {
  it("formats date as backup_YYYYMMDD in UTC", () => {
    const date = new Date("2026-08-28T03:00:00Z");
    expect(buildBackupDbName(date)).toBe("backup_20260828");
  });

  it("pads single-digit month and day", () => {
    const date = new Date("2026-01-05T12:00:00Z");
    expect(buildBackupDbName(date)).toBe("backup_20260105");
  });

  it("uses UTC (midnight Tunis = previous day UTC if before midnight)", () => {
    // 2026-08-28 00:30 Tunis = 2026-08-27 23:30 UTC
    const date = new Date("2026-08-27T23:30:00Z");
    expect(buildBackupDbName(date)).toBe("backup_20260827");
  });
});

// ---------------------------------------------------------------------------
// formatDateUTC
// ---------------------------------------------------------------------------

describe("formatDateUTC", () => {
  it("returns YYYY-MM-DD", () => {
    expect(formatDateUTC(new Date("2026-03-15T10:00:00Z"))).toBe("2026-03-15");
  });
});

// ---------------------------------------------------------------------------
// BACKUP_DB_REGEX
// ---------------------------------------------------------------------------

describe("BACKUP_DB_REGEX", () => {
  it("matches valid backup database names", () => {
    expect(BACKUP_DB_REGEX.test("backup_20260828")).toBe(true);
    expect(BACKUP_DB_REGEX.test("backup_20261231")).toBe(true);
  });

  it("rejects marketup_backup_meta", () => {
    expect(BACKUP_DB_REGEX.test("marketup_backup_meta")).toBe(false);
  });

  it("rejects backup_ without 8 digits", () => {
    expect(BACKUP_DB_REGEX.test("backup_2026082")).toBe(false);
    expect(BACKUP_DB_REGEX.test("backup_202608281")).toBe(false);
    expect(BACKUP_DB_REGEX.test("backup_")).toBe(false);
  });

  it("rejects names with prefix/suffix", () => {
    expect(BACKUP_DB_REGEX.test("old_backup_20260828")).toBe(false);
    expect(BACKUP_DB_REGEX.test("backup_20260828_copy")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isBackupExpired
// ---------------------------------------------------------------------------

describe("isBackupExpired", () => {
  const now = new Date("2026-08-28T02:00:00Z");

  it("returns true for backups older than retention", () => {
    expect(isBackupExpired("backup_20260820", now, 7)).toBe(true);
    expect(isBackupExpired("backup_20260101", now, 7)).toBe(true);
  });

  it("returns false for recent backups", () => {
    expect(isBackupExpired("backup_20260822", now, 7)).toBe(false);
    expect(isBackupExpired("backup_20260828", now, 7)).toBe(false);
  });

  it("returns true for exactly 7 days + 2h (boundary)", () => {
    // backup_20260821 = Aug 21 00:00 UTC, now = Aug 28 02:00 UTC
    // cutoff = Aug 21 02:00 UTC → Aug 21 00:00 < cutoff → expired
    expect(isBackupExpired("backup_20260821", now, 7)).toBe(true);
  });

  it("returns false for backup from the cutoff day itself", () => {
    // now = Aug 28 02:00 UTC, retention = 7 days → cutoff = Aug 21 02:00
    // backup_20260822 = Aug 22 00:00 > cutoff → NOT expired
    expect(isBackupExpired("backup_20260822", now, 7)).toBe(false);
  });

  it("returns false for non-backup names", () => {
    expect(isBackupExpired("marketup_backup_meta", now, 7)).toBe(false);
    expect(isBackupExpired("something_else", now, 7)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// deduceResourceType
// ---------------------------------------------------------------------------

describe("deduceResourceType", () => {
  it("returns 'raw' for URLs with /raw/upload/", () => {
    expect(deduceResourceType(
      "https://res.cloudinary.com/cloud/raw/upload/v1234/marketup/companies/abc/legal-docs/2026-05-16-rne.pdf",
    )).toBe("raw");
  });

  it("returns 'image' for URLs with /image/upload/", () => {
    expect(deduceResourceType(
      "https://res.cloudinary.com/cloud/image/upload/v1234/marketup/companies/abc/logos/2026-05-16-logo.jpg",
    )).toBe("image");
  });

  it("returns 'image' for unknown URL patterns", () => {
    expect(deduceResourceType("https://example.com/file.jpg")).toBe("image");
  });
});

// ---------------------------------------------------------------------------
// extractPublicIdFromUrl
// ---------------------------------------------------------------------------

describe("extractPublicIdFromUrl", () => {
  it("extracts public_id for images (strips extension)", () => {
    expect(extractPublicIdFromUrl(
      "https://res.cloudinary.com/cloud/image/upload/v1234/marketup/companies/abc/logos/2026-05-16-logo.jpg",
    )).toBe("marketup/companies/abc/logos/2026-05-16-logo");
  });

  it("extracts public_id for raw/PDF (keeps extension)", () => {
    expect(extractPublicIdFromUrl(
      "https://res.cloudinary.com/cloud/raw/upload/v1234/marketup/companies/abc/legal-docs/2026-05-16-rne.pdf",
    )).toBe("marketup/companies/abc/legal-docs/2026-05-16-rne.pdf");
  });

  it("returns null for non-Cloudinary URLs", () => {
    expect(extractPublicIdFromUrl("https://example.com/file.jpg")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// isSafeToDeleteUrl
// ---------------------------------------------------------------------------

describe("isSafeToDeleteUrl", () => {
  it("returns true for remote Cloudinary URLs", () => {
    expect(isSafeToDeleteUrl("https://res.cloudinary.com/cloud/image/upload/v1/file.jpg")).toBe(true);
  });

  it("returns false for null/undefined/empty", () => {
    expect(isSafeToDeleteUrl(null)).toBe(false);
    expect(isSafeToDeleteUrl(undefined)).toBe(false);
    expect(isSafeToDeleteUrl("")).toBe(false);
  });

  it("returns false for /shared/ seed assets", () => {
    expect(isSafeToDeleteUrl("https://cdn.example.com/shared/logo.png")).toBe(false);
    expect(isSafeToDeleteUrl("/shared/default-banner.jpg")).toBe(false);
  });

  it("returns false for local paths", () => {
    expect(isSafeToDeleteUrl("/uploads/companies/abc/logos/file.jpg")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// buildOrphanQuery
// ---------------------------------------------------------------------------

describe("buildOrphanQuery", () => {
  const now = new Date("2026-08-28T02:00:00Z");

  it("palier 1: passwordHash null, older than 7 days", () => {
    const query = buildOrphanQuery(1, now);
    expect(query.passwordHash).toBeNull();
    expect(query.deletedAt).toBeNull();
    expect(query.createdAt.$lt).toBeInstanceOf(Date);
    // 7 days before now
    const expectedCutoff = new Date("2026-08-21T02:00:00Z");
    expect(query.createdAt.$lt.getTime()).toBe(expectedCutoff.getTime());
  });

  it("palier 2: passwordHash present, emailVerifiedAt null, older than 30 days", () => {
    const query = buildOrphanQuery(2, now);
    expect(query.passwordHash).toEqual({ $ne: null });
    expect(query.emailVerifiedAt).toBeNull();
    expect(query.deletedAt).toBeNull();
    // 30 days before now
    const expectedCutoff = new Date("2026-07-29T02:00:00Z");
    expect(query.createdAt.$lt.getTime()).toBe(expectedCutoff.getTime());
  });
});

// ---------------------------------------------------------------------------
// extractMongoDbName
// ---------------------------------------------------------------------------

describe("extractMongoDbName", () => {
  it("multi-host with db name (project real form)", () => {
    expect(extractMongoDbName(
      "mongodb://appuser:s3cret@host-shard-00-00.abc.mongodb.net:27017,host-shard-00-01.abc.mongodb.net:27017,host-shard-00-02.abc.mongodb.net:27017/marketup_dev?ssl=true&replicaSet=atlas-xyz&authSource=admin",
    )).toBe("marketup_dev");
  });

  it("multi-host with db name AND options (real project URI)", () => {
    expect(extractMongoDbName(
      "mongodb://user:pass@h0.net:27017,h1.net:27017,h2.net:27017/my_database?ssl=true&replicaSet=rs0&authSource=admin&appName=marketup",
    )).toBe("my_database");
  });

  it("multi-host WITHOUT db name (BACKUP_MONGODB_URI form)", () => {
    expect(extractMongoDbName(
      "mongodb://backup:pass@h0.net:27017,h1.net:27017,h2.net:27017?ssl=true&replicaSet=rs0&authSource=admin",
    )).toBe("");
  });

  it("single host with db name", () => {
    expect(extractMongoDbName(
      "mongodb://user:pass@localhost:27017/testdb",
    )).toBe("testdb");
  });

  it("+srv with db name", () => {
    expect(extractMongoDbName(
      "mongodb+srv://user:pass@cluster0.abc.mongodb.net/marketup_prod?retryWrites=true&w=majority",
    )).toBe("marketup_prod");
  });

  it("multi-host without options and without db name", () => {
    expect(extractMongoDbName(
      "mongodb://user:pass@h0.net:27017,h1.net:27017",
    )).toBe("");
  });

  it("password with encoded @ (%40) does not confuse the parser", () => {
    expect(extractMongoDbName(
      "mongodb://admin:p%40ssw0rd@h0.net:27017,h1.net:27017,h2.net:27017/mydb?ssl=true",
    )).toBe("mydb");
  });
});

// ---------------------------------------------------------------------------
// computeCountersFromInvoiceNumbers
// ---------------------------------------------------------------------------

describe("computeCountersFromInvoiceNumbers", () => {
  it("computes max seq per year from mixed years", () => {
    const result = computeCountersFromInvoiceNumbers([
      "2025-00003",
      "2026-00001",
      "2025-00007",
      "2026-00012",
      "2025-00001",
      "2026-00005",
    ]);
    expect(result.get(2025)).toBe(7);
    expect(result.get(2026)).toBe(12);
    expect(result.size).toBe(2);
  });

  it("handles a single year", () => {
    const result = computeCountersFromInvoiceNumbers([
      "2026-00001",
      "2026-00019",
      "2026-00004",
    ]);
    expect(result.get(2026)).toBe(19);
    expect(result.size).toBe(1);
  });

  it("returns empty map for no invoice numbers", () => {
    const result = computeCountersFromInvoiceNumbers([]);
    expect(result.size).toBe(0);
  });

  it("skips null/undefined/empty strings", () => {
    const result = computeCountersFromInvoiceNumbers([
      "",
      "2026-00005",
    ]);
    expect(result.get(2026)).toBe(5);
    expect(result.size).toBe(1);
  });

  it("skips malformed invoice numbers", () => {
    const result = computeCountersFromInvoiceNumbers([
      "not-a-number",
      "2026-0001",        // only 4 digits (needs 5)
      "26-00001",         // only 2-digit year
      "2026-00003",       // valid
    ]);
    expect(result.get(2026)).toBe(3);
    expect(result.size).toBe(1);
  });

  it("handles three years in one batch", () => {
    const result = computeCountersFromInvoiceNumbers([
      "2024-00010",
      "2025-00020",
      "2026-00030",
    ]);
    expect(result.get(2024)).toBe(10);
    expect(result.get(2025)).toBe(20);
    expect(result.get(2026)).toBe(30);
    expect(result.size).toBe(3);
  });
});
