import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { Types } from "mongoose";
import { BrandUp, TraceUp, LinkUp } from "@/models";
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

const companyId = new Types.ObjectId();

describe("Profile model — discriminators", () => {
  it("creates a BrandUp profile via the discriminator", async () => {
    const doc = await BrandUp.create({
      companyId,
      data: {
        pitch: { fr: "Test pitch", ar: "", en: "" },
        color: "#0078D4",
      },
    });
    expect(doc.kind).toBe("brandup");
    expect(doc.status).toBe("incomplete");
    expect(doc.data.pitch.fr).toBe("Test pitch");
  });

  it("creates a TraceUp profile via the discriminator", async () => {
    const doc = await TraceUp.create({
      companyId,
      data: {
        videos: [],
      },
    });
    expect(doc.kind).toBe("traceup");
    expect(doc.data.videos).toHaveLength(0);
  });

  it("creates a LinkUp profile via the discriminator", async () => {
    const doc = await LinkUp.create({
      companyId,
      data: {
        socials: [],
      },
    });
    expect(doc.kind).toBe("linkup");
    expect(doc.data.contactCard).toBeUndefined();
  });

  it("the (companyId, kind) compound index is unique", async () => {
    await BrandUp.create({
      companyId,
      data: { pitch: { fr: "First", ar: "", en: "" }, color: "#000" },
    });

    await expect(
      BrandUp.create({
        companyId,
        data: { pitch: { fr: "Second", ar: "", en: "" }, color: "#FFF" },
      }),
    ).rejects.toThrow(/duplicate key|E11000/);
  });
});
