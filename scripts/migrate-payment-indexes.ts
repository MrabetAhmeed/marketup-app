/**
 * Migration of the payment order indexes (V1.2 F2).
 *
 * The Transaction model no longer builds its indexes at application start:
 * this script is the only way they are created on a real database.
 *
 * Usage:
 *   npm run db:migrate-payment-indexes               # simulation, writes nothing
 *   npm run db:migrate-payment-indexes -- --apply    # applies
 *
 *   Local, against the database of an env file:
 *   npx tsx --env-file=.env.local scripts/migrate-payment-indexes.ts [--apply]
 *
 * Safety:
 *   - Writes nothing without --apply
 *   - Always prints the target database name first
 *   - Replayable: a second run does nothing and says so
 *   - Refuses to run when a pending order exists
 *   - Re-reads the real index list after applying; exits 1 on any difference
 *
 * Procedure: run it with MONETIZATION_ENABLED off, before deploying.
 */

import mongoose from "mongoose";
import { migrateOrderIndexes } from "@/lib/payment/order-index-migration";

async function main(): Promise<number> {
  const args = process.argv.slice(2);
  const unknown = args.filter((a) => a !== "--apply");
  if (unknown.length > 0) {
    console.error(`Option inconnue : ${unknown.join(" ")}. Seule --apply est acceptée.`);
    return 1;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI not set.");
    return 1;
  }

  // Dedicated connection with no model registered on it: connecting creates nothing.
  const connection = await mongoose.createConnection(uri).asPromise();
  try {
    const db = connection.db;
    if (!db) {
      console.error("Connexion à la base indisponible.");
      return 1;
    }
    const result = await migrateOrderIndexes(db, {
      apply: args.includes("--apply"),
      log: (line) => console.log(`[migrate-payment-indexes] ${line}`),
    });
    return result.exitCode;
  } finally {
    await connection.close();
  }
}

main()
  .then((code) => process.exit(code))
  .catch((err: unknown) => {
    const reason = err instanceof Error ? err.message : "unknown error";
    console.error(`[migrate-payment-indexes] ÉCHEC : ${reason}`);
    process.exit(1);
  });
