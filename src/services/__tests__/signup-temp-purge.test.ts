/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import { MongoClient } from "mongodb";
import { MongoMemoryReplSet } from "mongodb-memory-server";

// Mock cloudinary SDK
const mockResources = vi.fn();
const mockDestroy = vi.fn();
const mockConfig = vi.fn();
vi.mock("cloudinary", () => ({
  v2: {
    config: mockConfig,
    api: { resources: mockResources },
    uploader: { destroy: mockDestroy },
  },
}));

vi.mock("@/lib/db", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/storage", async () => {
  const helpers = await vi.importActual<typeof import("@/lib/storage/helpers")>("@/lib/storage/helpers");
  const mockStorage = { delete: vi.fn().mockResolvedValue(undefined), getSignedUrl: vi.fn().mockReturnValue("https://signed-url") };
  return {
    storage: mockStorage,
    safeDeleteByUrl: (storage: unknown, url: string | null | undefined) => helpers.safeDeleteByUrl(mockStorage, url),
    signIdentityDocUrl: (storage: unknown, url: string | null | undefined) => helpers.signIdentityDocUrl(mockStorage, url),
  };
});

let replSet: MongoMemoryReplSet;
let client: MongoClient;
let dbName: string;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = replSet.getUri();
  dbName = "purge_test_db";
  // Connect with explicit db name
  client = new MongoClient(uri);
  await client.connect();
  // Create the db so it exists
  await client.db(dbName).collection("companies").insertOne({ _id: "seed" } as any);
  await client.db(dbName).collection("companies").deleteOne({ _id: "seed" } as any);
}, 30_000);

beforeEach(() => {
  mockResources.mockReset();
  mockDestroy.mockReset();
  mockConfig.mockReset();
});

afterAll(async () => {
  await client?.close();
  await replSet?.stop();
});

// env mock must use the same dbName so extractMongoDbName returns it
vi.mock("@/lib/env", () => ({
  env: {
    MONGODB_URI: "mongodb://localhost:27017/purge_test_db",
    CLOUDINARY_CLOUD_NAME: "test-cloud",
    CLOUDINARY_API_KEY: "test-key",
    CLOUDINARY_API_SECRET: "test-secret",
    SIGNUP_TEMP_MAX_AGE_DAYS: 7,
  },
}));

describe("purgeSignupTempOrphans", () => {
  it("listing failure produces errors > 0 and warnings", async () => {
    mockResources.mockRejectedValue(new Error("Must supply cloud_name"));

    const { purgeSignupTempOrphans } = await import("@/services/backup.service");
    const result = await purgeSignupTempOrphans(client);

    // Both image and raw listings fail → 2 errors
    expect(result.errors).toBe(2);
    expect(result.warnings).toHaveLength(2);
    expect(result.warnings[0]).toContain("Failed to list image/private");
    expect(result.warnings[1]).toContain("Failed to list raw/private");
    expect(result.listed).toBe(0);
    expect(result.deleted).toBe(0);
  });

  it("successful listing with 0 resources produces errors=0 and no warnings", async () => {
    mockResources.mockResolvedValue({ resources: [] });

    const { purgeSignupTempOrphans } = await import("@/services/backup.service");
    const result = await purgeSignupTempOrphans(client);

    expect(result.errors).toBe(0);
    expect(result.warnings).toHaveLength(0);
    expect(result.listed).toBe(0);
  });

  it("configures cloudinary explicitly before listing", async () => {
    mockResources.mockResolvedValue({ resources: [] });

    const { purgeSignupTempOrphans } = await import("@/services/backup.service");
    await purgeSignupTempOrphans(client);

    expect(mockConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        cloud_name: "test-cloud",
        api_key: "test-key",
        api_secret: "test-secret",
      }),
    );
  });
});
