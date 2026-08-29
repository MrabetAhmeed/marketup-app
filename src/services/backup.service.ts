/* eslint-disable @typescript-eslint/no-explicit-any */
import { MongoClient, type Db, type Document } from "mongodb";
import { env } from "@/lib/env";
import { sendBackupFailedEmail } from "@/lib/email/sender";
import {
  BACKUP_RETENTION_DAYS,
  BATCH_THRESHOLD_DOCS,
  BATCH_SIZE,
  BACKUP_DB_REGEX,
  buildBackupDbName,
  formatDateUTC,
  isBackupExpired,
  deduceResourceType,
  isSafeToDeleteUrl,
  buildOrphanQuery,
  extractPublicIdFromUrl,
  extractMongoDbName,
} from "./backup-helpers";

// Re-export helpers and types for consumers
export {
  BACKUP_RETENTION_DAYS,
  BATCH_THRESHOLD_DOCS,
  BATCH_SIZE,
  BACKUP_DB_REGEX,
  buildBackupDbName,
  formatDateUTC,
  isBackupExpired,
  deduceResourceType,
  isSafeToDeleteUrl,
  buildOrphanQuery,
  extractPublicIdFromUrl,
  extractMongoDbName,
} from "./backup-helpers";

// ---------------------------------------------------------------------------
// Constants (service-internal)
// ---------------------------------------------------------------------------

/** Timeout de sécurité pour le flag running (2h). */
const RUNNING_TIMEOUT_MS = 2 * 60 * 60 * 1_000;

/**
 * Fuseau horaire : toutes les dates de backup sont en **UTC**.
 * Le planificateur Infomaniak doit être programmé à 2h UTC (= 3h Tunis)
 * pour exécuter le backup pendant les heures creuses.
 */
const META_DB_NAME = "marketup_backup_meta";
const META_COLLECTION = "runs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CollectionCopyResult {
  name: string;
  docsSource: number;
  docsCopied: number;
}

export interface BackupResult {
  success: boolean;
  database: string;
  collections: CollectionCopyResult[];
  durationMs: number;
  warnings: string[];
}

export interface PurgePalierResult {
  found: number;
  deleted: number;
  filesDeleted: number;
  fileErrors: number;
}

export interface PurgeResult {
  palier1: PurgePalierResult;
  palier2: PurgePalierResult;
}

export interface JobResult {
  success: boolean;
  backup: BackupResult | null;
  retention: { dropped: string[] };
  purge: PurgeResult | null;
  error?: string;
}

// ---------------------------------------------------------------------------
// Lock management (in marketup_backup_meta)
// ---------------------------------------------------------------------------

async function acquireLock(metaDb: Db): Promise<{ acquired: boolean; reason?: string }> {
  const coll = metaDb.collection(META_COLLECTION);
  const doc = await coll.findOne({ _id: "current" as any });

  if (doc?.running) {
    // Check timeout — a stale flag older than 2h is force-released
    const startedAt = doc.runningStartedAt instanceof Date ? doc.runningStartedAt : new Date(doc.runningStartedAt);
    if (Date.now() - startedAt.getTime() < RUNNING_TIMEOUT_MS) {
      return { acquired: false, reason: `Job already running since ${startedAt.toISOString()}` };
    }
    console.warn("[backup] Stale running flag detected (>2h), force-releasing.");
  }

  await coll.updateOne(
    { _id: "current" as any },
    { $set: { running: true, runningStartedAt: new Date() } },
    { upsert: true },
  );
  return { acquired: true };
}

async function releaseLock(metaDb: Db): Promise<void> {
  const coll = metaDb.collection(META_COLLECTION);
  await coll.updateOne(
    { _id: "current" as any },
    { $set: { running: false, runningStartedAt: null } },
  );
}

async function updateMetaTrace(metaDb: Db, result: JobResult): Promise<void> {
  const coll = metaDb.collection(META_COLLECTION);
  await coll.updateOne(
    { _id: "current" as any },
    {
      $set: {
        lastRun: {
          completedAt: new Date(),
          ...result,
        },
      },
    },
  );
}

