// Single-file OPFS store for the guest's SQLite VFS.
//
// The guest's node:sqlite talks to the host through `qjs_host.opfs_*`. In the
// browser worker those calls land here: every file the guest opens becomes a
// browser OPFS file accessed through a FileSystemSyncAccessHandle, and the
// runtime configuration selects the one database file that the virtual
// filesystem is based on. A later SQLite-backed WASI Directory can reuse the
// same handles.
//
// SyncAccessHandle only exists inside a worker, which is exactly where ts.wasm
// runs.

export interface OpfsHandle {
  read(buffer: Uint8Array, offset: number): number;
  write(buffer: Uint8Array, offset: number): number;
  truncate(size: number): void;
  getSize(): number;
  flush(): void;
  close(): void;
}

export class OpfsStore {
  readonly root: FileSystemDirectoryHandle;
  readonly fileName: string;
  private readonly handles = new Map<string, OpfsHandle>();

  private constructor(root: FileSystemDirectoryHandle, fileName: string) {
    this.root = root;
    this.fileName = fileName;
  }

  /** Opens (creating when needed) the single OPFS file the VFS is based on. */
  static async open(fileName: string): Promise<OpfsStore> {
    if (typeof navigator === "undefined" || !navigator.storage?.getDirectory) {
      throw new Error("OPFS is not available in this context");
    }
    const store = new OpfsStore(await navigator.storage.getDirectory(), fileName);
    await store.get(fileName);
    return store;
  }

  /** Returns a synchronous access handle for `path`, creating it on demand. */
  async get(path: string): Promise<OpfsHandle | null> {
    const existing = this.handles.get(path);
    if (existing) return existing;
    try {
      const name = path.replace(/^\/+/, "") || this.fileName;
      const fileHandle = await this.root.getFileHandle(name, { create: true });
      const handle = (await fileHandle.createSyncAccessHandle()) as OpfsHandle;
      this.handles.set(path, handle);
      return handle;
    } catch (error) {
      console.error("[ts] OPFS open failed", path, error);
      return null;
    }
  }

  size(path: string): number {
    return this.handles.get(path)?.getSize() ?? -1;
  }

  sync(path: string): number {
    const handle = this.handles.get(path);
    if (!handle) return -1;
    handle.flush();
    return 0;
  }

  close(): void {
    for (const handle of this.handles.values()) {
      try {
        handle.close();
      } catch {
        // already closed
      }
    }
    this.handles.clear();
  }
}
