import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { migrateOrderIndexes } from "@/lib/payment/order-index-migration";
import { TRANSACTION_INDEXES } from "@/models/transaction.indexes";
import type { Db } from "mongodb";

let mongod: MongoMemoryServer;
let connection: mongoose.Connection;
let dbCounter = 0;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { launchTimeout: 20_000 } });
  connection = await mongoose.createConnection(mongod.getUri()).asPromise();
}, 60_000);

afterAll(async () => {
  await connection.close();
  await mongod.stop();
});

/** A fresh database per test: no model is registered on this connection. */
function freshDb(): Db {
  dbCounter++;
  return connection.useDb(`f2_migration_${dbCounter}`).db as Db;
}

const EXPECTED_NAMES = TRANSACTION_INDEXES.map((i) => i.name).sort();

async function indexNames(db: Db): Promise<string[]> {
  const indexes = await db.collection("transactions").indexes();
  return indexes.map((i) => String(i.name)).filter((n) => n !== "_id_").sort();
}

/** The index set built by the application before F2. */
async function createPreF2Indexes(db: Db): Promise<void> {
  const orders = db.collection("transactions");
  await orders.createIndex({ companyId: 1 });
  await orders.createIndex({ deletedAt: 1 });
  await orders.createIndex({ companyId: 1, paidAt: -1 });
  await orders.createIndex({ idempotencyKey: 1 }, { sparse: true });
}

/** Demo-like orders: no idempotency key, several per company, paid or refunded. */
async function insertDemoOrders(db: Db): Promise<void> {
  const companyA = new mongoose.Types.ObjectId();
  const companyB = new mongoose.Types.ObjectId();
  const paid = (companyId: mongoose.Types.ObjectId, type: string, profileKind: string, status = "paid"): Record<string, unknown> => ({
    companyId,
    type,
    refId: null,
    profileKind,
    priceHT: type === "boost" ? 50 : 100,
    vatRate: 0.19,
    status,
    paymentMethod: "card",
    idempotencyKey: null,
    deletedAt: null,
  });
  await db.collection("transactions").insertMany([
    paid(companyA, "boost", "linkup"),
    paid(companyA, "boost", "linkup"),
    paid(companyA, "boost", "linkup"),
    paid(companyA, "sponsoring", "linkup"),
    paid(companyA, "sponsoring", "linkup"),
    paid(companyB, "boost", "brandup"),
    paid(companyB, "boost", "brandup", "refunded"),
    // A real purchase made before F2: string key, paid_simulated
    { ...paid(companyB, "boost", "traceup", "paid_simulated"), idempotencyKey: "boost-traceup-1759000000000" },
  ]);
}

function collect(): { lines: string[]; log: (line: string) => void } {
  const lines: string[] = [];
  return { lines, log: (line) => lines.push(line) };
}

