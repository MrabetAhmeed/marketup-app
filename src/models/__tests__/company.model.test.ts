/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { Types } from "mongoose";
import { Company } from "@/models";
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

function makeCompany(overrides = {}) {
  return {
    slug: "test-company",
    type: "B2B",
    legalId: "T12345",
    accountEmail: "test@test.tn",
    country: "TN",
    data: {
      displayName: { fr: "Test Company", ar: "", en: "" },
    },
    liveData: {
      sectorId: "mecanique",
      gouvernorat: "sousse",
      ville: "Sousse",
      address: "Test address",
      languages: ["fr"],
    },
    ownerUserId: new Types.ObjectId(),
    ...overrides,
  };
}

describe("Company model", () => {
  it("creates a Company with the 3-tier structure", async () => {
    const doc = await Company.create(makeCompany());
    expect(doc.slug).toBe("test-company");
    expect(doc.type).toBe("B2B");
    expect(doc.data.displayName.fr).toBe("Test Company");
    expect(doc.liveData.sectorId).toBe("mecanique");
    expect(doc.status).toBe("pending");
    expect(doc.pendingUpdates).toBeNull();
    expect(doc.deletedAt).toBeNull();
  });

  it("locked fields cannot be modified after creation", async () => {
    const doc = await Company.create(makeCompany());

    // Mongoose immutable: true silently ignores set on save
    doc.legalId = "CHANGED";
    doc.type = "B2C";
    doc.accountEmail = "changed@test.tn";
    doc.country = "FR";
    await doc.save();

    const reloaded = await (Company as any).findById(doc._id);
    expect(reloaded!.legalId).toBe("T12345");
    expect(reloaded!.type).toBe("B2B");
    expect(reloaded!.accountEmail).toBe("test@test.tn");
    expect(reloaded!.country).toBe("TN");
  });

  it("soft delete: a deleted company is excluded from default find()", async () => {
    const doc = await Company.create(makeCompany());
    doc.deletedAt = new Date();
    await doc.save();

    const defaultFind = await (Company as any).find({});
    expect(defaultFind).toHaveLength(0);

    const withDeleted = await (Company as any).find({}, null, { withDeleted: true });
    expect(withDeleted).toHaveLength(1);
    expect(withDeleted[0]!._id.toString()).toBe(doc._id.toString());
  });
});
