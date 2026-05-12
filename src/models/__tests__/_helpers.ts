import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongod: MongoMemoryServer | null = null;

export async function setupMongoMemory(): Promise<() => Promise<void>> {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
  // Ensure all indexes are created (required for unique compound index tests)
  await mongoose.connection.syncIndexes();

  return async () => {
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
  };
}

export async function clearCollections(): Promise<void> {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key]!.deleteMany({});
  }
}
