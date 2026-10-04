#!/usr/bin/env node
// Minimal WASI host for qjs.wasm.
//
// Besides the standard WASI imports it provides the `qjs_host` namespace that
// the `qjs build` subcommand uses to invoke host tools (esbuild, wizer, ...).
//
// usage: node tools/run-qjs.mjs <qjs.wasm> [qjs arguments...]

import { WASI } from "node:wasi";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { Worker } from "node:worker_threads";
import path from "node:path";
import process from "node:process";
import {
  accessFile,
  deleteFile,
  openFileHandle,
} from "../src/opfs/adapters/node.mjs";

const wasmArg = process.argv[2];
if (!wasmArg) {
  console.error("usage: node tools/run-qjs.mjs <qjs.wasm> [args...]");
  process.exit(2);
}

const wasmPath = path.resolve(wasmArg);
const wasmArgs = process.argv.slice(3);

let instance = null;

function decode(ptr, len) {
  return new TextDecoder().decode(
    new Uint8Array(instance.exports.memory.buffer, ptr, len),
  );
}

// ---------------------------------------------------------------------------
// Yuku transpiler worker
//
// `qjs_host.transpile` is synchronous from the guest's point of view. The
// actual transpilation runs on a worker_threads thread; the guest blocks on
// an Atomics.wait until the worker posts the result back through a
// SharedArrayBuffer.
// ---------------------------------------------------------------------------

const YUKU_MAILBOX_BYTES = 32 * 1024 * 1024 + 8;
let yukuWorker = null;
let yukuState = null;
let yukuData = null;

function getYukuWorker() {
  if (yukuWorker) return;
  const sab = new SharedArrayBuffer(YUKU_MAILBOX_BYTES);
  yukuState = new Int32Array(sab, 0, 2);
  yukuData = new Uint8Array(sab, 8);
  yukuWorker = new Worker(new URL("./yuku-worker.mjs", import.meta.url));
  yukuWorker.unref();
  yukuWorker.postMessage({ type: "init", sab });
}

function transpileWithYuku(
  srcPtr,
  srcLen,
  langPtr,
  langLen,
  modePtr,
  modeLen,
  outPtr,
  outCap,
) {
  getYukuWorker();
  const memory = new Uint8Array(instance.exports.memory.buffer);
  const source = memory.subarray(srcPtr, srcPtr + srcLen);
  const lang = decode(langPtr, langLen);
  const mode = modeLen > 0 ? decode(modePtr, modeLen) : "strip";
  const header = Buffer.from(`${mode}\0${lang}\0`, "utf8");
  const total = header.length + source.length;
  if (total > yukuData.length) return -2;

  yukuData.set(header, 0);
  yukuData.set(source, header.length);
  Atomics.store(yukuState, 0, total);
  Atomics.store(yukuState, 1, 0);
  yukuWorker.postMessage({ type: "transpile" });
  Atomics.wait(yukuState, 0, total);

  const failed = Atomics.load(yukuState, 0) < 0;
  const resultLen = Atomics.load(yukuState, 1);
  if (resultLen > outCap) return -2;
  memory.set(yukuData.subarray(0, resultLen), outPtr);
  return failed ? -1 : resultLen;
}

// ---------------------------------------------------------------------------
// OPFS bridge
//
// Handles go to the guest as externrefs. Node has no synchronous OPFS
// access handle, so the adapter is async and the wasm stack suspends on
// each operation through JSPI (`WebAssembly.Suspending`).
// ---------------------------------------------------------------------------

const opfsRoot =
  process.env.QJS_OPFS_DIR ?? path.join(process.cwd(), ".qjs-cache", "opfs");
const textDecoder = new TextDecoder();
const textEncoder = new TextEncoder();

function memoryView(ptr, len) {
  return new Uint8Array(instance.exports.memory.buffer, ptr, len);
}

function setStatus(statusPtr, value) {
  new Int32Array(instance.exports.memory.buffer, statusPtr, 1)[0] = value;
}

const opfsHost = {
  open: async (pathPtr, pathLen, wantsWrite, create, statusPtr) => {
    const name = textDecoder.decode(memoryView(pathPtr, pathLen));
    try {
      const handle = await openFileHandle(opfsRoot, name, {
        wantsWrite: wantsWrite !== 0,
        create: create !== 0,
      });
      setStatus(statusPtr, 0);
      return handle;
    } catch (error) {
      console.error(`qjs OPFS open failed for ${name}: ${error?.message ?? error}`);
      setStatus(statusPtr, 1);
      return undefined;
    }
  },
  close: async (handle) => {
    try {
      await handle.close();
    } catch {
      /* already closed */
    }
  },
  read: async (handle, ptr, amount, offset) => {
    try {
      return await handle.read(memoryView(ptr, amount), offset);
    } catch {
      return -1;
    }
  },
  write: async (handle, ptr, amount, offset) => {
    try {
      const bytes = Buffer.from(memoryView(ptr, amount));
      return await handle.write(bytes, offset);
    } catch {
      return -1;
    }
  },
  truncate: async (handle, size) => {
    try {
      await handle.truncate(Number(size));
      return 0;
    } catch {
      return -1;
    }
  },
  size: async (handle) => {
    try {
      // wasm i64 results must be BigInts for JSPI.
      return BigInt(Math.trunc(await handle.size()));
    } catch {
      return -1n;
    }
  },
  sync: async (handle) => {
    try {
      await handle.sync();
      return 0;
    } catch {
      return -1;
    }
  },
  delete: async (pathPtr, pathLen) => {
    const name = textDecoder.decode(memoryView(pathPtr, pathLen));
    return await deleteFile(opfsRoot, name);
  },
  access: async (pathPtr, pathLen) => {
    const name = textDecoder.decode(memoryView(pathPtr, pathLen));
    return await accessFile(opfsRoot, name);
  },
};

