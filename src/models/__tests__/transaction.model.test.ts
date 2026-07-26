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
