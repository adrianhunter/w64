import type { MemoryVolume } from "../../memory-volume.ts";
import { WorkspacePersistence } from "./controller.ts";
import { acquireWorkspaceLock } from "./lock.ts";
import type { PersistenceOptions, WorkspaceStore } from "./types.ts";

export { WorkspacePersistence } from "./controller.ts";
export { createMemoryWorkspaceStore } from "./memory-store.ts";
export {
  createIndexedDBWorkspaceStore,
  listIndexedDBWorkspaces,
  deleteIndexedDBWorkspace,
} from "./idb-store.ts";
export type { IndexedDBWorkspaceStoreOptions, StoredWorkspaceInfo } from "./idb-store.ts";
export type * from "./types.ts";

/**
 * Boot-time setup: take the workspace lock, open the store, restore the
 * saved workspace into `volume` and start saving. Resolves null (with a
 * warning) when no store is available on this host.
 */
export async function openWorkspacePersistence(
  volume: MemoryVolume,
  opts: PersistenceOptions,
  openDefaultStore: ((id: string) => Promise<WorkspaceStore | null>) | undefined,
): Promise<{ persistence: WorkspacePersistence; restored: boolean } | null> {
  if (!opts.id) throw new Error("[Nodepod] persistence.id is required");
  const lock = await acquireWorkspaceLock(opts.id, opts.lock ?? "error");
  try {
    const store = opts.store ?? (await openDefaultStore?.(opts.id)) ?? null;
    if (!store) {
      console.warn(
        `[Nodepod] no workspace store available on this host; workspace "${opts.id}" will not be saved`,
      );
      lock.release();
      return null;
    }
    if (opts.requestPersistentStorage) {
      const storage = (globalThis as { navigator?: { storage?: { persist?: () => Promise<boolean> } } })
        .navigator?.storage;
      storage?.persist?.().catch(() => {});
    }
    const persistence = new WorkspacePersistence(
      opts.id,
      volume,
      store,
      { excludeDirNames: opts.excludeDirNames, exclude: opts.exclude, debounceMs: opts.debounceMs },
      lock,
    );
    let restored: boolean;
    try {
      restored = await persistence.load();
    } catch (err) {
      // a corrupt saved workspace, or a store the caller chose, is theirs to
      // handle; a default store the browser won't open (e.g. storage blocked
      // in a third-party iframe) just means this pod isn't saved
      if (opts.store || (err as { code?: string }).code === "EWORKSPACECORRUPT") throw err;
      console.warn(`[Nodepod] workspace "${opts.id}" can't be restored or saved here:`, err);
      store.close?.();
      lock.release();
      return null;
    }
    persistence.attach();
    return { persistence, restored };
  } catch (err) {
    lock.release();
    throw err;
  }
}
