import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { checkBackupCanStart, runBackupJob } from "@/services/backup.service";

// ---------------------------------------------------------------------------
// GET /api/v1/cron/backup — Daily backup trigger (fire-and-forget)
//
// Auth: BACKUP_CRON_SECRET via Authorization header or ?secret= query param.
// Response: 202 started | 409 already running | 401 invalid secret | 500 config error.
// ---------------------------------------------------------------------------

function validateSecret(req: NextRequest): boolean {
  if (!env.BACKUP_CRON_SECRET) return false;

  // Mode 1: Authorization header
  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (token === env.BACKUP_CRON_SECRET) return true;
  }

  // Mode 2: Query parameter (used by Infomaniak webcron)
  const secretParam = req.nextUrl.searchParams.get("secret");
  if (secretParam === env.BACKUP_CRON_SECRET) return true;

  return false;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Guard: BACKUP_CRON_SECRET must be configured
  if (!env.BACKUP_CRON_SECRET) {
    console.error("[backup-route] Backup secret not configured.");
    return NextResponse.json(
      { status: "error", reason: "Backup not configured" },
      { status: 500 },
    );
  }

  // Guard: BACKUP_MONGODB_URI must be configured
  if (!env.BACKUP_MONGODB_URI) {
    console.error("[backup-route] BACKUP_MONGODB_URI not configured.");
    return NextResponse.json(
      { status: "error", reason: "Backup storage not configured" },
      { status: 500 },
    );
  }

  // Auth: validate secret — NEVER log the request URL (contains secret in query param)
  if (!validateSecret(req)) {
    console.warn("[backup-route] Invalid or missing secret.");
    return NextResponse.json(
      { status: "error", reason: "Unauthorized" },
      { status: 401 },
    );
  }

  // Pre-flight: check lock BEFORE responding 202
  const check = await checkBackupCanStart();
  if (check.status === "skipped") {
    return NextResponse.json(
      { status: "skipped", reason: check.reason },
      { status: 409 },
    );
  }
  if (check.status === "error") {
    console.error("[backup-route] Pre-flight error:", check.reason);
    return NextResponse.json(
      { status: "error", reason: check.reason },
      { status: 500 },
    );
  }

  const startedAt = new Date().toISOString();

  // Fire-and-forget: start the job, respond immediately
  runBackupJob().catch((err) => {
    console.error("[backup-route] Unhandled job error:", err);
  });

  return NextResponse.json(
    { status: "started", startedAt },
    { status: 202 },
  );
}