// ---------------------------------------------------------------------------
// Backup logic
// ---------------------------------------------------------------------------

async function copyCollection(
  sourceDb: Db,
  targetDb: Db,
  collName: string,
): Promise<CollectionCopyResult> {
  const sourceColl = sourceDb.collection(collName);
  const targetColl = targetDb.collection(collName);
  const docsSource = await sourceColl.countDocuments();

  if (docsSource === 0) {
    return { name: collName, docsSource: 0, docsCopied: 0 };
  }

  let docsCopied = 0;

  if (docsSource <= BATCH_THRESHOLD_DOCS) {
    // Small collection: read all in memory
    const docs = await sourceColl.find().toArray();
    if (docs.length > 0) {
      await targetColl.insertMany(docs);
      docsCopied = docs.length;
    }
  } else {
    // Large collection: batched cursor
    const cursor = sourceColl.find();
    let batch: Document[] = [];

    for await (const doc of cursor) {
      batch.push(doc);
      if (batch.length >= BATCH_SIZE) {
        await targetColl.insertMany(batch);
        docsCopied += batch.length;
        batch = [];
      }
    }
    if (batch.length > 0) {
      await targetColl.insertMany(batch);
      docsCopied += batch.length;
    }
  }

  return { name: collName, docsSource, docsCopied };
}

