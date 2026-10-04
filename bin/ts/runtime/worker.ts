// Browser worker host for bin/ts.wasm.
//
// Runs the QuickJS guest with:
//   - the vendored browser Node WASI implementation (vendor/node), backed by a
//     MemoryVolume,
//   - the `qjs_host` namespace (ttsc transpilation, JSPI timer waits, OPFS,
//     externref slots),
//   - an OffscreenCanvas handed over by the main thread, which every gpuix
//     run receives.
//
// Everything the guest prints is forwarded to the main thread through
// postMessage.

import { WASI, ExitStatus } from "../vendor/node/polyfills/wasi";
import { MemoryVolume } from "../vendor/node/memory-volume";
import { buildFileSystemBridge } from "../vendor/node/polyfills/fs";

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
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function post(message: unknown): void {
  self.postMessage(message);
}

post({ type: "loaded" });

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
// guest boot
// ---------------------------------------------------------------------------

async function boot(message: InitMessage): Promise<void> {
  if (message.canvas) {
    (globalThis as any).__tsCanvas = message.canvas;
  }

  post({ type: "progress", step: "boot" });
  if (message.ttsc) {
    await loadTtsc(message.ttsc);
    post({ type: "progress", step: "ttsc-loaded" });
  }

  const volume = new MemoryVolume();
  post({ type: "progress", step: "volume" });
  const fs = buildFileSystemBridge(volume, () => "/");
  post({ type: "progress", step: "fs-built" });
  for (const file of message.files ?? []) {
    const data = typeof file.data === "string"
      ? file.data
      : new Uint8Array(file.data);
    const slash = file.path.lastIndexOf("/");
    if (slash > 0) {
      try {
        fs.mkdirSync(file.path.slice(0, slash), { recursive: true });
      } catch {
        // already exists
      }
    }
    fs.writeFileSync(file.path, data);
  }

  post({
    type: "progress",
    step: "fs-ready",
    exists: fs.existsSync("/main.ts"),
    size: fs.existsSync("/main.ts") ? (fs.readFileSync("/main.ts") as Uint8Array).length : -1,
  });
  const traced = new Proxy(fs as any, {
    get(target, prop) {
      const value = target[prop];
      if (typeof value === "function") {
        return (...args: unknown[]) => {
          post({
            type: "fs",
            method: String(prop),
            args: args.slice(0, 2).map((a) => (typeof a === "string" ? a : typeof a)),
          });
          return value.apply(target, args);
        };
      }
      return value;
    },
  });
  const wasi = new WASI({
    version: "preview1",
    args: ["ts", ...message.args],
    env: message.env ?? {},
    preopens: { "/": "/" },
    returnOnExit: true,
    fs: traced as any,
  });

  let instance: WebAssembly.Instance | null = null;
  const exports = (): WebAssembly.Exports => instance!.exports;
  const memory = (): WebAssembly.Memory => exports().memory as WebAssembly.Memory;
  const bytes = (ptr: number, len: number): Uint8Array =>
    new Uint8Array(memory().buffer, ptr, len);
  const readText = (ptr: number, len: number): string =>
    decoder.decode(bytes(ptr, len));

  // OPFS handles are plain JS objects; they cross the boundary as externrefs
  // so the module needs no table instructions and stays wizer-friendly.
  const opfsHandles = new Set<any>();
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
    opfs_open: (
      pathPtr: number,
      pathLen: number,
      wantsWrite: number,
      create: number,
      statusPtr: number,
    ): unknown => {
      const path = readText(pathPtr, pathLen);
      const status = new Int32Array(memory().buffer, statusPtr, 1);
      try {
        if (create !== 0 && !fs.existsSync(path)) fs.writeFileSync(path, "");
        const handle = { path, read: 0, write: wantsWrite !== 0 };
        opfsHandles.add(handle);
        status[0] = 0;
        return handle;
      } catch {
        status[0] = 1;
        return null;
      }
    },
    opfs_close: (handle: any): void => {
      opfsHandles.delete(handle);
    },
    opfs_read: (handle: any, ptr: number, amount: bigint, offset: bigint): number => {
      try {
        const data = fs.readFileSync(handle.path) as Uint8Array;
        const start = Number(offset);
        const slice = data.subarray(start, start + Number(amount));
        bytes(ptr, slice.length).set(slice);
        return slice.length;
      } catch {
        return -1;
      }
    },
    opfs_write: (handle: any, ptr: number, amount: bigint, offset: bigint): number => {
      try {
        const data = new Uint8Array(
          fs.existsSync(handle.path) ? (fs.readFileSync(handle.path) as Uint8Array) : [],
        );
        const start = Number(offset);
        const chunk = bytes(ptr, Number(amount));
        const end = start + chunk.length;
        if (end > data.length) {
          const grown = new Uint8Array(end);
          grown.set(data);
          grown.set(chunk, start);
          fs.writeFileSync(handle.path, grown);
        } else {
          data.set(chunk, start);
          fs.writeFileSync(handle.path, data);
        }
        return chunk.length;
      } catch {
        return -1;
      }
    },
    opfs_truncate: (handle: any, size: bigint): number => {
      try {
        const data = new Uint8Array(
          fs.existsSync(handle.path) ? (fs.readFileSync(handle.path) as Uint8Array) : [],
        );
        const next = new Uint8Array(Number(size));
        next.set(data.subarray(0, next.length));
        fs.writeFileSync(handle.path, next);
        return 0;
      } catch {
        return -1;
      }
    },
    opfs_size: (handle: any): bigint => {
      try {
        return BigInt((fs.readFileSync(handle.path) as Uint8Array).length);
      } catch {
        return -1n;
      }
    },
    opfs_sync: (): number => 0,
    opfs_delete: (pathPtr: number, pathLen: number): number => {
      try {
        fs.unlinkSync(readText(pathPtr, pathLen));
        return 0;
      } catch {
        return -1;
      }
    },
    opfs_access: (pathPtr: number, pathLen: number): number => {
      try {
        fs.accessSync(readText(pathPtr, pathLen));
        return 0;
      } catch {
        return -1;
      }
    },
  };

  if (typeof WebAssembly.Suspending === "function") {
    host.timer_wait = new WebAssembly.Suspending(host.timer_wait as any);
  }

  const imports: WebAssembly.Imports = {
    wasi_snapshot_preview1: wasi.wasiImport,
    qjs_host: host,
  };

  post({ type: "progress", step: "instantiate" });
  const wasmInstance = await WebAssembly.instantiate(message.wasm, imports);
  instance = wasmInstance.instance;
  post({ type: "progress", step: "instantiated" });
  wasi.finalizeBindings(instance as any);

  // Forward guest output to the main thread instead of the worker console.
  const forward = (kind: "stdout" | "stderr") =>
    (...args: unknown[]) =>
      post({ type: kind, text: args.map(String).join(" ") + "\n" });
  const realConsole = globalThis.console;
  (globalThis as any).console = {
    log: forward("stdout"),
    info: forward("stdout"),
    debug: forward("stdout"),
    error: forward("stderr"),
    warn: forward("stderr"),
    trace: forward("stderr"),
  };
  void realConsole;

  post({ type: "progress", step: "starting" });
  try {
    let start = instance.exports._start as () => unknown;
    if (typeof WebAssembly.promising === "function") {
      start = WebAssembly.promising(start as () => number);
    }
    const code = await start();
    post({ type: "exit", code: typeof code === "number" ? code : 0 });
  } catch (error) {
    if (error instanceof ExitStatus) {
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
