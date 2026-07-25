import mongoose from "mongoose";
import { env } from "./env";

declare global {
  // eslint-disable-next-line no-var
  var _mongoosePromise: Promise<typeof mongoose> | undefined;
}

export async function connectDb(): Promise<typeof mongoose> {
  if (!global._mongoosePromise) {
    global._mongoosePromise = mongoose.connect(env.MONGODB_URI, {
      family: 4, // force IPv4 — élimine les tentatives IPv6/NAT64 cassées en dev local
      serverSelectionTimeoutMS: 15_000, // laisse le temps de retrouver un primary sur liaison lente
      maxIdleTimeMS: 60_000, // libère les connexions idle après 60s
    });
  }
  return global._mongoosePromise;
}