describe("migrateOrderIndexes", () => {
  it("always prints the target database name first", async () => {
    const db = freshDb();
    const { lines, log } = collect();
    await migrateOrderIndexes(db, { apply: false, log });
    expect(lines[0]).toBe(`Base visée : ${db.databaseName}`);
    expect(lines.some((l) => l.includes("MONETIZATION_ENABLED"))).toBe(true);
  });

  it("without --apply: prints the plan and writes nothing", async () => {
    const db = freshDb();
    await createPreF2Indexes(db);
    await insertDemoOrders(db);
    const before = await indexNames(db);
    const collectionsBefore = (await db.listCollections().toArray()).map((c) => c.name).sort();

    const { lines, log } = collect();
    const result = await migrateOrderIndexes(db, { apply: false, log });

    expect(result.exitCode).toBe(0);
    expect(result.applied).toBe(false);
    expect(result.indexesToDrop).toEqual(["idempotencyKey_1"]);
    expect(result.indexesToCreate.sort()).toEqual(
      ["company_idempotencyKey_unique", "pending_boost_unique", "pending_sponsoring_unique"].sort(),
    );
    expect(result.collectionsToCreate.sort()).toEqual(["boosts", "sponsorings"]);
    expect(lines.some((l) => l.includes("aucune écriture"))).toBe(true);

    expect(await indexNames(db)).toEqual(before);
    expect((await db.listCollections().toArray()).map((c) => c.name).sort()).toEqual(collectionsBefore);
  });

  it("with --apply on demo-like data with the old index: succeeds and the old index is gone", async () => {
    const db = freshDb();
    await createPreF2Indexes(db);
    await insertDemoOrders(db);
    expect(await indexNames(db)).toContain("idempotencyKey_1");

    const result = await migrateOrderIndexes(db, { apply: true });

    expect(result.exitCode).toBe(0);
    expect(result.applied).toBe(true);
    expect(result.mismatches).toEqual([]);
    const after = await indexNames(db);
    expect(after).toEqual(EXPECTED_NAMES);
    expect(after).not.toContain("idempotencyKey_1");
    expect(await db.collection("transactions").countDocuments({})).toBe(8);

    const collections = (await db.listCollections().toArray()).map((c) => c.name);
    expect(collections).toEqual(expect.arrayContaining(["transactions", "boosts", "sponsorings"]));
  });

  it("the migrated indexes enforce uniqueness on pending orders only", async () => {
    const db = freshDb();
    await createPreF2Indexes(db);
    await insertDemoOrders(db);
    await migrateOrderIndexes(db, { apply: true });

    const orders = db.collection("transactions");
    const companyId = new mongoose.Types.ObjectId();
    const pending = { companyId, type: "boost", profileKind: "brandup", status: "pending", idempotencyKey: null };
    await orders.insertOne({ ...pending });
    await expect(orders.insertOne({ ...pending })).rejects.toMatchObject({ code: 11000 });
    await orders.insertOne({ ...pending, status: "paid" });
    await orders.insertOne({ ...pending, status: "paid" });
  });

  it("replayed: does nothing and says so", async () => {
    const db = freshDb();
    await createPreF2Indexes(db);
    await insertDemoOrders(db);
    await migrateOrderIndexes(db, { apply: true });

    const { lines, log } = collect();
    const second = await migrateOrderIndexes(db, { apply: true, log });

    expect(second.exitCode).toBe(0);
    expect(second.applied).toBe(false);
    expect(second.indexesToDrop).toEqual([]);
    expect(second.indexesToCreate).toEqual([]);
    expect(second.collectionsToCreate).toEqual([]);
    expect(lines.some((l) => l.startsWith("Rien à faire"))).toBe(true);
    expect(await indexNames(db)).toEqual(EXPECTED_NAMES);
  });

  it("refuses to run when a pending order exists, and writes nothing", async () => {
    const db = freshDb();
    await createPreF2Indexes(db);
    await insertDemoOrders(db);
    await db.collection("transactions").insertOne({
      companyId: new mongoose.Types.ObjectId(),
      type: "boost",
      profileKind: "brandup",
      status: "pending",
      idempotencyKey: null,
    });
    const before = await indexNames(db);

    const { lines, log } = collect();
    const result = await migrateOrderIndexes(db, { apply: true, log });

    expect(result.exitCode).toBe(1);
    expect(result.applied).toBe(false);
    expect(result.refusal).toContain("en attente");
    expect(lines.some((l) => l.startsWith("REFUS"))).toBe(true);
    expect(await indexNames(db)).toEqual(before);
  });

  it("on an empty database: creates the collections and the indexes", async () => {
    const db = freshDb();
    expect(await db.listCollections().toArray()).toEqual([]);

    const result = await migrateOrderIndexes(db, { apply: true });

    expect(result.exitCode).toBe(0);
    expect(result.collectionsToCreate.sort()).toEqual(["boosts", "sponsorings", "transactions"]);
    const collections = (await db.listCollections().toArray()).map((c) => c.name).sort();
    expect(collections).toEqual(["boosts", "sponsorings", "transactions"]);
    expect(await indexNames(db)).toEqual(EXPECTED_NAMES);
  });

  it("accepts the same idempotency key on two different companies", async () => {
    const db = freshDb();
    await createPreF2Indexes(db);
    const base = { type: "boost", profileKind: "brandup", status: "paid", idempotencyKey: "shared-key" };
    await db.collection("transactions").insertMany([
      { ...base, companyId: new mongoose.Types.ObjectId() },
      { ...base, companyId: new mongoose.Types.ObjectId() },
    ]);

    const result = await migrateOrderIndexes(db, { apply: true });

    expect(result.exitCode).toBe(0);
    expect(await indexNames(db)).toEqual(EXPECTED_NAMES);
  });

  it("refuses when one company has two orders with the same idempotency key, before dropping anything", async () => {
    const db = freshDb();
    await createPreF2Indexes(db);
    const base = { companyId: new mongoose.Types.ObjectId(), type: "boost", profileKind: "brandup", status: "paid" };
    await db.collection("transactions").insertMany([
      { ...base, idempotencyKey: "dup-key" },
      { ...base, idempotencyKey: "dup-key" },
    ]);

    const result = await migrateOrderIndexes(db, { apply: true });

    expect(result.exitCode).toBe(1);
    expect(result.refusal).toContain("dup-key");
    expect(await indexNames(db)).toContain("idempotencyKey_1");
  });

  it("refuses when an unexpected index is present, without touching it", async () => {
    const db = freshDb();
    await createPreF2Indexes(db);
    await db.collection("transactions").createIndex({ paymentReference: 1 }, { name: "manual_index" });

    const result = await migrateOrderIndexes(db, { apply: true });

    expect(result.exitCode).toBe(1);
    expect(result.refusal).toContain("manual_index");
    expect(await indexNames(db)).toContain("manual_index");
    expect(await indexNames(db)).toContain("idempotencyKey_1");
  });

  it("refuses when an expected index exists with another definition", async () => {
    const db = freshDb();
    // Same name as an expected index, different definition: not unique.
    await db.collection("transactions").createIndex({ companyId: 1, refId: 1 }, { name: "pending_sponsoring_unique" });

    const result = await migrateOrderIndexes(db, { apply: true });

    expect(result.exitCode).toBe(1);
    expect(result.refusal).toContain("pending_sponsoring_unique");
  });
});
