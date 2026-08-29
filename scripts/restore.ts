/**
 * Restore a backup database to a target database.
 *
 * Usage:
 *   npm run restore                                     # dry-run (default)
 *   npm run restore -- --execute                        # actual restore
 *   npx tsx --env-file=.env.preprod scripts/restore.ts  # target a different env
 *
 * Protections (all cumulative):
 *   1. Dry-run by default — without --execute, shows what it would do and exits.
 *   2. RESTORE_ALLOWED=1 env var required.
 *   3. Interactive confirmation: type the exact target database name.
 *   4. Explicit display of source, target, doc counts before execution.
 *
 * The counters collection is NEVER restored. Invoice counters are recalculated
 * from the years present in the transactions collection.
 */
import { MongoClient } from "mongodb";
import * as readline from "readline";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BACKUP_URI = process.env.BACKUP_MONGODB_URI ?? "";
const TARGET_URI = process.env.MONGODB_URI ?? "";
const RESTORE_ALLOWED = process.env.RESTORE_ALLOWED === "1";
const EXECUTE = process.argv.includes("--execute");

// Collections to skip during restore
const SKIP_COLLECTIONS = new Set(["counters"]);

// All Mongoose model imports for syncIndexes
async function getAllModels(): Promise<{ name: string; model: { syncIndexes: () => Promise<void> } }[]> {
  // Import models individually (Counter and ProfileStatsMonthly are not in models/index.ts)
  const { Company } = await import("@/models/company.model");
  const { User } = await import("@/models/user.model");
  const { AdminUser } = await import("@/models/admin-user.model");
  const { Profile } = await import("@/models/profile.model");
  const { BrandUp } = await import("@/models/profile-brandup.model");
  const { TraceUp } = await import("@/models/profile-traceup.model");
  const { LinkUp } = await import("@/models/profile-linkup.model");
  const { Transaction } = await import("@/models/transaction.model");
  const { Boost } = await import("@/models/boost.model");
  const { Sponsoring } = await import("@/models/sponsoring.model");
  const { RseReceipt } = await import("@/models/rse-receipt.model");
  const { Notification } = await import("@/models/notification.model");
  const { Association } = await import("@/models/association.model");
  const { Sector } = await import("@/models/sector.model");
  const { Gouvernorat } = await import("@/models/gouvernorat.model");
  const { File } = await import("@/models/file.model");
  const { Counter } = await import("@/models/counter.model");
  const { ProfileStatsMonthlyModel } = await import("@/models/profile-stats-monthly.model");

  /* eslint-disable @typescript-eslint/no-explicit-any */
  return [
    { name: "Company", model: Company as any },
    { name: "User", model: User as any },
    { name: "AdminUser", model: AdminUser as any },
    { name: "Profile", model: Profile as any },
    { name: "BrandUp", model: BrandUp as any },
    { name: "TraceUp", model: TraceUp as any },
    { name: "LinkUp", model: LinkUp as any },
    { name: "Transaction", model: Transaction as any },
    { name: "Boost", model: Boost as any },
    { name: "Sponsoring", model: Sponsoring as any },
    { name: "RseReceipt", model: RseReceipt as any },
    { name: "Notification", model: Notification as any },
    { name: "Association", model: Association as any },
    { name: "Sector", model: Sector as any },
    { name: "Gouvernorat", model: Gouvernorat as any },
    { name: "File", model: File as any },
    { name: "Counter", model: Counter as any },
    { name: "ProfileStatsMonthly", model: ProfileStatsMonthlyModel as any },
  ];
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractDbName(uri: string): string {
  // Strip scheme
  let rest = uri.replace(/^mongodb(\+srv)?:\/\//, "");
  // Strip userinfo (find last literal @ before hosts)
  const authEnd = rest.lastIndexOf("@");
  if (authEnd !== -1) rest = rest.slice(authEnd + 1);
  // Find first / after hosts → dbname
  const slashIdx = rest.indexOf("/");
  if (slashIdx === -1) return "";
  const afterSlash = rest.slice(slashIdx + 1);
  const qIdx = afterSlash.indexOf("?");
  return qIdx === -1 ? afterSlash : afterSlash.slice(0, qIdx);
}

function askQuestion(prompt: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// ---------------------------------------------------------------------------
// Counter recalculation
// ---------------------------------------------------------------------------

async function recalculateCounters(targetClient: MongoClient, targetDbName: string): Promise<void> {
  const db = targetClient.db(targetDbName);
  const transactionsColl = db.collection("transactions");
  const countersColl = db.collection("counters");

  // Verify: counters collection should only contain invoice-{YYYY} keys
  const existingCounters = await countersColl.find().toArray();
  for (const counter of existingCounters) {
    const id = String(counter._id);
    if (!/^invoice-\d{4}$/.test(id)) {
      console.error(`[restore] DANGER: Found non-derivable counter key: ${id}`);
      console.error("[restore] This counter cannot be recalculated from transactions.");
      console.error("[restore] STOP — manual intervention required.");
      process.exit(1);
    }
  }

  // Read all invoiceNumbers from restored transactions
  const transactions = await transactionsColl
    .find({ invoiceNumber: { $exists: true, $ne: null } })
    .project({ invoiceNumber: 1 })
    .toArray();

  const invoiceNumbers = transactions.map((tx) => tx.invoiceNumber as string);

  // Use the pure helper to compute max seq per year
  const { computeCountersFromInvoiceNumbers } = await import("@/services/backup-helpers");
  const maxByYear = computeCountersFromInvoiceNumbers(invoiceNumbers);

  // Clear and recreate counters
  await countersColl.deleteMany({});
  for (const [year, maxSeq] of Array.from(maxByYear.entries())) {
    await countersColl.insertOne({ _id: `invoice-${year}` as any, seq: maxSeq });
    console.log(`[restore] Counter invoice-${year}: seq=${maxSeq}`);
  }

  // Post-recalcul verification: transactions exist but no counters → fatal error
  const txCount = await transactionsColl.countDocuments();
  if (txCount > 0 && maxByYear.size === 0) {
    console.error(`[restore] ERROR: ${txCount} transactions restored but no invoice counters could be derived.`);
    console.error("[restore] This means invoiceNumber is missing or in an unexpected format on all transactions.");
    console.error("[restore] The next invoice number will collide. Manual intervention required.");
    process.exit(1);
  }

  if (maxByYear.size === 0) {
    console.log("[restore] No transactions found — counters collection left empty.");
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log("=== MARKET-UP Restore ===");
  console.log(`Mode: ${EXECUTE ? "EXECUTE" : "DRY-RUN"}`);
  console.log("");

  // Protection 1: RESTORE_ALLOWED
  if (!RESTORE_ALLOWED) {
    console.error("RESTORE_ALLOWED=1 is not set. Aborting.");
    process.exit(1);
  }

  // Validate URIs
  if (!BACKUP_URI) {
    console.error("BACKUP_MONGODB_URI is not set. Aborting.");
    process.exit(1);
  }
  if (!TARGET_URI) {
    console.error("MONGODB_URI is not set. Aborting.");
    process.exit(1);
  }

  const targetDbName = extractDbName(TARGET_URI);
  if (!targetDbName) {
    console.error("Cannot extract database name from MONGODB_URI. Aborting.");
    process.exit(1);
  }

  // Connect to backup cluster and list available backups
  const backupClient = new MongoClient(BACKUP_URI);
  await backupClient.connect();

  const { databases } = await backupClient.db("admin").admin().listDatabases();
  const backupDbs = databases
    .map((d: { name: string }) => d.name)
    .filter((name: string) => /^backup_\d{8}$/.test(name))
    .sort()
    .reverse();

  if (backupDbs.length === 0) {
    console.error("No backup databases found on the backup cluster.");
    process.exit(1);
  }

  console.log("Available backups:");
  for (const db of backupDbs) {
    console.log(`  - ${db}`);
  }
  console.log("");

  // Ask which backup to restore
  const sourceDbName = await askQuestion("Enter the exact backup database name to restore from: ");
  if (!backupDbs.includes(sourceDbName)) {
    console.error(`"${sourceDbName}" is not a valid backup database.`);
    process.exit(1);
  }

  // Display what will happen
  const sourceDb = backupClient.db(sourceDbName);
  const sourceCollections = (await sourceDb.listCollections().toArray())
    .map((c) => c.name)
    .filter((name) => !name.startsWith("system."));

  console.log("");
  console.log("=== Restore Plan ===");
  console.log(`Source: ${sourceDbName} (backup cluster)`);
  console.log(`Target: ${targetDbName} (application database)`);
  console.log(`Collections: ${sourceCollections.length}`);
  console.log(`Skipped: ${Array.from(SKIP_COLLECTIONS).join(", ")} (recalculated after restore)`);
  console.log("");

  // Show doc counts per collection
  for (const coll of sourceCollections) {
    const count = await sourceDb.collection(coll).countDocuments();
    const skip = SKIP_COLLECTIONS.has(coll) ? " [SKIP]" : "";
    console.log(`  ${coll}: ${count} docs${skip}`);
  }
  console.log("");

  // WARNING about syncIndexes
  console.log("WARNING: syncIndexes() will be called after restore.");
  console.log("Indexes not defined in Mongoose schemas will be DROPPED.");
  console.log("If you have manually created indexes in Atlas, they will disappear.");
  console.log("");

  if (!EXECUTE) {
    console.log("DRY-RUN complete. To execute, run with --execute flag.");
    await backupClient.close();
    process.exit(0);
  }

  // Protection 3: Interactive confirmation
  const confirmation = await askQuestion(`Type "${targetDbName}" to confirm restore: `);
  if (confirmation !== targetDbName) {
    console.error("Confirmation failed. Aborting.");
    await backupClient.close();
    process.exit(1);
  }

  // Execute restore
  console.log("\n[restore] Starting restore...");
  const targetClient = new MongoClient(TARGET_URI);
  await targetClient.connect();
  const targetDb = targetClient.db(targetDbName);

  // Drop target collections that exist in source
  for (const collName of sourceCollections) {
    if (SKIP_COLLECTIONS.has(collName)) continue;
    try {
      await targetDb.collection(collName).drop();
      console.log(`[restore] Dropped target collection: ${collName}`);
    } catch {
      // Collection might not exist — that's fine
    }
  }

  // Copy collections from backup
  for (const collName of sourceCollections) {
    if (SKIP_COLLECTIONS.has(collName)) {
      console.log(`[restore] Skipping: ${collName}`);
      continue;
    }

    const docs = await sourceDb.collection(collName).find().toArray();
    if (docs.length > 0) {
      await targetDb.collection(collName).insertMany(docs);
    }
    console.log(`[restore] Restored: ${collName} (${docs.length} docs)`);
  }

  // Recalculate counters
  console.log("[restore] Recalculating counters...");
  await recalculateCounters(targetClient, targetDbName);

  // syncIndexes
  console.log("[restore] Running syncIndexes()...");
  try {
    // Connect mongoose for syncIndexes
    const mongoose = await import("mongoose");
    await mongoose.default.connect(TARGET_URI);
    const models = await getAllModels();
    for (const { name, model } of models) {
      try {
        await model.syncIndexes();
        console.log(`[restore] syncIndexes: ${name} OK`);
      } catch (err) {
        console.warn(`[restore] syncIndexes: ${name} failed:`, err);
      }
    }
    await mongoose.default.disconnect();
  } catch (err) {
    console.error("[restore] syncIndexes failed:", err);
  }

  // Cleanup
  await targetClient.close();
  await backupClient.close();

  console.log("\n=== Restore complete ===");
  console.log("REMINDER: Clear next-auth.* cookies in browser — stale JWT causes 401.");
  console.log("REMINDER: Restoration test should be planned monthly and traced.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