async function runBackup(sourceClient: MongoClient, backupClient: MongoClient): Promise<BackupResult> {
  const start = Date.now();
  const dbName = buildBackupDbName();
  const warnings: string[] = [];

  // Source DB name from URI
  const sourceDbName = extractMongoDbName(env.MONGODB_URI);
  if (!sourceDbName) {
    throw new Error("Cannot extract database name from MONGODB_URI");
  }

  const sourceDb = sourceClient.db(sourceDbName);
  const targetDb = backupClient.db(dbName);

  // Anti-double-exécution: drop target if it exists
  const existingDbs = await backupClient.db("admin").admin().listDatabases();
  const targetExists = existingDbs.databases.some((d: { name: string }) => d.name === dbName);
  if (targetExists) {
    console.log(`[backup] Database ${dbName} already exists, dropping before re-copy.`);
    await targetDb.dropDatabase();
  }

  // List source collections (excluding system collections)
  const collections = (await sourceDb.listCollections().toArray())
    .map((c) => c.name)
    .filter((name) => !name.startsWith("system."));

  console.log(`[backup] Copying ${collections.length} collections to ${dbName}...`);

  const results: CollectionCopyResult[] = [];
  for (const collName of collections) {
    const result = await copyCollection(sourceDb, targetDb, collName);
    results.push(result);
    console.log(`[backup]   ${collName}: ${result.docsCopied}/${result.docsSource} docs`);
  }

  // Validation post-copie: compare counts
  for (const r of results) {
    if (r.docsCopied !== r.docsSource) {
      const msg = `Count mismatch on ${r.name}: source=${r.docsSource}, copied=${r.docsCopied}`;
      warnings.push(msg);
      console.warn(`[backup] WARNING: ${msg}`);
    }
  }

  return {
    success: true,
    database: dbName,
    collections: results,
    durationMs: Date.now() - start,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Retention logic
// ---------------------------------------------------------------------------

async function runRetention(backupClient: MongoClient): Promise<{ dropped: string[] }> {
  const now = new Date();
  const adminDb = backupClient.db("admin").admin();
  const { databases } = await adminDb.listDatabases();

  const dropped: string[] = [];
  for (const db of databases) {
    // Match STRICTLY backup_YYYYMMDD — never touch marketup_backup_meta or anything else
    if (!BACKUP_DB_REGEX.test(db.name)) continue;
    if (isBackupExpired(db.name, now, BACKUP_RETENTION_DAYS)) {
      console.log(`[backup] Retention: dropping expired database ${db.name}`);
      await backupClient.db(db.name).dropDatabase();
      dropped.push(db.name);
    }
  }

  return { dropped };
}

// ---------------------------------------------------------------------------
// Purge orphan accounts
// ---------------------------------------------------------------------------

async function purgeOrphans(sourceClient: MongoClient): Promise<PurgeResult> {
  const sourceDbName = extractMongoDbName(env.MONGODB_URI);
  if (!sourceDbName) {
    throw new Error("Cannot extract database name from MONGODB_URI");
  }

  const db = sourceClient.db(sourceDbName);
  const now = new Date();

  const palier1 = await purgePalier(db, 1, now);
  const palier2 = await purgePalier(db, 2, now);

  return { palier1, palier2 };
}

async function purgePalier(db: Db, palier: 1 | 2, now: Date): Promise<PurgePalierResult> {
  const usersCol = db.collection("users");
  const companiesCol = db.collection("companies");
  const profilesCol = db.collection("profiles");
  const filesCol = db.collection("files");
  const notificationsCol = db.collection("notifications");

  const query = buildOrphanQuery(palier, now);
  const orphans = await usersCol.find(query).toArray();

  const result: PurgePalierResult = { found: orphans.length, deleted: 0, filesDeleted: 0, fileErrors: 0 };

  for (const user of orphans) {
    const userId = user._id;
    const companyId = user.companyId;

    // Re-check atomique (décliné par palier)
    const reCheckFilter: Document = palier === 1
      ? { _id: userId, passwordHash: null, deletedAt: null }
      : { _id: userId, emailVerifiedAt: null, deletedAt: null };

    const deleteUserResult = await usersCol.deleteOne(reCheckFilter);
    if (deleteUserResult.deletedCount === 0) {
      // State changed since query — skip this user entirely
      console.log(`[purge] Palier ${palier}: user ${userId} state changed, skipping.`);
      continue;
    }

    // Capture file URL from Company before deleting
    let identityDocUrl: string | null = null;
    if (companyId) {
      const company = await companiesCol.findOne({ _id: companyId });
      identityDocUrl = company?.identityDocumentUrl ?? null;

      // Delete Company
      await companiesCol.deleteOne({ _id: companyId });

      // Delete Profiles (may exist via ensureProfilesForCompany in forgotPassword flow)
      await profilesCol.deleteMany({ companyId });

      // Delete File records
      await filesCol.deleteMany({ ownerUserId: userId });

      // Delete Notifications
      await notificationsCol.deleteMany({ recipientId: userId });
    }

    result.deleted++;

    // Storage cleanup — last, best-effort
    if (isSafeToDeleteUrl(identityDocUrl)) {
      try {
        const { storage } = await import("@/lib/storage");
        const resourceType = deduceResourceType(identityDocUrl!);
        // Extract the Cloudinary public_id from the URL
        const publicId = extractPublicIdFromUrl(identityDocUrl!);
        if (publicId) {
          await storage.delete(publicId, resourceType);
          result.filesDeleted++;
        }
      } catch (err) {
        console.warn(`[purge] File delete failed (non-blocking): ${identityDocUrl}`, err);
        result.fileErrors++;
      }
    }
  }

  console.log(`[purge] Palier ${palier}: found=${result.found}, deleted=${result.deleted}, files=${result.filesDeleted}, fileErrors=${result.fileErrors}`);
  return result;
}

// ---------------------------------------------------------------------------
// Main job orchestrator
// ---------------------------------------------------------------------------

export async function runBackupJob(): Promise<JobResult> {
  console.log("[backup] === Job started ===");

  // Runtime guard: BACKUP_MONGODB_URI must be set
  if (!env.BACKUP_MONGODB_URI) {
    const error = "BACKUP_MONGODB_URI is not configured. Backup cannot run.";
    console.error(`[backup] ${error}`);
    return { success: false, backup: null, retention: { dropped: [] }, purge: null, error };
  }

  let backupClient: MongoClient | null = null;
  let sourceClient: MongoClient | null = null;
  let metaDb: Db | null = null;

  try {
    // Connect to backup cluster
    backupClient = new MongoClient(env.BACKUP_MONGODB_URI);
    await backupClient.connect();
    metaDb = backupClient.db(META_DB_NAME);

    // Acquire lock
    const lock = await acquireLock(metaDb);
    if (!lock.acquired) {
      console.warn(`[backup] ${lock.reason}`);
      return { success: false, backup: null, retention: { dropped: [] }, purge: null, error: lock.reason };
    }

    try {
      // Connect to source
      sourceClient = new MongoClient(env.MONGODB_URI);
      await sourceClient.connect();

      // 1. Backup
      console.log("[backup] Phase 1: Backup...");
      const backupResult = await runBackup(sourceClient, backupClient);
      console.log(`[backup] Backup complete: ${backupResult.database} (${backupResult.durationMs}ms)`);

      // 2. Retention (after successful backup)
      console.log("[backup] Phase 2: Retention...");
      const retentionResult = await runRetention(backupClient);
      if (retentionResult.dropped.length > 0) {
        console.log(`[backup] Retention: dropped ${retentionResult.dropped.length} expired databases`);
      }

      // 3. Purge orphans (only if backup succeeded — séquentiel strict)
      console.log("[backup] Phase 3: Purge orphans...");
      const purgeResult = await purgeOrphans(sourceClient);

      const jobResult: JobResult = {
        success: true,
        backup: backupResult,
        retention: retentionResult,
        purge: purgeResult,
      };

      // Update meta trace
      await updateMetaTrace(metaDb, jobResult);
      console.log("[backup] === Job completed successfully ===");
      return jobResult;
    } finally {
      // Release lock in finally — a crash must not block future runs
      if (metaDb) {
        try {
          await releaseLock(metaDb);
        } catch (err) {
          console.error("[backup] Failed to release lock:", err);
        }
      }
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[backup] Job FAILED:", errorMsg);

    // Update meta trace with failure (best-effort)
    if (metaDb) {
      try {
        await updateMetaTrace(metaDb, {
          success: false,
          backup: null,
          retention: { dropped: [] },
          purge: null,
          error: errorMsg,
        });
      } catch {
        console.error("[backup] Failed to update meta trace after error.");
      }
    }

    // Send alert email (best-effort)
    try {
      await sendBackupFailedEmail({
        error: errorMsg,
        date: formatDateUTC(new Date()),
      });
    } catch (emailErr) {
      console.error("[backup] Failed to send alert email:", emailErr);
    }

    return {
      success: false,
      backup: null,
      retention: { dropped: [] },
      purge: null,
      error: errorMsg,
    };
  } finally {
    // Close connections
    if (sourceClient) {
      try { await sourceClient.close(); } catch { /* ignore */ }
    }
    if (backupClient) {
      try { await backupClient.close(); } catch { /* ignore */ }
    }
  }
}

// ---------------------------------------------------------------------------
// Lock check (for route pre-flight)
// ---------------------------------------------------------------------------

export async function checkBackupCanStart(): Promise<{
  status: "started" | "skipped" | "error";
  reason?: string;
}> {
  if (!env.BACKUP_MONGODB_URI) {
    return { status: "error", reason: "BACKUP_MONGODB_URI is not configured" };
  }

  let backupClient: MongoClient | null = null;
  try {
    backupClient = new MongoClient(env.BACKUP_MONGODB_URI);
    await backupClient.connect();
    const metaDb = backupClient.db(META_DB_NAME);
    const coll = metaDb.collection(META_COLLECTION);
    const doc = await coll.findOne({ _id: "current" as any });

    if (doc?.running) {
      const startedAt = doc.runningStartedAt instanceof Date ? doc.runningStartedAt : new Date(doc.runningStartedAt);
      if (Date.now() - startedAt.getTime() < RUNNING_TIMEOUT_MS) {
        return { status: "skipped", reason: `Job already running since ${startedAt.toISOString()}` };
      }
      // Stale flag — will be force-released by runBackupJob
    }

    return { status: "started" };
  } catch (err) {
    return { status: "error", reason: err instanceof Error ? err.message : String(err) };
  } finally {
    if (backupClient) {
      try { await backupClient.close(); } catch { /* ignore */ }
    }
  }
}
