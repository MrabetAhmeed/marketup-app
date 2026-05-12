import mongoose from "mongoose";
import { env } from "./env";

declare global {
  // eslint-disable-next-line no-var
  var _mongoosePromise: Promise<typeof mongoose> | undefined;
}

export async function connectDb(): Promise<typeof mongoose> {
  if (!global._mongoosePromise) {
    global._mongoosePromise = mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10_000,
    });
  }
  return global._mongoosePromise;
}
