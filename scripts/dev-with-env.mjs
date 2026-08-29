/**
 * Launch `next dev` with variables from a custom .env file,
 * forcing NODE_ENV=development regardless of the file content.
 *
 * Usage:
 *   node scripts/dev-with-env.mjs .env.preprod
 *   node scripts/dev-with-env.mjs .env.staging
 *
 * Parsing: handles comments (#), blank lines, quoted values,
 * and values containing = (splits on first = only).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

// ---------------------------------------------------------------------------
// 1. Read and parse the env file
// ---------------------------------------------------------------------------

const envFile = process.argv[2];
if (!envFile) {
  console.error("Usage: node scripts/dev-with-env.mjs <env-file>");
  process.exit(1);
}

const envPath = resolve(envFile);
let content;
try {
  content = readFileSync(envPath, "utf-8");
} catch (err) {
  console.error(`Cannot read ${envPath}: ${err.message}`);
  process.exit(1);
}

const vars = {};
for (const line of content.split(/\r?\n/)) {
  const trimmed = line.trim();
  // Skip empty lines and comments
  if (!trimmed || trimmed.startsWith("#")) continue;

  // Split on first = only (values may contain =)
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;

  const key = trimmed.slice(0, eqIdx).trim();
  let value = trimmed.slice(eqIdx + 1).trim();

  // Strip surrounding quotes (single or double)
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  vars[key] = value;
}

// ---------------------------------------------------------------------------
// 2. Inject into process.env, then force NODE_ENV=development
// ---------------------------------------------------------------------------

Object.assign(process.env, vars);
process.env.NODE_ENV = "development";

// ---------------------------------------------------------------------------
// 3. Display target database identification (never the password or full URI)
// ---------------------------------------------------------------------------

const mongoUri = process.env.MONGODB_URI || "";
if (mongoUri) {
  // Extract db name: strip scheme, strip userinfo, find /dbname?...
  let rest = mongoUri.replace(/^mongodb(\+srv)?:\/\//, "");
  const atIdx = rest.lastIndexOf("@");
  if (atIdx !== -1) rest = rest.slice(atIdx + 1);
  // rest = hosts/dbname?opts
  const slashIdx = rest.indexOf("/");
  const dbName = slashIdx === -1
    ? "(none)"
    : (rest.slice(slashIdx + 1).split("?")[0] || "(none)");
  // Extract first host (before comma or slash)
  const host = rest.split(/[,/]/)[0] || "(unknown)";

  console.log("");
  console.log("=== dev-with-env ===");
  console.log(`  Env file : ${envFile}`);
  console.log(`  Database : ${dbName}`);
  console.log(`  Host     : ${host}`);
  console.log(`  NODE_ENV : development (forced)`);
  console.log("====================");
  console.log("");
}

// ---------------------------------------------------------------------------
// 4. Spawn next dev with full stdio inheritance
// ---------------------------------------------------------------------------

const nextBin = resolve("node_modules/next/dist/bin/next");
const child = spawn(process.execPath, [nextBin, "dev"], {
  stdio: "inherit",
  env: process.env,
});

// Propagate Ctrl+C: forward SIGINT/SIGTERM to child, then exit
function cleanup(signal) {
  child.kill(signal);
}
process.on("SIGINT", () => cleanup("SIGINT"));
process.on("SIGTERM", () => cleanup("SIGTERM"));

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
