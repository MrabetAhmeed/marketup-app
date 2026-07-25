/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * PP-15b Autonomous Audit Script — Corbeille admin + restauration
 * Run: MONGODB_URI=x NEXTAUTH_SECRET=x npx tsx scripts/check-pp15b.ts
 */
import * as dotenv from "dotenv";
import * as path from "node:path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import mongoose from "mongoose";
import { Company } from "../src/models/company.model";
import { User } from "../src/models/user.model";
import { Profile } from "../src/models/profile.model";
import "../src/models/profile-brandup.model";
import "../src/models/profile-traceup.model";
import "../src/models/profile-linkup.model";
import { Transaction } from "../src/models/transaction.model";
import { Boost } from "../src/models/boost.model";
import { Sponsoring } from "../src/models/sponsoring.model";
import { RseReceipt } from "../src/models/rse-receipt.model";
import { Notification } from "../src/models/notification.model";
import { File as FileModel } from "../src/models/file.model";
import { restoreCompanyByAdmin, listDeletedCompanies, listAllCompanies } from "../src/services/admin-company.service";
import { MongoMemoryReplSet } from "mongodb-memory-server";

let replSet: MongoMemoryReplSet;
let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean): void {
  if (condition) { console.log(`  ✓ ${label}`); passed++; }
  else { console.error(`  ✗ ${label}`); failed++; }
}

