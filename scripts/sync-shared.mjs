import { existsSync } from "node:fs";
import { rm, cp } from "node:fs/promises";
import { resolve } from "node:path";

const src = resolve("reference/mockups/shared");
const dest = resolve("public/shared");

if (!existsSync(src)) {
  console.error(`[sync-shared] Source not found: ${src}`);
  console.error("Run this script from the project root (where reference/ lives).");
  process.exit(1);
}

if (existsSync(dest)) {
  await rm(dest, { recursive: true, force: true });
}

await cp(src, dest, { recursive: true });
console.log("[sync-shared] public/shared/ synced from reference/mockups/shared/");
