// Node adapter for the qjs OPFS bridge.
//
// OPFS in browsers is a synchronous `FileSystemSyncAccessHandle`. Node has
// no such handle, so this adapter exposes the same file operations as plain
// async `node:fs/promises` calls. The wasm guest consumes them through JSPI
// (`WebAssembly.Suspending`), which makes the async calls look synchronous
// to SQLite.
//
// There is deliberately no `createSyncAccessHandle` shim here.

import { mkdir, open, rm, stat, unlink } from "node:fs/promises";
import path from "node:path";

const ERROR_NOT_FOUND = "NotFoundError";

function toPosixPath(name) {
  return String(name)
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

function resolveInside(root, name) {
  const relative = toPosixPath(name);
  if (relative.length === 0) throw new Error("empty OPFS path");
  const full = path.resolve(root, relative);
  const normalizedRoot = path.resolve(root);
  if (full !== normalizedRoot && !full.startsWith(normalizedRoot + path.sep)) {
    throw new Error(`OPFS path escapes the root: ${name}`);
  }
  return full;
}

/// A random-access OPFS-like file over `node:fs/promises`.
export class NodeOPFSFile {
  #handle;

  constructor(handle) {
    this.#handle = handle;
  }

  async read(buffer, offset) {
    // JSPI passes wasm i64 offsets as BigInts, which Node's FileHandle
    // read/write silently ignore (falling back to the current position).
    const { bytesRead } = await this.#handle.read(
      buffer,
      0,
      buffer.byteLength,
      Number(offset),
    );
    return bytesRead;
  }

  async write(bytes, offset) {
    const { bytesWritten } = await this.#handle.write(
      bytes,
      0,
      bytes.byteLength,
      Number(offset),
    );
    return bytesWritten;
  }

  async truncate(size) {
    await this.#handle.truncate(Number(size));
  }

  async size() {
    const info = await this.#handle.stat();
    return info.size;
  }

  async sync() {
    await this.#handle.sync();
  }

  async close() {
    await this.#handle.close();
  }
}

export async function openFileHandle(root, name, options = {}) {
  const full = resolveInside(root, name);
  const wantsWrite = Boolean(options.wantsWrite);
  const create = Boolean(options.create);

  if (create) {
    await mkdir(path.dirname(full), { recursive: true });
  }

  let handle;
  if (wantsWrite) {
    try {
      handle = await open(full, "r+");
    } catch (error) {
      if (error.code !== "ENOENT" || !create) throw error;
      handle = await open(full, "w+");
    }
  } else {
    handle = await open(full, "r");
  }
  return new NodeOPFSFile(handle);
}

export async function deleteFile(root, name) {
  try {
    await unlink(resolveInside(root, name));
    return 0;
  } catch (error) {
    if (error.code === "ENOENT") return 0;
    return -1;
  }
}

export async function accessFile(root, name) {
  try {
    await stat(resolveInside(root, name));
    return 1;
  } catch {
    return 0;
  }
}

/// Full directory adapter for the shared OPFS layer, backed by Node.
export class NodeDirectoryAdapter {
  constructor(root) {
    this.root = root;
  }

  get name() {
    return "";
  }

  get kind() {
    return "directory";
  }

  async *entries() {
    throw new Error("NodeDirectoryAdapter.entries is not implemented");
  }

  async getDirectoryHandle(name) {
    throw new Error("NodeDirectoryAdapter.getDirectoryHandle is not implemented");
  }

  async getFileHandle(name, options = {}) {
    const handle = await openFileHandle(this.root, name, {
      wantsWrite: true,
      create: Boolean(options.create),
    });
    return {
      adapter: handle,
      kind: "file",
      name,
      getFile: async () => {
        throw new Error("NodeDirectoryAdapter.getFile is not implemented");
      },
    };
  }

  async removeEntry(name, options = {}) {
    const full = resolveInside(this.root, name);
    await rm(full, { recursive: Boolean(options.recursive), force: true });
  }

  async isSameEntry(other) {
    return other === this;
  }

  async remove() {
    return 0;
  }
}

void ERROR_NOT_FOUND;

export default (options = {}) =>
  new NodeDirectoryAdapter(options.root ?? process.cwd());