async function createDeletedFixture(validatedAt: Date | null = new Date()): Promise<{
  companyId: string; userId: string; cascadeTs: Date;
}> {
  const now = new Date();
  const uid = new mongoose.Types.ObjectId();
  const company = await (Company as any).create({
    type: "B2B", status: "deleted",
    slug: `audit-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    legalId: `A${Date.now()}`, accountEmail: `a${Date.now()}@t.tn`,
    ownerUserId: uid,
    data: { displayName: { fr: "Audit Co" } },
    liveData: { sectorId: "mecanique", gouvernorat: "sousse", ville: "Sousse", contactEmail: "a@t.tn" },
    registeredAt: new Date("2026-01-01"), validatedAt, deletedAt: now,
  });
  await (User as any).create({ _id: uid, firstName: "A", lastName: "U", email: `a${Date.now()}@t.tn`, passwordHash: "h", companyId: company._id, deletedAt: now });
  await (Profile as any).create({ companyId: company._id, kind: "brandup", status: "rejected", isPublic: true, stats: { viewsTotal: 0, views30d: 0, clicksTotal: 0 }, data: {}, deletedAt: now });
  await (Transaction as any).create({ companyId: company._id, type: "boost", priceHT: 1, vatRate: 0.19, status: "pending", deletedAt: now });
  await (Boost as any).create({ companyId: company._id, profileKind: "brandup", status: "active", from: new Date(), to: new Date(), deletedAt: now });
  await (Sponsoring as any).create({ companyId: company._id, profileKind: "brandup", status: "active", from: new Date(), to: new Date(), deletedAt: now });
  await (RseReceipt as any).create({ companyId: company._id, associationId: new mongoose.Types.ObjectId(), amount: 1, donationDate: new Date(), status: "pending", deletedAt: now });
  await (Notification as any).create({ recipientType: "owner", recipientId: uid, kind: "info", title: { fr: "t" }, body: { fr: "b" }, deletedAt: now });
  await (FileModel as any).create({ ownerUserId: uid, key: "f.png", url: "u", mimeType: "image/png", size: 1, purpose: "logo", deletedAt: now });
  return { companyId: company._id.toString(), userId: uid.toString(), cascadeTs: now };
}

async function run(): Promise<void> {
  console.log("PP-15b Autonomous Audit\n");
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replSet.getUri());
  (globalThis as any)._mongoosePromise = Promise.resolve(mongoose);

  // Pre-create collections
  const { companyId: initId } = await createDeletedFixture();
  const adminId = new mongoose.Types.ObjectId().toString();
  await restoreCompanyByAdmin(initId, adminId);
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) await collections[key]!.deleteMany({});

  // 1. Full cascade restore
  console.log("1. Full cascade restore (9 models):");
  const { companyId: cid1 } = await createDeletedFixture();
  await restoreCompanyByAdmin(cid1, adminId);
  const c1 = await (Company as any).findById(cid1).lean();
  assert("Company status=active", c1?.status === "active");
  assert("Company deletedAt=null", c1?.deletedAt == null);

  // 2. Profile status preserved
  console.log("\n2. Profile status preserved:");
  const p1 = await (Profile as any).findOne({ companyId: cid1 }).lean();
  assert("Profile status=rejected (preserved)", p1?.status === "rejected");
  assert("Profile deletedAt=null", p1?.deletedAt == null);

  // 3. E1: validatedAt null → pending
  console.log("\n3. E1 — validatedAt null → pending:");
  for (const key of Object.keys(collections)) await collections[key]!.deleteMany({});
  const { companyId: cid3 } = await createDeletedFixture(null);
  await restoreCompanyByAdmin(cid3, adminId);
  const c3 = await (Company as any).findById(cid3).lean();
  assert("Company restored as pending", c3?.status === "pending");

  // 4. Match exact timestamp
  console.log("\n4. Match exact — independent soft-delete not restored:");
  for (const key of Object.keys(collections)) await collections[key]!.deleteMany({});
  const oldTs = new Date("2025-01-01");
  const cascadeTs = new Date("2026-06-01");
  const uid4 = new mongoose.Types.ObjectId();
  const co4 = await (Company as any).create({ type: "B2B", status: "deleted", slug: `exact-${Date.now()}`, legalId: `E${Date.now()}`, accountEmail: `e${Date.now()}@t.tn`, ownerUserId: uid4, data: { displayName: { fr: "E" } }, liveData: { sectorId: "x", gouvernorat: "x", ville: "x", contactEmail: "x@x" }, registeredAt: new Date(), validatedAt: new Date(), deletedAt: cascadeTs });
  await (User as any).create({ _id: uid4, firstName: "E", lastName: "U", email: `e${Date.now()}@t.tn`, passwordHash: "h", companyId: co4._id, deletedAt: cascadeTs });
  const oldProfile = await (Profile as any).create({ companyId: co4._id, kind: "brandup", status: "disabled", isPublic: false, stats: { viewsTotal: 0, views30d: 0, clicksTotal: 0 }, data: {}, deletedAt: oldTs });
  const cascadeProfile = await (Profile as any).create({ companyId: co4._id, kind: "traceup", status: "active", isPublic: true, stats: { viewsTotal: 0, views30d: 0, clicksTotal: 0 }, data: {}, deletedAt: cascadeTs });
  await restoreCompanyByAdmin(co4._id.toString(), adminId);
  const oldP = await (Profile as any).findById(oldProfile._id).setOptions({ withDeleted: true }).lean();
  assert("Old profile still deleted", oldP?.deletedAt != null);
  const cascadeP = await (Profile as any).findById(cascadeProfile._id).lean();
  assert("Cascade profile restored", cascadeP?.deletedAt == null);

  // 5. Double restore → error
  console.log("\n5. Double restore → error:");
  let doubleErr = false;
  try { await restoreCompanyByAdmin(co4._id.toString(), adminId); }
  catch { doubleErr = true; }
  assert("Second restore throws error", doubleErr);

  // 6. List isolation
  console.log("\n6. List isolation:");
  for (const key of Object.keys(collections)) await collections[key]!.deleteMany({});
  await createDeletedFixture(); // deleted
  await (Company as any).create({ type: "B2B", status: "active", slug: `act-${Date.now()}`, legalId: `L${Date.now()}`, accountEmail: `l${Date.now()}@t.tn`, ownerUserId: new mongoose.Types.ObjectId(), data: { displayName: { fr: "Active" } }, liveData: { sectorId: "x", gouvernorat: "x", ville: "x", contactEmail: "x@x" }, registeredAt: new Date() });
  const deleted = await listDeletedCompanies("fr");
  const active = await listAllCompanies("fr");
  assert("listDeleted has 1 entry", deleted.length === 1);
  assert("listAll has 1 entry (active only)", active.length === 1);
  assert("listAll does not contain deleted", active.every((c) => c.status !== "deleted"));

  // Cleanup
  await mongoose.disconnect();
  await replSet.stop();
  console.log(`\n${"=".repeat(50)}`);
  console.log(`PP-15b Audit: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => { console.error("Audit failed:", err); process.exit(1); });
