/**
 * Extract the database name from a MongoDB connection URI.
 *
 * Supports all standard forms:
 *   - Multi-host:  mongodb://user:pass@h1:27017,h2:27017,h3:27017/dbname?opts
 *   - Multi-host without db: mongodb://user:pass@h1:27017,h2:27017,h3:27017?opts
 *   - Single host: mongodb://user:pass@host:27017/dbname?opts
 *   - Encoded password (%40 etc.) in userinfo — must not confuse the @ separator
 *
 * Also supports mongodb+srv:// URIs, but this form is NOT recommended in this
 * project (SRV resolution fails on some networks — see DEPLOY.md).
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
 * Check whether a destructive script (seed/reset) should be allowed to run.
 *
 * Two cumulative guards — both must pass:
 *   1. `allowDestructive` must be "true" (opt-in environment variable)
 *   2. The database name extracted from `uri` must NOT be in `protectedDatabases`
 *
 * Returns `{ allowed: true }` or `{ allowed: false, reason: "..." }`.
 * Pure function, no side effects.
 */
export function checkDestructiveGuards(opts: {
  uri: string;
  allowDestructive: string | undefined;
  protectedDatabases: string[];
}): { allowed: boolean; reason?: string } {
  // Guard 1: environment opt-in
  if (opts.allowDestructive !== "true") {
    return {
      allowed: false,
      reason: "ALLOW_DESTRUCTIVE_SEED is not set to \"true\".",
    };
  }

  // Guard 2: protected database name
  const dbName = extractMongoDbName(opts.uri);
  if (opts.protectedDatabases.includes(dbName)) {
    return {
      allowed: false,
      reason: `database "${dbName}" is in the protected list [${opts.protectedDatabases.join(", ")}].`,
    };
  }

  return { allowed: true };
}

/**
 * Validate an admin password for the production seed.
 *
 * Returns `{ valid: true }` or `{ valid: false, reason: "..." }`.
 * Pure function, no side effects.
 */
export function validateAdminPassword(
  password: string | undefined | null,
  minLength: number = 10,
): { valid: boolean; reason?: string } {
  if (password == null || password.length === 0) {
    return { valid: false, reason: "Password is empty." };
  }
  if (password.length < minLength) {
    return {
      valid: false,
      reason: `Password is too weak: got ${password.length} characters, minimum is ${minLength}.`,
    };
  }
  return { valid: true };
}
