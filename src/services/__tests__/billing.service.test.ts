/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { Types } from "mongoose";

vi.mock("@/lib/db", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/env", () => ({
  env: {
    NEXTAUTH_URL: "http://localhost:3000",
    MONETIZATION_ENABLED: true,
  },
}));

import { Transaction, Company } from "@/models";
import { Counter } from "@/models/counter.model";
import { getOwnerTransactions, getAdminTransactions } from "@/services/billing.service";
import { generateInvoiceNumber } from "@/lib/invoice";
import { setupMongoMemory, clearCollections } from "@/models/__tests__/_helpers";

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let companyCounter = 0;
// Return type is `any` because Company model has no exported TS interface —
// Mongoose infers a complex HydratedDocument type that fights with .lean() and
// the `as any` casts already used throughout this file. Revisit if Company
// gets a typed interface (ICompany).
async function makeCompany(overrides: Record<string, unknown> = {}): Promise<any> { // eslint-disable-line @typescript-eslint/no-explicit-any
  companyCounter++;
  return Company.create({
    slug: `test-co-${companyCounter}`,
    type: "B2B",
    legalId: `T${companyCounter}`,
    accountEmail: `test${companyCounter}@co.tn`,
    country: "TN",
    data: {
      displayName: { fr: "TestCo", ar: "", en: "" },
    },
    liveData: {
      sectorId: "mecanique",
      gouvernorat: "sousse",
      ville: "Sousse",
      address: "Test address",
      languages: ["fr"],
    },
    ownerUserId: new Types.ObjectId(),
    status: "active",
    registeredAt: new Date(),
    validatedAt: new Date(),
    ...overrides,
  } as any);
}

function makeTransaction(companyId: Types.ObjectId, overrides: Record<string, unknown> = {}) {
  return Transaction.create({
    companyId,
    type: "boost",
    profileKind: "brandup",
    priceHT: 50,
    vatRate: 0.19,
    currency: "DT",
    status: "paid",
    paidAt: new Date(),
    paymentMethod: "card",
    paymentReference: "REF-TEST",
    invoiceNumber: "2026-00001",
    ...overrides,
  } as any);
}

// ---------------------------------------------------------------------------
// getOwnerTransactions
// ---------------------------------------------------------------------------

describe("getOwnerTransactions", () => {
  it("returns transactions for the given company", async () => {
    const company = await makeCompany();
    await makeTransaction(company._id as Types.ObjectId);
    await makeTransaction(company._id as Types.ObjectId, { invoiceNumber: "2026-00002" });

    const result = await getOwnerTransactions(String(company._id));
    expect(result).toHaveLength(2);
    expect(result[0]!.priceHT).toBe(50);
    expect(result[0]!.vatAmount).toBeCloseTo(9.5);
    expect(result[0]!.priceTTC).toBeCloseTo(59.5);
    expect(result[0]!.currency).toBe("DT");
  });

  it("maps paid_simulated to paid for owner (D12)", async () => {
    const company = await makeCompany();
    await makeTransaction(company._id as Types.ObjectId, { status: "paid_simulated" });

    const result = await getOwnerTransactions(String(company._id));
    expect(result).toHaveLength(1);
    expect(result[0]!.status).toBe("paid");
  });

  it("excludes deleted transactions", async () => {
    const company = await makeCompany();
    await makeTransaction(company._id as Types.ObjectId);
    await makeTransaction(company._id as Types.ObjectId, { deletedAt: new Date() });

    const result = await getOwnerTransactions(String(company._id));
    expect(result).toHaveLength(1);
  });

  it("cross-tenant: company A does not see company B transactions", async () => {
    const companyA = await makeCompany();
    const companyB = await makeCompany();
    await makeTransaction(companyA._id as Types.ObjectId);
    await makeTransaction(companyB._id as Types.ObjectId, { invoiceNumber: "2026-00002" });

    const resultA = await getOwnerTransactions(String(companyA._id));
    const resultB = await getOwnerTransactions(String(companyB._id));
    expect(resultA).toHaveLength(1);
    expect(resultB).toHaveLength(1);
    expect(resultA[0]!.id).not.toBe(resultB[0]!.id);
  });
});

// ---------------------------------------------------------------------------
// getAdminTransactions
// ---------------------------------------------------------------------------

describe("getAdminTransactions", () => {
  it("returns all transactions with company displayName", async () => {
    const company = await makeCompany();
    await makeTransaction(company._id as Types.ObjectId);

    const result = await getAdminTransactions();
    expect(result).toHaveLength(1);
    expect(result[0]!.companyDisplayName).toBe("TestCo");
  });

  it("preserves paid_simulated in admin DTO (D12)", async () => {
    const company = await makeCompany();
    await makeTransaction(company._id as Types.ObjectId, { status: "paid_simulated" });

    const result = await getAdminTransactions();
    expect(result[0]!.status).toBe("paid_simulated");
  });

  it("filters by status", async () => {
    const company = await makeCompany();
    await makeTransaction(company._id as Types.ObjectId, { status: "paid" });
    await makeTransaction(company._id as Types.ObjectId, { status: "refunded", invoiceNumber: "2026-00002" });

    const paid = await getAdminTransactions({ status: "paid" });
    expect(paid).toHaveLength(1);
    expect(paid[0]!.status).toBe("paid");

    const refunded = await getAdminTransactions({ status: "refunded" });
    expect(refunded).toHaveLength(1);
    expect(refunded[0]!.status).toBe("refunded");
  });

  it("filters by type", async () => {
    const company = await makeCompany();
    await makeTransaction(company._id as Types.ObjectId, { type: "boost" });
    await makeTransaction(company._id as Types.ObjectId, { type: "sponsoring", invoiceNumber: "2026-00002" });

    const boosts = await getAdminTransactions({ type: "boost" });
    expect(boosts).toHaveLength(1);
    expect(boosts[0]!.type).toBe("boost");
  });
});

// ---------------------------------------------------------------------------
// generateInvoiceNumber
// ---------------------------------------------------------------------------

describe("generateInvoiceNumber", () => {
  it("generates sequential numbers in YYYY-NNNNN format", async () => {
    const n1 = await generateInvoiceNumber(new Date("2026-01-15"));
    const n2 = await generateInvoiceNumber(new Date("2026-06-20"));
    const n3 = await generateInvoiceNumber(new Date("2026-12-31"));

    expect(n1).toBe("2026-00001");
    expect(n2).toBe("2026-00002");
    expect(n3).toBe("2026-00003");
  });

  it("resets sequence per year", async () => {
    await generateInvoiceNumber(new Date("2026-03-01"));
    await generateInvoiceNumber(new Date("2026-06-01"));
    const n2027 = await generateInvoiceNumber(new Date("2027-01-01"));

    expect(n2027).toBe("2027-00001");
  });

  it("concurrent calls produce distinct numbers", async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, () => generateInvoiceNumber(new Date("2028-01-01"))),
    );

    const unique = new Set(results);
    expect(unique.size).toBe(5);

    // All should be 2028-0000X
    for (const r of results) {
      expect(r).toMatch(/^2028-\d{5}$/);
    }
  });

  it("continues from existing counter value", async () => {
    // Simulate seed counter at 46
    await Counter.create({ _id: "invoice-2026", seq: 46 });
    const next = await generateInvoiceNumber(new Date("2026-07-01"));
    expect(next).toBe("2026-00047");
  });
});
