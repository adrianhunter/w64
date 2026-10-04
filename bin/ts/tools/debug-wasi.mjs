#!/usr/bin/env node
// Debug helper: runs ts.wasm under the vendored browser WASI + MemoryVolume in
// Node so path errors surface with real stack traces.
//
// usage: node tools/debug-wasi.mjs /main.ts "console.log('hi')"

import { build } from "esbuild";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const entryPath = process.argv[2] ?? "/main.ts";
const source = process.argv[3] ?? 'import { Buffer } from "buffer"; console.log("hi", Buffer.from("x").toString("hex"));';

const bundlePath = path.join(root, ".qjs-build", "wasi-debug.mjs");
const entry = `
import { WASI } from "../vendor/node/polyfills/wasi";
import { MemoryVolume } from "../vendor/node/memory-volume";
import { buildFileSystemBridge } from "../vendor/node/polyfills/fs";
import { readFileSync } from "node:fs";

const volume = new MemoryVolume();
const fs = buildFileSystemBridge(volume, () => "/");
const slash = ${JSON.stringify(entryPath)}.lastIndexOf("/");
if (slash > 0) fs.mkdirSync(${JSON.stringify(entryPath)}.slice(0, slash), { recursive: true });
fs.writeFileSync(${JSON.stringify(entryPath)}, ${JSON.stringify(source)});
const wasi = new WASI({
  version: "preview1",
  args: ["ts", ${JSON.stringify(entryPath)}],
  env: {},
  preopens: { "/": "/" },
  returnOnExit: true,
  fs,
});
const noop = () => 0;
const qjsHost = {
  spawn: () => 1,
  log: (ptr, len) => {},
  transpile: () => -1,
  timer_wait: () => {},
  externref_set() {}, externref_get: () => null, externref_clear() {},
  opfs_open: () => null, opfs_close() {}, opfs_read: () => -1, opfs_write: () => -1,
  opfs_truncate: () => -1, opfs_size: () => -1n, opfs_sync: () => -1,
  opfs_delete: () => -1, opfs_access: () => -1,
};
const bytes = readFileSync(${JSON.stringify(process.env.QJS_WASM ?? path.resolve(root, "..", "ts.wasm"))});
console.error("[debug] instantiating", bytes.length);
for (const name of Object.keys(wasi.wasiImport)) {
  const original = wasi.wasiImport[name];
  if (typeof original !== "function") continue;
  wasi.wasiImport[name] = (...args) => {
    let result;
    try {
      result = original(...args);
    } catch (error) {
      console.error("[wasi]", name, "THREW", error && error.message);
      throw error;
    }
    if (name.startsWith("path_") || name === "fd_read" || name === "fd_seek" || name === "fd_close" || name === "fd_fdstat_get" || name === "fd_filestat_get") {
      console.error("[wasi]", name, JSON.stringify(args.map((a) => (typeof a === "bigint" ? String(a) : a))), "->", result);
    }
    return result;
  };
}
try {
  const { instance } = await WebAssembly.instantiate(bytes, {
    wasi_snapshot_preview1: wasi.wasiImport,
    qjs_host: qjsHost,
  });
  console.error("[debug] instantiated; starting");
  const code = wasi.start(instance);
  console.log("exit", code);
} catch (error) {
  console.error("FAILED", error && error.stack ? error.stack : error);
  process.exit(1);
}
`;

const stubs = new Map([
  [
    "../helpers/wasm-cache",
    `export function registerCompiledModule() {}
     export function precompileWasm() {}
     export function getCachedModule() { return null; }
     export function compileWasmInWorker() { return Promise.resolve(null); }
     export function needsAsyncCompile() { return false; }
     export function wasmCacheStats() { return { entries: 0, pending: 0 }; }
     export function reclaimWasmCache() {}
     export function cloneCachedModule() { return null; }
     export function disposeWasmCache() {}
     export const PRECOMPILE_THRESHOLD = 0;`,
  ],
  [
    "../helpers/wasm-cdn",
    `export function resolveWasmAssetPath(_volume, vfsPath) { return vfsPath; }
     export function buildCdnWasmUrl() { return null; }
     export function isRecoverableWasmPath() { return false; }
     export function isWasmResolverProbe() { return false; }
     export function resetCdnRefusals() {}
     export async function prefetchWasmFromCdn() { return false; }`,
  ],
]);

writeFileSync(path.join(root, ".qjs-build", "wasi-debug-entry.ts"), entry);
await build({
  entryPoints: [path.join(root, ".qjs-build", "wasi-debug-entry.ts")],
  bundle: true,
  format: "esm",
  platform: "node",
  target: ["es2022"],
  outfile: bundlePath,
  logLevel: "warning",
  absWorkingDir: root,
  plugins: [
    {
      name: "stubs",
      setup(pluginBuild) {
        pluginBuild.onResolve({ filter: /.*/ }, (args) =>
          stubs.has(args.path)
            ? { path: args.path, namespace: "stub" }
            : undefined);
        pluginBuild.onLoad({ filter: /.*/, namespace: "stub" }, (args) => ({
          contents: stubs.get(args.path),
          loader: "js",
        }));
      },
    },
  ],
});

await import(bundlePath);
