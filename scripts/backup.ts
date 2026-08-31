/**
 * CLI wrapper for the daily backup job.
 *
 * Usage:
 *   npm run backup                                    # uses .env.local
 *   npx tsx --env-file=.env.preprod scripts/backup.ts # uses .env.preprod
 *
 * The script awaits the full job result and exits with code 0 on success, 1 on failure.
 */
import { runBackupJob } from "@/services/backup.service";

async function main(): Promise<void> {
  console.log("=== MARKET-UP Backup CLI ===");
  console.log(`Date: ${new Date().toISOString()}`);
  console.log("");

  const result = await runBackupJob();

  console.log("");
  console.log("=== Job Result ===");

  if (result.backup) {
    console.log(`Backup: ${result.backup.database} (${result.backup.durationMs}ms)`);
    console.log(`  Collections: ${result.backup.collections.length}`);
    const totalDocs = result.backup.collections.reduce((sum, c) => sum + c.docsCopied, 0);
    console.log(`  Total documents copied: ${totalDocs}`);
    if (result.backup.warnings.length > 0) {
      console.log(`  Warnings: ${result.backup.warnings.join("; ")}`);
    }
  }

  if (result.retention.dropped.length > 0) {
    console.log(`Retention: dropped ${result.retention.dropped.join(", ")}`);
  } else {
    console.log("Retention: no expired databases.");
  }

  if (result.purge) {
    console.log(`Purge palier 1: found=${result.purge.palier1.found}, deleted=${result.purge.palier1.deleted}, files=${result.purge.palier1.filesDeleted}`);
    console.log(`Purge palier 2: found=${result.purge.palier2.found}, deleted=${result.purge.palier2.deleted}, files=${result.purge.palier2.filesDeleted}`);
  }

  if (result.signupTempPurge) {
    console.log(`Signup-temp purge: listed=${result.signupTempPurge.listed}, deleted=${result.signupTempPurge.deleted}, skipped=${result.signupTempPurge.skippedReferenced}, errors=${result.signupTempPurge.errors}`);
  }

  if (result.warnings.length > 0) {
    console.log("");
    console.warn(`=== Warnings (${result.warnings.length}) ===`);
    for (const w of result.warnings) {
      console.warn(`  ⚠ ${w}`);
    }
  }

  if (result.error) {
    console.error(`Error: ${result.error}`);
  }

  console.log(`\nOverall: ${result.success ? "SUCCESS" : "FAILED"}${result.warnings.length > 0 ? ` (with ${result.warnings.length} warning(s))` : ""}`);
  process.exit(result.success ? 0 : 1);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
