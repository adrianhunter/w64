#!/usr/bin/env node
// Runs ts.wasm under the w64 WASI port (../../../wasi.ts) with a seeded
// in-memory tree, in Node, for fast debugging.
import { build } from "esbuild";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const wasmPath = process.env.QJS_WASM ?? path.resolve(root, "..", "ts.wasm");
const source = process.argv[2] ?? 'import { Buffer } from "buffer"; console.log("hi", Buffer.from("x").toString("hex"));';

const entry = `
import { WASI, WASIProcExit, File, Directory, OpenFile, ConsoleStdout, PreopenDirectory } from "../../../wasi.ts";
import { readFileSync } from "node:fs";

const tree = new Map([["main.ts", new File(new TextEncoder().encode(${JSON.stringify(source)}))]]);
const wasi = new WASI(["ts", "/bundle/main.ts"], [], [
  new OpenFile(new File([])),
  ConsoleStdout.lineBuffered((line) => console.log("[out]", line)),
  ConsoleStdout.lineBuffered((line) => console.error("[err]", line)),
  new PreopenDirectory("/bundle", tree),
]);
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
for (const name of Object.keys(wasi.wasiImport)) {
  const original = wasi.wasiImport[name];
  if (typeof original !== "function") continue;
  wasi.wasiImport[name] = (...args) => {
    const result = original(...args);
    if (name.startsWith("path_") || name === "fd_read" || name === "fd_prestat_get" || name === "fd_prestat_dir_name" || name === "fd_fdstat_get") {
      console.error("[wasi]", name, JSON.stringify(args.map((a) => (typeof a === "bigint" ? String(a) : a))), "->", result);
    }
    return result;
  };
}
const bytes = readFileSync(${JSON.stringify(wasmPath)});
const { instance } = await WebAssembly.instantiate(bytes, {
  wasi_snapshot_preview1: wasi.wasiImport,
  qjs_host: qjsHost,
});
wasi.initialize(instance);
try {
  const code = instance.exports._start();
  console.log("exit", code);
} catch (error) {
  if (error instanceof WASIProcExit) { console.log("exit", error.code); process.exit(error.code); }
  throw error;
}
`;

writeFileSync(path.join(root, ".qjs-build", "wasi-debug2-entry.ts"), entry);
await build({
  entryPoints: [path.join(root, ".qjs-build", "wasi-debug2-entry.ts")],
  bundle: true, format: "esm", platform: "node", target: ["es2022"],
  outfile: path.join(root, ".qjs-build", "wasi-debug2.mjs"),
  logLevel: "warning", absWorkingDir: root,
});
await import(path.join(root, ".qjs-build", "wasi-debug2.mjs"));
