import { LocalStorageAdapter } from "./local-adapter";
import { R2StorageAdapter } from "./r2-adapter";
import type { StorageAdapter } from "./types";

function createAdapter(): StorageAdapter {
  const adapterName = process.env.STORAGE_ADAPTER || "local";

  switch (adapterName) {
    case "r2":
      console.log("[storage] Using R2 adapter");
      return new R2StorageAdapter();
    case "local":
    default:
      console.log("[storage] Using local filesystem adapter");
      return new LocalStorageAdapter();
  }
}

/** Singleton storage adapter instance */
export const storage: StorageAdapter = createAdapter();

export type { StorageAdapter, UploadOptions, UploadResult, UploadCategory } from "./types";
export { StorageError } from "./types";
