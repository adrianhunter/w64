// Browser worker host for bin/ts.wasm.
//
// Runs the QuickJS guest with:
//   - @bjorn3/browser_wasi_shim backed by an in-memory directory tree seeded
//     from the message's files,
//   - the `qjs_host` namespace (ttsc transpilation, JSPI timer waits, OPFS,
//     externref slots),
//   - an OffscreenCanvas handed over by the main thread, which every gpuix
//     run receives.
//
// Guest output is forwarded to the main thread through postMessage.

// The w64 WASI port adds SyncOPFSFile on top of browser_wasi_shim's API.
import {
  WASI,
  WASIProcExit,
  File,
  Directory,
  OpenFile,
  ConsoleStdout,
  PreopenDirectory,
} from "../../../wasi.ts";
import { OpfsStore, type OpfsHandle } from "./opfs.ts";

declare const self: DedicatedWorkerGlobalScope;

type InitMessage = {
  type: "init";
  wasm: ArrayBuffer;
  ttsc?: ArrayBuffer;
  entry: string;
  args: string[];
  env?: Record<string, string>;
  files?: { path: string; data: string | ArrayBuffer }[];
  canvas?: OffscreenCanvas;
  opfs?: { file: string };
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function post(message: unknown): void {
  self.postMessage(message);
}

// ---------------------------------------------------------------------------
// ttsc.wasm (bin/ttsc) used by qjs_host.transpile
// ---------------------------------------------------------------------------

let outCodes: number[] = [];

const ttscHost = {
  strLength: (s: string): number => s.length,
  charCodeAt: (s: string, i: number): number => s.charCodeAt(i),
  startOut: (): void => {
    outCodes = [];
  },
  pushCodeUnit: (code: number): void => {
    outCodes.push(code);
  },
  finishOut: (): string => {
    let result = "";
    for (let i = 0; i < outCodes.length; i += 4096) {
      result += String.fromCharCode.apply(null, outCodes.slice(i, i + 4096));
    }
    outCodes = [];
    return result;
  },
};

let ttsc: ((source: string, filename: string) => string) | null = null;

async function loadTtsc(bytes: ArrayBuffer): Promise<void> {
  const { instance } = await WebAssembly.instantiate(bytes, {
    "./ttsc-host.js": ttscHost,
  });
  ttsc = instance.exports.default as typeof ttsc;
}

// ---------------------------------------------------------------------------
// in-memory directory tree for WASI
// ---------------------------------------------------------------------------

type Contents = Map<string, File | Directory>;

function seedFiles(files: InitMessage["files"]): Contents {
  const root: Contents = new Map();
  for (const file of files ?? []) {
    const data = typeof file.data === "string"
      ? encoder.encode(file.data)
      : new Uint8Array(file.data);
    const parts = file.path.split("/").filter(Boolean);
    let dir = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const name = parts[i];
      const existing = dir.get(name);
      if (existing instanceof Directory) {
        dir = existing.contents as Contents;
      } else {
        const next: Contents = new Map();
        dir.set(name, new Directory(next));
        dir = next;
      }
    }
    if (parts.length > 0) {
      dir.set(parts[parts.length - 1], new File(data));
    }
  }
  return root;
}

// ---------------------------------------------------------------------------
// guest boot
// ---------------------------------------------------------------------------

