import * as readline from "node:readline";
import mongoose from "mongoose";
import { extractMongoDbName, checkDestructiveGuards } from "@/lib/uri-utils";

// Databases where destructive scripts must NEVER run
const PROTECTED_DATABASES = ["marketup_prod", "preprod"];

async function main(): Promise<void> {
  // Load env
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ MONGODB_URI not set. Copy .env.example to .env.local and fill it in.");
    process.exit(1);
  }

  // ── Cumulative guards (skip in test environment) ──
  if (process.env.NODE_ENV !== "test") {
    const guard = checkDestructiveGuards({
      uri,
      allowDestructive: process.env.ALLOW_DESTRUCTIVE_SEED,
      protectedDatabases: PROTECTED_DATABASES,
    });
    if (!guard.allowed) {
      console.error(`❌ Guard: ${guard.reason}`);
      console.error("   This script drops ALL collections. It must NEVER run against a protected database.");
      process.exit(1);
    }
  }

  const dbName = extractMongoDbName(uri);

  // Confirmation prompt (skip in test)
  if (process.env.NODE_ENV !== "test") {
    const confirmed = await confirm(`Drop ALL collections in "${dbName}"? (yes/no): `);
    if (!confirmed) {
      console.log("Aborted.");
      process.exit(0);
    }
  }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) {
    console.error("❌ Database connection not available.");
    process.exit(1);
  }

  const collections = await db.collections();
  for (const collection of collections) {
    try {
      await collection.drop();
    } catch (err: unknown) {
      // Silently ignore "namespace not found" (collection didn't exist)
      const code = (err as { code?: number }).code;
      if (code !== 26) throw err;
    }
  }

  console.log("✅ Database reset");
  await mongoose.disconnect();
  process.exit(0);
}

function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === "yes");
    });
  });
}

main().catch((err) => {
  console.error("❌ Reset failed:", err);
  process.exit(1);
});
