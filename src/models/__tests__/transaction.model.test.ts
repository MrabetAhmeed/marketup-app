/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { Types } from "mongoose";
import { Transaction } from "@/models";
import { setupMongoMemory, clearCollections } from "./_helpers";

let teardown: () => Promise<void>;

beforeAll(async () => {
  teardown = await setupMongoMemory();
});
afterAll(async () => {
  await teardown();
});
afterEach(async () => {
  await clearCollections();
});

describe("Transaction model", () => {
  it("stores priceHT and vatRate, has NO priceTTC or vatAmount field", async () => {
    const doc = await Transaction.create({
      companyId: new Types.ObjectId(),
      type: "boost",
      profileKind: "brandup",
      priceHT: 50,
      vatRate: 0.19,
      currency: "DT",
      status: "paid",
      paidAt: new Date(),
      paymentMethod: "card",
    });

    const reloaded = await (Transaction as any).findById(doc!._id).lean();
    expect(reloaded!.priceHT).toBe(50);
    expect(reloaded!.vatRate).toBe(0.19);
    expect(reloaded!.currency).toBe("DT");

    // priceTTC and vatAmount must NOT exist in the document
    const keys = Object.keys(reloaded!);
    expect(keys).not.toContain("priceTTC");
    expect(keys).not.toContain("vatAmount");
  });

  it("idempotencyKey is sparse — multiple transactions without it coexist", async () => {
    const base = {
      companyId: new Types.ObjectId(),
      type: "boost" as const,
      profileKind: "brandup" as const,
      priceHT: 50,
      vatRate: 0.19,
      status: "paid" as const,
    };

    // Insert 3 transactions without idempotencyKey — should not throw
    await Transaction.create({ ...base, paymentReference: "REF-1" });
    await Transaction.create({ ...base, paymentReference: "REF-2" });
    await Transaction.create({ ...base, paymentReference: "REF-3" });

    const all = await (Transaction as any).find({});
    expect(all).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// V1.2 F2 — states, pending activation, frozen fields, unique partial indexes
// ---------------------------------------------------------------------------

describe("Transaction model — F2", () => {
  const TransactionModel = Transaction as any;
  const DUPLICATE_KEY = 11000;

  function order(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      companyId: new Types.ObjectId(),
      type: "boost",
      profileKind: "brandup",
      priceHT: 900,
      vatRate: 0.19,
      status: "paid",
      ...overrides,
    };
  }

  it("does not build its indexes automatically (autoIndex off on this model)", () => {
    expect(TransactionModel.schema.options.autoIndex).toBe(false);
  });

  it("syncIndexes still builds the declared indexes", async () => {
    const names = (await TransactionModel.collection.indexes()).map((i: { name: string }) => i.name).sort();
    expect(names).toEqual(
      [
        "_id_",
        "companyId_1",
        "companyId_1_paidAt_-1",
        "deletedAt_1",
        "company_idempotencyKey_unique",
        "pending_boost_unique",
        "pending_sponsoring_unique",
      ].sort(),
    );
  });

  it("accepts the expired status and rejects an unknown one", async () => {
    const doc = await TransactionModel.create(order({ status: "expired" }));
    expect(doc.status).toBe("expired");
    await expect(TransactionModel.create(order({ status: "cancelled" }))).rejects.toThrow();
  });

  it("defaults to no pending activation and no reason", async () => {
    const doc = await TransactionModel.create(order());
    const reloaded = await TransactionModel.findById(doc._id).lean();
    expect(reloaded.activationPending).toBe(false);
    expect(reloaded.activationPendingReason).toBeNull();
  });

  it("accepts each pending-activation reason and rejects an unknown one", async () => {
    const reasons = ["profile_ineligible", "amount_mismatch", "service_already_active", "company_suspended", "account_deleted"];
    for (const reason of reasons) {
      const doc = await TransactionModel.create(order({ activationPending: true, activationPendingReason: reason }));
      expect(doc.activationPendingReason).toBe(reason);
    }
    await expect(
      TransactionModel.create(order({ activationPending: true, activationPendingReason: "because" })),
    ).rejects.toThrow();
  });

  it("frozen fields are optional: absent on an order created without them", async () => {
    const doc = await TransactionModel.create(order());
    const reloaded = await TransactionModel.findById(doc._id).lean();
    expect(Object.keys(reloaded)).not.toContain("durationDays");
    expect(Object.keys(reloaded)).not.toContain("adapterEnvironment");
  });

  it("stores the frozen duration and adapter environment", async () => {
    const doc = await TransactionModel.create(order({ durationDays: 30, adapterEnvironment: "test" }));
    const reloaded = await TransactionModel.findById(doc._id).lean();
    expect(reloaded.durationDays).toBe(30);
    expect(reloaded.adapterEnvironment).toBe("test");
    await expect(TransactionModel.create(order({ adapterEnvironment: "staging" }))).rejects.toThrow();
  });

  it("refuses two pending boost orders for the same company and profile", async () => {
    const companyId = new Types.ObjectId();
    await TransactionModel.create(order({ companyId, status: "pending" }));
    await expect(TransactionModel.create(order({ companyId, status: "pending" }))).rejects.toMatchObject({
      code: DUPLICATE_KEY,
    });
  });

  it("allows two paid boost orders for the same company and profile", async () => {
    const companyId = new Types.ObjectId();
    await TransactionModel.create(order({ companyId, status: "paid" }));
    await TransactionModel.create(order({ companyId, status: "paid" }));
    expect(await TransactionModel.countDocuments({ companyId })).toBe(2);
  });

  it("allows a pending boost order next to paid ones, and on another profile", async () => {
    const companyId = new Types.ObjectId();
    await TransactionModel.create(order({ companyId, status: "paid" }));
    await TransactionModel.create(order({ companyId, status: "pending" }));
    await TransactionModel.create(order({ companyId, status: "pending", profileKind: "linkup" }));
    expect(await TransactionModel.countDocuments({ companyId })).toBe(3);
  });

  it("refuses two pending sponsoring orders for the same company and campaign", async () => {
    const companyId = new Types.ObjectId();
    const refId = new Types.ObjectId();
    await TransactionModel.create(order({ companyId, type: "sponsoring", refId, status: "pending" }));
    await expect(
      TransactionModel.create(order({ companyId, type: "sponsoring", refId, status: "pending" })),
    ).rejects.toMatchObject({ code: DUPLICATE_KEY });
  });

  it("allows pending sponsoring orders for two campaigns, and paid ones for the same campaign", async () => {
    const companyId = new Types.ObjectId();
    const refId = new Types.ObjectId();
    await TransactionModel.create(order({ companyId, type: "sponsoring", refId, status: "pending" }));
    await TransactionModel.create(order({ companyId, type: "sponsoring", refId: new Types.ObjectId(), status: "pending" }));
    await TransactionModel.create(order({ companyId, type: "sponsoring", refId, status: "paid" }));
    await TransactionModel.create(order({ companyId, type: "sponsoring", refId, status: "paid" }));
    expect(await TransactionModel.countDocuments({ companyId })).toBe(4);
  });

  it("refuses the same idempotency key twice for one company, and ignores orders without a key", async () => {
    const companyId = new Types.ObjectId();
    await TransactionModel.create(order({ companyId, idempotencyKey: "key-1" }));
    await expect(TransactionModel.create(order({ companyId, idempotencyKey: "key-1" }))).rejects.toMatchObject({
      code: DUPLICATE_KEY,
    });
    await TransactionModel.create(order({ companyId, idempotencyKey: null }));
    await TransactionModel.create(order({ companyId, idempotencyKey: null }));
    await TransactionModel.create(order({ companyId }));
    expect(await TransactionModel.countDocuments({ companyId, idempotencyKey: null })).toBe(3);
  });

  it("allows the same idempotency key for two different companies", async () => {
    await TransactionModel.create(order({ idempotencyKey: "shared-key" }));
    await TransactionModel.create(order({ idempotencyKey: "shared-key" }));
    expect(await TransactionModel.countDocuments({ idempotencyKey: "shared-key" })).toBe(2);
  });
});
