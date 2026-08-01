/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import mongoose, { Types } from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { RseReceipt } from "@/models/rse-receipt.model";

vi.mock("@/lib/db", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));

const RseReceiptModel = RseReceipt as any;

let replSet: MongoMemoryReplSet;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replSet.getUri());
  // Ensure partial unique index is created
  await RseReceiptModel.syncIndexes();
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  await replSet.stop();
}, 30_000);

afterEach(async () => {
  await RseReceiptModel.deleteMany({});
});

const companyA = new Types.ObjectId();
const companyB = new Types.ObjectId();
const assocId = new Types.ObjectId();

function makeReceipt(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    companyId: companyA,
    associationId: assocId,
    amount: 1000,
    donationDate: new Date("2026-06-01"),
    status: "pending",
    submittedAt: new Date(),
    ...overrides,
  };
}

describe("RseReceipt.receiptNumber", () => {
  it("creates receipt without receiptNumber (null by default)", async () => {
    const doc = await RseReceiptModel.create(makeReceipt());
    expect(doc.receiptNumber).toBeNull();
  });

  it("creates receipt with receiptNumber", async () => {
    const doc = await RseReceiptModel.create(makeReceipt({ receiptNumber: "REC-2026-0001" }));
    expect(doc.receiptNumber).toBe("REC-2026-0001");
  });

  it("allows multiple receipts with null receiptNumber (same company)", async () => {
    await RseReceiptModel.create(makeReceipt({ receiptNumber: null }));
    await RseReceiptModel.create(makeReceipt({ receiptNumber: null }));
    const count = await RseReceiptModel.countDocuments({ companyId: companyA });
    expect(count).toBe(2);
  });

  it("rejects duplicate receiptNumber for same company", async () => {
    await RseReceiptModel.create(makeReceipt({ receiptNumber: "DUP-001" }));
    await expect(
      RseReceiptModel.create(makeReceipt({ receiptNumber: "DUP-001" })),
    ).rejects.toThrow(/duplicate key|E11000/);
  });

  it("allows same receiptNumber for different companies", async () => {
    await RseReceiptModel.create(makeReceipt({ companyId: companyA, receiptNumber: "SHARED-001" }));
    const doc = await RseReceiptModel.create(makeReceipt({ companyId: companyB, receiptNumber: "SHARED-001" }));
    expect(doc.receiptNumber).toBe("SHARED-001");
  });
});

describe("Public DTO receiptNumber", () => {
  it("returns receiptNumber when set", async () => {
    const doc = await RseReceiptModel.create(makeReceipt({ receiptNumber: "PUB-001", status: "validated" }));
    const lean = await RseReceiptModel.findById(doc._id).lean();
    expect(lean.receiptNumber).toBe("PUB-001");
  });

  it("returns null when receiptNumber not set", async () => {
    const doc = await RseReceiptModel.create(makeReceipt({ receiptNumber: null, status: "validated" }));
    const lean = await RseReceiptModel.findById(doc._id).lean();
    expect(lean.receiptNumber).toBeNull();
  });
});
