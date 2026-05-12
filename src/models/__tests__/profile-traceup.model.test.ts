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
        channelName: { fr: "Test Channel", ar: "", en: "" },
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
        channelName: { fr: "Test Channel", ar: "", en: "" },
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

  it("pendingData is only for channelName/channelDescription, not videos", async () => {
    const doc = await TraceUp.create({
      companyId: new Types.ObjectId(),
      status: "active",
      data: {
        channelName: { fr: "Old Name", ar: "", en: "" },
        videos: [
          { id: "v-1", source: "youtube", videoId: "aaa", category: "actualite", title: { fr: "Video", ar: "", en: "" }, order: 1 },
        ],
      },
    });

    // Setting pendingData for channel metadata — valid usage
    doc.pendingData = {
      submittedAt: new Date(),
      fields: [
        { key: "channelName", label: "Nom de la chaîne", currentValue: "Old Name", newValue: "New Name" },
      ],
    };
    await doc.save();

    const reloaded = await TraceUp.findById(doc._id);
    expect(reloaded!.pendingData).not.toBeNull();
    expect(reloaded!.pendingData!.fields).toHaveLength(1);
    expect(reloaded!.pendingData!.fields[0]!.key).toBe("channelName");

    // Videos remain unchanged — they bypass pendingData entirely
    expect(reloaded!.data.videos).toHaveLength(1);
    expect(reloaded!.data.videos[0]!.videoId).toBe("aaa");
  });
});