function wrapHostFunction(fn) {
  if (typeof WebAssembly.Suspending !== "function") {
    throw new Error(
      "This Node build lacks JSPI (WebAssembly.Suspending); qjs needs it for OPFS",
    );
  }
  return new WebAssembly.Suspending(fn);
}

const externrefSlots = [];

const qjsHost = {
  // Spawn a host process. `argv` is a NUL-separated, not NUL-terminated list
  // of arguments passed in the guest's linear memory.
  spawn(ptr, len) {
    const argv = decode(ptr, len).split("\0").filter((s) => s.length > 0);
    if (argv.length === 0) return 1;
    const env = { ...process.env };
    // NODE_PATH can shadow the project's node_modules; drop it so that
    // esbuild resolves packages relative to the bundle entry.
    delete env.NODE_PATH;
    const result = spawnSync(argv[0], argv.slice(1), {
      stdio: "inherit",
      cwd: process.cwd(),
      env,
    });
    if (result.error) {
      console.error(`qjs_host.spawn: ${result.error.message}`);
      return 127;
    }
    return result.status ?? 1;
  },
  log(ptr, len) {
    process.stderr.write(decode(ptr, len));
  },
  transpile: transpileWithYuku,
  // Idle until the guest's next timer. The import is wrapped with
  // WebAssembly.Suspending below, so this just waits on the host.
  timer_wait: (ms) => new Promise((resolve) => setTimeout(resolve, Number(ms))),
  externref_set: (index, ref) => {
    externrefSlots[index] = ref;
  },
  externref_get: (index) => externrefSlots[index],
  externref_clear: (index) => {
    externrefSlots[index] = undefined;
  },
};

const wasi = new WASI({
  version: "preview1",
  args: ["qjs", ...wasmArgs],
  env: { ...process.env, QJS_SELF: wasmPath },
  preopens: { "/": process.cwd() },
  returnOnExit: true,
});

try {
  const wasm = await WebAssembly.instantiate(readFileSync(wasmPath), {
    wasi_snapshot_preview1: wasi.wasiImport,
    qjs_host: {
      ...qjsHost,
      timer_wait: wrapHostFunction(qjsHost.timer_wait),
      opfs_open: wrapHostFunction(opfsHost.open),
      opfs_close: wrapHostFunction(opfsHost.close),
      opfs_read: wrapHostFunction(opfsHost.read),
      opfs_write: wrapHostFunction(opfsHost.write),
      opfs_truncate: wrapHostFunction(opfsHost.truncate),
      opfs_size: wrapHostFunction(opfsHost.size),
      opfs_sync: wrapHostFunction(opfsHost.sync),
      opfs_delete: wrapHostFunction(opfsHost.delete),
      opfs_access: wrapHostFunction(opfsHost.access),
    },
  });
  instance = wasm.instance;
  // JSPI: bind WASI without starting, then run the entry point as a
  // promising export so suspending imports can pause the wasm stack.
  wasi.finalizeBindings(instance);
  const start = WebAssembly.promising(instance.exports._start);
  const code = await start();
  process.exit(code ?? 0);
} catch (err) {
  if (err && typeof err === "object") {
    // WASI proc_exit surfaces as an error carrying the exit status, either
    // as a `code` property or under a symbol (Node's WASIExitError).
    if ("code" in err) process.exit(err.code ?? 1);
    const exitSymbol = Object.getOwnPropertySymbols(err).find((symbol) =>
      String(symbol).includes("ExitCode"),
    );
    if (exitSymbol) process.exit(Number(err[exitSymbol]) || 0);
  }
  if (typeof err === "symbol" && String(err).includes("ExitCode")) {
    // Node's WASI (with finalizeBindings) throws the kExitCode symbol and
    // records the numeric status on the WASI object.
    const symbol = Object.getOwnPropertySymbols(wasi).find((candidate) =>
      String(candidate).includes("ExitCode"),
    );
    if (symbol) process.exit(Number(wasi[symbol]) || 0);
  }
  console.error(err);
  process.exit(1);
}