async function boot(message: InitMessage): Promise<void> {
  if (message.canvas) {
    (globalThis as any).__tsCanvas = message.canvas;
    post({ type: "canvas", width: message.canvas.width, height: message.canvas.height });
  }

  // A single OPFS file backs the guest's SQLite virtual filesystem.
  let opfs: OpfsStore | null = null;
  let singleHandle: OpfsHandle | null = null;
  if (message.opfs) {
    try {
      opfs = await OpfsStore.open(message.opfs.file);
      singleHandle = await opfs.get(opfs.fileName);
      post({
        type: "vfs",
        backend: "opfs-sync-access-handle",
        file: message.opfs.file,
        size: singleHandle?.getSize() ?? 0,
      });
    } catch (error) {
      post({
        type: "vfs",
        backend: "memory",
        file: message.opfs.file,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (message.ttsc) {
    await loadTtsc(message.ttsc);
  }

  const stdout = ConsoleStdout.lineBuffered((line) =>
    post({ type: "stdout", text: line + "\n" })
  );
  const stderr = ConsoleStdout.lineBuffered((line) =>
    post({ type: "stderr", text: line + "\n" })
  );

  // wizer pre-initialization leaves /bundle as the runtime's only preopen,
  // so every user file is mounted under it.
  const bundle = (path: string): string =>
    path.startsWith("/bundle/") || path === "/bundle"
      ? path
      : "/bundle/" + path.replace(/^\/+/, "");
  const files = (message.files ?? []).map((file) => ({
    path: bundle(file.path),
    data: file.data,
  }));

  const wasi = new WASI(
    ["ts", ...message.args.map(bundle)],
    Object.entries(message.env ?? {}).map(([key, value]) => `${key}=${value}`),
    [
      new OpenFile(new File([])),
      stdout,
      stderr,
      new PreopenDirectory(
        "/bundle",
        seedFiles(
          files.map((file) => ({
            ...file,
            path: file.path.replace(/^\/bundle\//, ""),
          })),
        ),
      ),
    ],
  );

  let instance: WebAssembly.Instance | null = null;
  const exports = (): WebAssembly.Exports => instance!.exports;
  const memory = (): WebAssembly.Memory => exports().memory as WebAssembly.Memory;
  const bytes = (ptr: number, len: number): Uint8Array =>
    new Uint8Array(memory().buffer, ptr, len);
  const readText = (ptr: number, len: number): string =>
    decoder.decode(bytes(ptr, len));

  const opfsHandles = new Map<string, Uint8Array>();
  const externrefSlots: unknown[] = [];

  const host: Record<string, unknown> = {
    spawn: (): number => 1,
    log: (ptr: number, len: number): void => {
      post({ type: "stderr", text: readText(ptr, len) });
    },
    transpile: (
      srcPtr: number,
      srcLen: number,
      langPtr: number,
      langLen: number,
      _modePtr: number,
      _modeLen: number,
      outPtr: number,
      outCap: number,
    ): number => {
      if (!ttsc) return -2;
      const source = readText(srcPtr, srcLen);
      const lang = readText(langPtr, langLen);
      try {
        const encoded = encoder.encode(ttsc(source, `module.${lang}`));
        if (encoded.length > outCap) return -2;
        bytes(outPtr, encoded.length).set(encoded);
        return encoded.length;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const encoded = encoder.encode(message);
        if (encoded.length + 1 <= outCap) {
          bytes(outPtr, encoded.length).set(encoded);
          bytes(outPtr + encoded.length, 1)[0] = 0;
        }
        return -1;
      }
    },
    timer_wait: (ms: number): Promise<void> =>
      new Promise((resolve) => setTimeout(resolve, Number(ms))),
    externref_set: (index: number, ref: unknown): void => {
      externrefSlots[index] = ref;
    },
    externref_get: (index: number): unknown => externrefSlots[index],
    externref_clear: (index: number): void => {
      externrefSlots[index] = undefined;
    },
    // The guest sees a single database file. In OPFS mode every requested
    // path is the one SyncAccessHandle opened during boot; without OPFS the
    // calls fall back to an in-memory buffer.
    opfs_open: (
      pathPtr: number,
      pathLen: number,
      _wantsWrite: number,
      create: number,
      statusPtr: number,
    ): unknown => {
      const path = readText(pathPtr, pathLen);
      const status = new Int32Array(memory().buffer, statusPtr, 1);
      if (singleHandle) {
        status[0] = 0;
        return { path, handle: singleHandle };
      }
      if (!opfsHandles.has(path) && create !== 0) {
        opfsHandles.set(path, new Uint8Array(0));
      }
      if (!opfsHandles.has(path)) {
        status[0] = 1;
        return null;
      }
      status[0] = 0;
      return { path, memory: true };
    },
    opfs_close: (): void => {},
    opfs_read: (handle: any, ptr: number, amount: bigint, offset: bigint): number => {
      if (handle.handle) {
        return handle.handle.read(bytes(ptr, Number(amount)), Number(offset));
      }
      const data = opfsHandles.get(handle.path);
      if (!data) return -1;
      const slice = data.subarray(Number(offset), Number(offset) + Number(amount));
      bytes(ptr, slice.length).set(slice);
      return slice.length;
    },
    opfs_write: (handle: any, ptr: number, amount: bigint, offset: bigint): number => {
      if (handle.handle) {
        return handle.handle.write(bytes(ptr, Number(amount)), Number(offset));
      }
      const data = opfsHandles.get(handle.path) ?? new Uint8Array(0);
      const chunk = bytes(ptr, Number(amount));
      const end = Number(offset) + chunk.length;
      const next = new Uint8Array(Math.max(end, data.length));
      next.set(data);
      next.set(chunk, Number(offset));
      opfsHandles.set(handle.path, next);
      return chunk.length;
    },
    opfs_truncate: (handle: any, size: bigint): number => {
      if (handle.handle) {
        handle.handle.truncate(Number(size));
        return 0;
      }
      const data = opfsHandles.get(handle.path) ?? new Uint8Array(0);
      const next = new Uint8Array(Number(size));
      next.set(data.subarray(0, next.length));
      opfsHandles.set(handle.path, next);
      return 0;
    },
    opfs_size: (handle: any): bigint => {
      if (handle.handle) return BigInt(handle.handle.getSize());
      return BigInt((opfsHandles.get(handle.path) ?? new Uint8Array(0)).length);
    },
    opfs_sync: (handle: any): number => {
      if (handle?.handle) {
        handle.handle.flush();
        return 0;
      }
      return 0;
    },
    opfs_delete: (): number => 0,
    opfs_access: (pathPtr: number, pathLen: number): number => {
      if (singleHandle) return 0;
      return opfsHandles.has(readText(pathPtr, pathLen)) ? 0 : -1;
    },
  };

  if (typeof WebAssembly.Suspending === "function") {
    host.timer_wait = new WebAssembly.Suspending(host.timer_wait as any);
  }

  const wasmInstance = await WebAssembly.instantiate(message.wasm, {
    wasi_snapshot_preview1: wasi.wasiImport,
    qjs_host: host,
  });
  instance = wasmInstance.instance;
  wasi.initialize(instance as any);

  try {
    let start = instance.exports._start as () => unknown;
    if (typeof WebAssembly.promising === "function") {
      start = WebAssembly.promising(start as () => number);
    }
    const code = await start();
    post({ type: "exit", code: typeof code === "number" ? code : 0 });
  } catch (error) {
    if (error instanceof WASIProcExit) {
      post({ type: "exit", code: error.code });
      return;
    }
    post({
      type: "error",
      message: error instanceof Error ? error.stack ?? error.message : String(error),
    });
  }
}

self.onmessage = (event: MessageEvent) => {
  const message = event.data as InitMessage | { type: string };
  if (message.type === "init") {
    boot(message as InitMessage).catch((error) => {
      post({
        type: "error",
        message: error instanceof Error ? error.stack ?? error.message : String(error),
      });
    });
  }
};
