import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { Types } from "mongoose";
import { TraceUp } from "@/models";
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

describe("TraceUp — videos direct CRUD (no pendingData)", () => {
  it("videos can be added directly to the array", async () => {
    const doc = await TraceUp.create({
      companyId: new Types.ObjectId(),
      data: {
        videos: [],
      },
    });

    doc.data.videos.push({
      id: "v-test-1",
      source: "youtube",
      videoId: "abc123",
      category: "actualite",
      title: { fr: "Test video", ar: "", en: "" },
      order: 1,
    });
    await doc.save();

    const reloaded = await TraceUp.findById(doc._id);
    expect(reloaded!.data.videos).toHaveLength(1);
    expect(reloaded!.data.videos[0]!.videoId).toBe("abc123");
    // pendingData is NOT involved — still null
    expect(reloaded!.pendingData).toBeNull();
  });

  it("videos can be removed directly from the array", async () => {
    const doc = await TraceUp.create({
      companyId: new Types.ObjectId(),
      data: {
        videos: [
          { id: "v-1", source: "youtube", videoId: "aaa", category: "actualite", title: { fr: "A", ar: "", en: "" }, order: 1 },
          { id: "v-2", source: "vimeo", videoId: "bbb", category: "offres", title: { fr: "B", ar: "", en: "" }, order: 2 },
        ],
      },
    });

    doc.data.videos = doc.data.videos.filter((v: { id: string }) => v.id !== "v-1");
    await doc.save();

    const reloaded = await TraceUp.findById(doc._id);
    expect(reloaded!.data.videos).toHaveLength(1);
    expect(reloaded!.data.videos[0]!.id).toBe("v-2");
    expect(reloaded!.pendingData).toBeNull();
  });

  it("TraceUP has no channelName or channelDescription fields", async () => {
    const doc = await TraceUp.create({
      companyId: new Types.ObjectId(),
      data: { videos: [] },
    });

    const reloaded = await TraceUp.findById(doc._id).lean();
    expect(reloaded!.data.channelName).toBeUndefined();
    expect(reloaded!.data.channelDescription).toBeUndefined();
  });
});
